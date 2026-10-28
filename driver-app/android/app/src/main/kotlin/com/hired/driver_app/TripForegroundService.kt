package com.hired.driver_app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.DisplayMetrics
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.GoogleMapOptions
import com.google.android.gms.maps.MapView
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions

class TripForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "trip_ongoing_service_channel"
        const val NOTIFICATION_ID = 9001

        const val ACTION_START = "ACTION_START"
        const val ACTION_UPDATE = "ACTION_UPDATE"
        const val ACTION_STOP = "ACTION_STOP"
        const val ACTION_SET_OVERLAY_VISIBLE = "ACTION_SET_OVERLAY_VISIBLE"

        const val EXTRA_TRIP_ID = "EXTRA_TRIP_ID"
        const val EXTRA_STATUS = "EXTRA_STATUS"
        const val EXTRA_PICKUP = "EXTRA_PICKUP"
        const val EXTRA_DROPOFF = "EXTRA_DROPOFF"
        const val EXTRA_ETA_MINS = "EXTRA_ETA_MINS"
        const val EXTRA_ELAPSED_SECONDS = "EXTRA_ELAPSED_SECONDS"
        const val EXTRA_OVERLAY_VISIBLE = "EXTRA_OVERLAY_VISIBLE"
        const val EXTRA_PASSENGER_PHONE = "EXTRA_PASSENGER_PHONE"
        const val EXTRA_IS_DARK_THEME = "EXTRA_IS_DARK_THEME"
        const val EXTRA_DRIVER_LAT = "EXTRA_DRIVER_LAT"
        const val EXTRA_DRIVER_LNG = "EXTRA_DRIVER_LNG"

        private const val PREFS_NAME = "trip_overlay_prefs"
        private const val KEY_POS_X = "overlay_x"
        private const val KEY_POS_Y = "overlay_y"

        var isServiceRunning = false
            private set
        var isOverlayViewAdded = false
            private set
        var isOverlayDismissedByUser = false
            private set
        var overlayCloseListener: (() -> Unit)? = null

        var instance: TripForegroundService? = null
            private set

        fun resetOverlayDismissedByUser() {
            isOverlayDismissedByUser = false
        }

        fun updateInstanceData(
            status: String?,
            pickup: String?,
            dropoff: String?,
            etaMins: Int?,
            passengerPhone: String? = null,
            isDark: Boolean? = null,
            driverLat: Double? = null,
            driverLng: Double? = null
        ) {
            instance?.let { s ->
                if (status != null) s.status = status
                if (pickup != null) s.pickupSpot = pickup
                if (dropoff != null) s.dropoffSpot = dropoff
                if (etaMins != null) s.etaMinutes = etaMins
                if (passengerPhone != null) s.passengerPhone = passengerPhone
                if (isDark != null) s.isDarkTheme = isDark
                if (driverLat != null) s.driverLat = driverLat
                if (driverLng != null) s.driverLng = driverLng
                s.updateOverlayUI()
                s.updateDriverLocationOnMap()
                s.updateNotification()
            }
        }

        fun setInstanceOverlayVisible(visible: Boolean, force: Boolean = false) {
            val handler = Handler(Looper.getMainLooper())
            handler.post {
                instance?.let { s ->
                    s.showOverlayRequested = visible
                    if (visible) {
                        if (force) isOverlayDismissedByUser = false
                        if (!isOverlayDismissedByUser) {
                            s.showOverlay()
                        }
                    } else {
                        s.hideOverlay()
                    }
                }
            }
        }
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var layoutParams: WindowManager.LayoutParams? = null

    private var tripId: String = ""
    private var status: String = "ONGOING"
    private var pickupSpot: String = "Pickup Location"
    private var dropoffSpot: String = "Destination"
    private var etaMinutes: Int = 18
    private var passengerPhone: String = "+919876512345"
    private var showOverlayRequested: Boolean = true

    var isDarkTheme: Boolean = false

    private fun checkIsDarkTheme(): Boolean {
        if (isDarkTheme) return true
        try {
            val flutterPrefs = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
            val saved = flutterPrefs.getString("flutter.theme_mode", null)
            if (saved == "dark") return true
            if (saved == "light") return false
        } catch (_: Exception) {}

        // Default to white! Only dark when the user explicitly selects dark theme in the app.
        return false
    }

    private var cardView: LinearLayout? = null
    private var destinationText: TextView? = null
    private var pickupSubtitle: TextView? = null
    private var etaText: TextView? = null
    private var statusText: TextView? = null
    private var closeBtn: ImageView? = null
    private var routeDivider1: View? = null
    private var routeDivider2: View? = null
    private var etaContainer: LinearLayout? = null
    private var openHintText: TextView? = null
    private var toLabel: TextView? = null

    // Dedicated Map Viewing Container (Ready for Google Maps / Map SDK API integration)
    var mapViewContainer: FrameLayout? = null
    private var mapCanvas: FrameLayout? = null
    private var mapBadge: TextView? = null
    private var mapVehicleIcon: ImageView? = null
    private var mapRouteLine: View? = null

    // Native Google MapView for outside-app floating overlay
    private var nativeMapView: MapView? = null
    private var nativeGoogleMap: GoogleMap? = null
    private var driverMarker: Marker? = null
    private var driverLat: Double? = null
    private var driverLng: Double? = null
    private var lastCameraMoveTimeMs: Long = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        isServiceRunning = true
        createNotificationChannel()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) return START_STICKY

        when (intent.action) {
            ACTION_START -> {
                isOverlayDismissedByUser = false
                extractData(intent)
                startForeground(NOTIFICATION_ID, buildNotification())
                if (showOverlayRequested && !isOverlayDismissedByUser) {
                    showOverlay()
                }
            }
            ACTION_UPDATE -> {
                extractData(intent)
                updateOverlayUI()
                updateNotification()
                if (showOverlayRequested && !isOverlayViewAdded && !isOverlayDismissedByUser) {
                    showOverlay()
                }
            }
            ACTION_SET_OVERLAY_VISIBLE -> {
                val visible = intent.getBooleanExtra(EXTRA_OVERLAY_VISIBLE, true)
                showOverlayRequested = visible
                if (visible) {
                    if (!isOverlayDismissedByUser) {
                        showOverlay()
                    }
                } else {
                    hideOverlay()
                }
            }
            ACTION_STOP -> {
                isOverlayDismissedByUser = false
                stopTripTracking()
                return START_NOT_STICKY
            }
        }

        return START_STICKY
    }

    private fun extractData(intent: Intent) {
        tripId = intent.getStringExtra(EXTRA_TRIP_ID) ?: tripId
        status = intent.getStringExtra(EXTRA_STATUS) ?: status
        pickupSpot = intent.getStringExtra(EXTRA_PICKUP) ?: pickupSpot
        dropoffSpot = intent.getStringExtra(EXTRA_DROPOFF) ?: dropoffSpot
        etaMinutes = intent.getIntExtra(EXTRA_ETA_MINS, etaMinutes)
        passengerPhone = intent.getStringExtra(EXTRA_PASSENGER_PHONE) ?: passengerPhone
        if (intent.hasExtra(EXTRA_OVERLAY_VISIBLE)) {
            showOverlayRequested = intent.getBooleanExtra(EXTRA_OVERLAY_VISIBLE, showOverlayRequested)
        }
        if (intent.hasExtra(EXTRA_IS_DARK_THEME)) {
            isDarkTheme = intent.getBooleanExtra(EXTRA_IS_DARK_THEME, isDarkTheme)
        }
        if (intent.hasExtra(EXTRA_DRIVER_LAT)) {
            val lat = intent.getDoubleExtra(EXTRA_DRIVER_LAT, 0.0)
            if (lat != 0.0) driverLat = lat
        }
        if (intent.hasExtra(EXTRA_DRIVER_LNG)) {
            val lng = intent.getDoubleExtra(EXTRA_DRIVER_LNG, 0.0)
            if (lng != 0.0) driverLng = lng
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "HireD Ongoing Trip Tracker",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps driver navigation and live destination tracking active."
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun getMainCenterName(location: String): String {
        if (location.isBlank()) return "Destination"
        val firstPart = location.split(",").firstOrNull()?.trim() ?: location
        val cleaned = firstPart
            .replace(Regex("(?i)\\b(Bengaluru|Bangalore|Karnataka|India|Pincode|Pin\\s*\\d+)\\b"), "")
            .trim()
        return if (cleaned.isNotEmpty()) cleaned else firstPart
    }

    private fun getDestinationShort(): String {
        return getMainCenterName(dropoffSpot)
    }

    private fun getPickupShort(): String {
        return getMainCenterName(pickupSpot)
    }

    private fun buildNotification(): Notification {
        val launchIntent = (packageManager.getLaunchIntentForPackage(packageName) ?: Intent(this, MainActivity::class.java)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val destinationShort = getDestinationShort()
        val title = "Trip to $destinationShort"
        val content = "ETA: ~$etaMinutes mins • $pickupSpot ➔ $destinationShort"

        // Action 1: Open Trip
        val openAction = NotificationCompat.Action.Builder(
            android.R.drawable.ic_menu_directions,
            "Open Trip",
            pendingIntent
        ).build()

        // Action 2: Call Passenger (No cancel action)
        val sanitizedPhone = passengerPhone.filter { it.isDigit() || it == '+' }.ifEmpty { "+919876512345" }
        val callIntent = Intent(Intent.ACTION_DIAL).apply {
            data = Uri.parse("tel:$sanitizedPhone")
        }
        val callPendingIntent = PendingIntent.getActivity(
            this,
            1,
            callIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val callAction = NotificationCompat.Action.Builder(
            android.R.drawable.ic_menu_call,
            "Call",
            callPendingIntent
        ).build()

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_directions)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .addAction(openAction)
            .addAction(callAction)

        // Android 16+ / Live Updates / Progress style
        if (Build.VERSION.SDK_INT >= 34) {
            builder.setProgress(100, 50, false)
            builder.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        }

        return builder.build()
    }

    private fun updateNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun showOverlay() {
        val handler = Handler(Looper.getMainLooper())
        handler.post {
            if (isOverlayDismissedByUser) return@post
            if (overlayView != null && isOverlayViewAdded) return@post

            // Verify overlay permission (Display over other apps e.g. Google Maps)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
                return@post
            }

            try {
                val wm = windowManager ?: (getSystemService(Context.WINDOW_SERVICE) as? WindowManager) ?: return@post
                windowManager = wm
                val layout = createOverlayLayout()

                val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                }

                val metrics = DisplayMetrics()
                wm.defaultDisplay.getMetrics(metrics)

                val cardWidthPx = dpToPx(135f)
                val cardHeightPx = dpToPx(240f)

                // Restore last remembered position or use default
                val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val defaultX = metrics.widthPixels - cardWidthPx - dpToPx(12f)
                val defaultY = dpToPx(100f)
                val initialX = prefs.getInt(KEY_POS_X, defaultX).coerceIn(dpToPx(8f), metrics.widthPixels - cardWidthPx - dpToPx(8f))
                val initialY = prefs.getInt(KEY_POS_Y, defaultY).coerceIn(dpToPx(24f), metrics.heightPixels - cardHeightPx - dpToPx(24f))

                layoutParams = WindowManager.LayoutParams(
                    cardWidthPx,
                    cardHeightPx,
                    overlayType,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.TOP or Gravity.START
                    x = initialX
                    y = initialY
                }

                attachTouchListener(layout, layoutParams!!, wm, metrics.widthPixels, cardWidthPx)

                // Smooth scale and fade-in animation
                layout.alpha = 0f
                layout.scaleX = 0.85f
                layout.scaleY = 0.85f

                wm.addView(layout, layoutParams)
                overlayView = layout
                isOverlayViewAdded = true
                updateOverlayUI()

                layout.animate()
                    .alpha(1f)
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(220)
                    .setInterpolator(android.view.animation.DecelerateInterpolator())
                    .start()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun hideOverlay() {
        val handler = Handler(Looper.getMainLooper())
        handler.post {
            destroyNativeMapView()
            if (overlayView != null && isOverlayViewAdded) {
                try {
                    overlayView?.animate()?.cancel()
                    windowManager?.removeView(overlayView)
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    overlayView = null
                    isOverlayViewAdded = false
                }
            }
        }
    }

    /**
     * Programmatically constructs a clean 9:16 vertical floating card
     * showing:
     * - ONGOING status & live green dot
     * - Destination main center name (clean, not full address)
     * - Dedicated MAP VIEW section (ready for API integration)
     * - Live ETA
     * - Close (X) button
     * - Tap anywhere opens the ongoing trip page!
     */
    private fun createOverlayLayout(): View {
        val root = FrameLayout(this)

        cardView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val isDark = checkIsDarkTheme()
            val bg = GradientDrawable().apply {
                setColor(if (isDark) Color.parseColor("#E61C1823") else Color.WHITE)
                cornerRadius = dpToPx(16f).toFloat()
                setStroke(dpToPx(1.5f), if (isDark) Color.parseColor("#4C6A379F") else Color.parseColor("#E2E8F0"))
            }
            background = bg
            setPadding(dpToPx(8f), dpToPx(8f), dpToPx(8f), dpToPx(8f))
            elevation = dpToPx(8f).toFloat()
        }

        // 1. Top Row: Status badge with green dot, and Close button
        val topRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val dot = View(this).apply {
            val dotBg = GradientDrawable().apply {
                setColor(Color.parseColor("#10B981"))
                shape = GradientDrawable.OVAL
            }
            background = dotBg
            layoutParams = LinearLayout.LayoutParams(dpToPx(6f), dpToPx(6f)).apply {
                marginEnd = dpToPx(4f)
            }
        }
        topRow.addView(dot)

        statusText = TextView(this).apply {
            text = "ONGOING"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f)
            typeface = Typeface.DEFAULT_BOLD
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        topRow.addView(statusText)

        closeBtn = ImageView(this).apply {
            setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
            layoutParams = LinearLayout.LayoutParams(dpToPx(16f), dpToPx(16f))
            isClickable = true
            isFocusable = false
            setOnClickListener {
                isOverlayDismissedByUser = true
                showOverlayRequested = false
                hideOverlay()
                overlayCloseListener?.invoke()
            }
        }
        topRow.addView(closeBtn)
        cardView!!.addView(topRow)

        // Divider 1
        routeDivider1 = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(1f)
            ).apply {
                topMargin = dpToPx(4f)
                bottomMargin = dpToPx(4f)
            }
        }
        cardView!!.addView(routeDivider1)

        // 2. Middle Destination Center Name Section
        val routeSection = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dpToPx(2f)
            }
        }

        toLabel = TextView(this).apply {
            text = "DESTINATION"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 6.5f)
            typeface = Typeface.DEFAULT_BOLD
            letterSpacing = 0.05f
        }
        routeSection.addView(toLabel)

        destinationText = TextView(this).apply {
            text = getDestinationShort()
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f)
            typeface = Typeface.DEFAULT_BOLD
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dpToPx(1f)
            }
        }
        routeSection.addView(destinationText)

        pickupSubtitle = TextView(this).apply {
            text = "From " + getPickupShort()
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 7.5f)
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dpToPx(1f)
            }
        }
        routeSection.addView(pickupSubtitle)
        cardView!!.addView(routeSection)

        // 3. MAP VIEW CONTAINER (Dedicated area for showing map on the floating screen)
        // Ready for Google Maps / Mapbox / MapLibre API: TripForegroundService.instance?.mapViewContainer?.addView(...)
        mapViewContainer = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            ).apply {
                topMargin = dpToPx(2f)
                bottomMargin = dpToPx(2f)
            }
        }

        mapCanvas = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        // Live map badge
        mapBadge = TextView(this).apply {
            text = "● LIVE MAP"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 6.5f)
            typeface = Typeface.DEFAULT_BOLD
            setPadding(dpToPx(5f), dpToPx(2f), dpToPx(5f), dpToPx(2f))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                marginStart = dpToPx(5f)
                topMargin = dpToPx(5f)
            }
        }
        mapCanvas!!.addView(mapBadge)

        // Center route & navigation graphic
        val mapGraphics = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        mapVehicleIcon = ImageView(this).apply {
            setImageResource(android.R.drawable.ic_menu_directions)
            layoutParams = LinearLayout.LayoutParams(dpToPx(22f), dpToPx(22f))
        }
        mapGraphics.addView(mapVehicleIcon)

        mapRouteLine = TextView(this).apply {
            text = "ONGOING"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 7f)
            typeface = Typeface.DEFAULT_BOLD
            letterSpacing = 0.08f
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dpToPx(2f)
            }
        }
        mapGraphics.addView(mapRouteLine)
        mapCanvas!!.addView(mapGraphics)

        mapViewContainer!!.addView(mapCanvas)
        setupNativeMapView(mapViewContainer!!)
        cardView!!.addView(mapViewContainer)

        // Divider 2
        routeDivider2 = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(1f)
            ).apply {
                topMargin = dpToPx(4f)
                bottomMargin = dpToPx(4f)
            }
        }
        cardView!!.addView(routeDivider2)

        // 4. Bottom ETA & Open Hint
        etaContainer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(dpToPx(4f), dpToPx(4f), dpToPx(4f), dpToPx(4f))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        etaText = TextView(this).apply {
            text = "~${etaMinutes}m ETA"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        etaContainer!!.addView(etaText)
        cardView!!.addView(etaContainer)

        openHintText = TextView(this).apply {
            text = "Open Trip ↗"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 7.5f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dpToPx(2f)
            }
        }
        cardView!!.addView(openHintText)

        applyThemeColors()

        root.addView(cardView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        return root
    }

    private fun applyThemeColors() {
        val isDark = checkIsDarkTheme()

        val cardBgColor = if (isDark) Color.parseColor("#E61C1823") else Color.WHITE
        val cardStrokeColor = if (isDark) Color.parseColor("#4C6A379F") else Color.parseColor("#E2E8F0")

        val bg = GradientDrawable().apply {
            setColor(cardBgColor)
            cornerRadius = dpToPx(16f).toFloat()
            setStroke(dpToPx(1.5f), cardStrokeColor)
        }
        cardView?.background = bg

        val statusColor = if (isDark) Color.parseColor("#34D399") else Color.parseColor("#059669")
        statusText?.setTextColor(statusColor)

        val closeColor = if (isDark) Color.parseColor("#94A3B8") else Color.parseColor("#64748B")
        closeBtn?.setColorFilter(closeColor)

        val divColor = if (isDark) Color.parseColor("#332D42") else Color.parseColor("#F1F5F9")
        routeDivider1?.setBackgroundColor(divColor)
        routeDivider2?.setBackgroundColor(divColor)

        val toColor = if (isDark) Color.parseColor("#C084FC") else Color.parseColor("#7C3AED")
        toLabel?.setTextColor(toColor)

        val destColor = if (isDark) Color.WHITE else Color.parseColor("#0F172A")
        destinationText?.setTextColor(destColor)

        val pickupColor = if (isDark) Color.parseColor("#94A3B8") else Color.parseColor("#64748B")
        pickupSubtitle?.setTextColor(pickupColor)

        // Map View Colors
        val mapBgColor = if (isDark) Color.parseColor("#181424") else Color.parseColor("#F8FAFC")
        val mapBorderColor = if (isDark) Color.parseColor("#3B2C59") else Color.parseColor("#E2E8F0")
        val mapBg = GradientDrawable().apply {
            setColor(mapBgColor)
            cornerRadius = dpToPx(8f).toFloat()
            setStroke(dpToPx(1f), mapBorderColor)
        }
        mapCanvas?.background = mapBg

        val mapBadgeBg = GradientDrawable().apply {
            setColor(if (isDark) Color.parseColor("#3B1D66") else Color.parseColor("#EDE9FE"))
            cornerRadius = dpToPx(4f).toFloat()
        }
        mapBadge?.background = mapBadgeBg
        mapBadge?.setTextColor(if (isDark) Color.parseColor("#C084FC") else Color.parseColor("#6D28D9"))

        val mapTint = if (isDark) Color.parseColor("#A855F7") else Color.parseColor("#7C3AED")
        mapVehicleIcon?.setColorFilter(mapTint)
        (mapRouteLine as? TextView)?.setTextColor(mapTint)

        val etaBgColor = if (isDark) Color.parseColor("#2E1065") else Color.parseColor("#F5F3FF")
        val etaStrokeColor = if (isDark) Color.parseColor("#6B21A8") else Color.parseColor("#DDD6FE")
        val etaTextColor = if (isDark) Color.parseColor("#C084FC") else Color.parseColor("#6D28D9")

        val etaBg = GradientDrawable().apply {
            setColor(etaBgColor)
            cornerRadius = dpToPx(8f).toFloat()
            setStroke(dpToPx(1f), etaStrokeColor)
        }
        etaContainer?.background = etaBg
        etaText?.setTextColor(etaTextColor)
        openHintText?.setTextColor(etaTextColor)
    }

    private fun updateOverlayUI() {
        val handler = Handler(Looper.getMainLooper())
        handler.post {
            destinationText?.text = getDestinationShort()
            pickupSubtitle?.text = "From " + getPickupShort()
            etaText?.text = "~${etaMinutes}m ETA"
            statusText?.text = if (status == "ASSIGNED") "ASSIGNED" else "ONGOING"
            applyThemeColors()
            updateDriverLocationOnMap()
        }
    }

    private fun isMapsKeyConfigured(): Boolean {
        return try {
            val appInfo = packageManager.getApplicationInfo(packageName, android.content.pm.PackageManager.GET_META_DATA)
            val key = appInfo.metaData?.getString("com.google.android.geo.API_KEY")
            !key.isNullOrBlank() && key != "YOUR_ANDROID_MAPS_API_KEY"
        } catch (_: Exception) {
            false
        }
    }

    private fun setupNativeMapView(container: FrameLayout) {
        if (!isMapsKeyConfigured()) {
            return
        }

        try {
            val options = GoogleMapOptions()
                .liteMode(true)
                .scrollGesturesEnabled(false)
                .zoomGesturesEnabled(false)
                .rotateGesturesEnabled(false)
                .tiltGesturesEnabled(false)
                .compassEnabled(false)
                .mapToolbarEnabled(false)

            val mapView = MapView(this, options).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            mapView.onCreate(null)
            mapView.onResume()

            mapView.getMapAsync { googleMap ->
                nativeGoogleMap = googleMap
                googleMap.uiSettings.isMapToolbarEnabled = false
                googleMap.uiSettings.setAllGesturesEnabled(false)

                val lat = driverLat
                val lng = driverLng
                if (lat != null && lng != null) {
                    val pos = LatLng(lat, lng)
                    driverMarker = googleMap.addMarker(
                        MarkerOptions()
                            .position(pos)
                            .title("Driver")
                            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE))
                    )
                    googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(pos, 16f))
                }

                mapCanvas?.visibility = View.GONE
            }

            container.addView(mapView, 0)
            nativeMapView = mapView
        } catch (e: Exception) {
            nativeMapView = null
            nativeGoogleMap = null
            mapCanvas?.visibility = View.VISIBLE
        }
    }

    private fun updateDriverLocationOnMap() {
        val lat = driverLat ?: return
        val lng = driverLng ?: return
        val latLng = LatLng(lat, lng)

        val now = System.currentTimeMillis()
        if (now - lastCameraMoveTimeMs < 3000L) {
            return
        }
        lastCameraMoveTimeMs = now

        nativeGoogleMap?.let { map ->
            if (driverMarker == null) {
                driverMarker = map.addMarker(
                    MarkerOptions()
                        .position(latLng)
                        .title("Driver")
                        .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE))
                )
            } else {
                driverMarker?.position = latLng
            }
            map.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, 16f))
        }
    }

    private fun destroyNativeMapView() {
        try {
            nativeMapView?.onPause()
            nativeMapView?.onDestroy()
            mapViewContainer?.removeView(nativeMapView)
        } catch (_: Exception) {}
        nativeMapView = null
        nativeGoogleMap = null
        driverMarker = null
    }

    private fun attachTouchListener(
        view: View,
        params: WindowManager.LayoutParams,
        wm: WindowManager,
        screenWidth: Int,
        cardWidthPx: Int
    ) {
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        val touchSlop = dpToPx(8f)

        view.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = initialX + (event.rawX - initialTouchX).toInt()
                    params.y = initialY + (event.rawY - initialTouchY).toInt()
                    try {
                        wm.updateViewLayout(view, params)
                    } catch (_: Exception) {}
                    true
                }
                MotionEvent.ACTION_UP -> {
                    val deltaX = Math.abs(event.rawX - initialTouchX)
                    val deltaY = Math.abs(event.rawY - initialTouchY)

                    if (deltaX < touchSlop && deltaY < touchSlop) {
                        // Click / Tap: Bring app to front
                        openApp()
                    } else {
                        // Drag completed: snap to nearest screen edge (left or right)
                        val snapMargin = dpToPx(12f)
                        val midPoint = screenWidth / 2
                        val currentCenterX = params.x + (cardWidthPx / 2)

                        params.x = if (currentCenterX < midPoint) {
                            snapMargin
                        } else {
                            screenWidth - cardWidthPx - snapMargin
                        }

                        try {
                            wm.updateViewLayout(view, params)
                            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                            prefs.edit().putInt(KEY_POS_X, params.x).putInt(KEY_POS_Y, params.y).apply()
                        } catch (_: Exception) {}
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun openApp() {
        showOverlayRequested = false
        hideOverlay()
        val intent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        startActivity(intent)
    }

    private fun stopTripTracking() {
        hideOverlay()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        isServiceRunning = false
        stopSelf()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // If all app closed / swiped away in Recents during ongoing trip, ensure floating overlay appears!
        if (isServiceRunning && status == "ONGOING") {
            if (!isOverlayDismissedByUser) {
                showOverlayRequested = true
                showOverlay()
            }
        }
    }

    override fun onDestroy() {
        destroyNativeMapView()
        hideOverlay()
        isServiceRunning = false
        if (instance == this) {
            instance = null
        }
        super.onDestroy()
    }

    private fun dpToPx(dp: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            resources.displayMetrics
        ).toInt()
    }
}
