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

        private const val PREFS_NAME = "trip_overlay_prefs"
        private const val KEY_POS_X = "overlay_x"
        private const val KEY_POS_Y = "overlay_y"

        var isServiceRunning = false
            private set
        var isOverlayViewAdded = false
            private set
        var overlayCloseListener: (() -> Unit)? = null

        var instance: TripForegroundService? = null
            private set

        fun updateInstanceData(status: String?, pickup: String?, dropoff: String?, etaMins: Int?, passengerPhone: String? = null) {
            instance?.let { s ->
                if (status != null) s.status = status
                if (pickup != null) s.pickupSpot = pickup
                if (dropoff != null) s.dropoffSpot = dropoff
                if (etaMins != null) s.etaMinutes = etaMins
                if (passengerPhone != null) s.passengerPhone = passengerPhone
                s.updateOverlayUI()
                s.updateNotification()
            }
        }

        fun setInstanceOverlayVisible(visible: Boolean) {
            instance?.let { s ->
                s.showOverlayRequested = visible
                if (visible) {
                    s.showOverlay()
                } else {
                    s.hideOverlay()
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

    private var destinationText: TextView? = null
    private var etaText: TextView? = null
    private var statusText: TextView? = null

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
                extractData(intent)
                startForeground(NOTIFICATION_ID, buildNotification())
                if (showOverlayRequested) {
                    showOverlay()
                }
            }
            ACTION_UPDATE -> {
                extractData(intent)
                updateOverlayUI()
                updateNotification()
                if (showOverlayRequested && !isOverlayViewAdded) {
                    showOverlay()
                }
            }
            ACTION_SET_OVERLAY_VISIBLE -> {
                val visible = intent.getBooleanExtra(EXTRA_OVERLAY_VISIBLE, true)
                showOverlayRequested = visible
                if (visible) {
                    showOverlay()
                } else {
                    hideOverlay()
                }
            }
            ACTION_STOP -> {
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

    private fun getDestinationShort(): String {
        return dropoffSpot.split(",").firstOrNull()?.trim() ?: dropoffSpot
    }

    private fun buildNotification(): Notification {
        val launchIntent = (packageManager.getLaunchIntentForPackage(packageName) ?: Intent(this, MainActivity::class.java)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("open_trip_details", true)
            putExtra("trip_id", tripId)
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
        if (overlayView != null && isOverlayViewAdded) return

        // Verify overlay permission (Display over other apps e.g. Google Maps)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            return
        }

        try {
            val wm = windowManager ?: return
            val layout = createOverlayLayout()

            val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            val metrics = DisplayMetrics()
            wm.defaultDisplay.getMetrics(metrics)

            val cardWidthPx = dpToPx(205f)
            val cardHeightPx = dpToPx(76f)

            // Restore last remembered position or use default
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val defaultX = metrics.widthPixels - cardWidthPx - dpToPx(16f)
            val defaultY = dpToPx(130f)
            val initialX = prefs.getInt(KEY_POS_X, defaultX).coerceIn(dpToPx(12f), metrics.widthPixels - cardWidthPx - dpToPx(12f))
            val initialY = prefs.getInt(KEY_POS_Y, defaultY).coerceIn(dpToPx(30f), metrics.heightPixels - cardHeightPx - dpToPx(30f))

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

    private fun hideOverlay() {
        if (overlayView != null && isOverlayViewAdded) {
            try {
                windowManager?.removeView(overlayView)
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                overlayView = null
                isOverlayViewAdded = false
            }
        }
    }

    /**
     * Programmatically constructs a clean floating card
     * showing:
     * - ONGOING status
     * - Destination place short name
     * - ETA
     * - Close (X) button
     * - Tap anywhere opens the ongoing trip page!
     */
    private fun createOverlayLayout(): View {
        val root = FrameLayout(this)

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val bg = GradientDrawable().apply {
                setColor(Color.parseColor("#E61C1823")) // Dark slate-purple glass
                cornerRadius = dpToPx(18f).toFloat()
                setStroke(dpToPx(1.5f), Color.parseColor("#4C6A379F")) // Purple border
            }
            background = bg
            setPadding(dpToPx(12f), dpToPx(9f), dpToPx(10f), dpToPx(9f))
            elevation = dpToPx(8f).toFloat()
        }

        // Top Row: Status badge with green dot, and Close button
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
            layoutParams = LinearLayout.LayoutParams(dpToPx(7f), dpToPx(7f)).apply {
                marginEnd = dpToPx(5f)
            }
        }
        topRow.addView(dot)

        statusText = TextView(this).apply {
            text = "ONGOING TRIP"
            setTextColor(Color.parseColor("#34D399"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            typeface = Typeface.DEFAULT_BOLD
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        topRow.addView(statusText)

        // Close (X) button: closes ONLY the overlay UI, keeps trip running
        val closeBtn = ImageView(this).apply {
            setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
            setColorFilter(Color.parseColor("#94A3B8"))
            layoutParams = LinearLayout.LayoutParams(dpToPx(20f), dpToPx(20f))
            isClickable = true
            isFocusable = false
            setOnClickListener {
                hideOverlay()
                overlayCloseListener?.invoke()
            }
        }
        topRow.addView(closeBtn)

        card.addView(topRow)

        // Middle Row: Destination short place name
        destinationText = TextView(this).apply {
            text = getDestinationShort()
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            typeface = Typeface.DEFAULT_BOLD
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dpToPx(4f)
            }
        }
        card.addView(destinationText)

        // Bottom Row: ETA & Tap to view hint
        val bottomRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dpToPx(3f)
            }
        }

        etaText = TextView(this).apply {
            text = "~${etaMinutes}m ETA"
            setTextColor(Color.parseColor("#C084FC")) // Light purple
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f)
            typeface = Typeface.DEFAULT_BOLD
        }
        bottomRow.addView(etaText)

        val tapHint = TextView(this).apply {
            text = "Tap to view trip →"
            setTextColor(Color.parseColor("#94A3B8"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 9.5f)
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        bottomRow.addView(tapHint)

        card.addView(bottomRow)

        root.addView(card)
        return root
    }

    private fun updateOverlayUI() {
        val handler = Handler(Looper.getMainLooper())
        handler.post {
            destinationText?.text = getDestinationShort()
            etaText?.text = "~${etaMinutes}m ETA"
            statusText?.text = "ONGOING TRIP"
        }
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
                        // Click / Tap: Bring app to ongoing trip page
                        openAppToTripDetails()
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

    private fun openAppToTripDetails() {
        val intent = (packageManager.getLaunchIntentForPackage(packageName) ?: Intent(this, MainActivity::class.java)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("open_trip_details", true)
            putExtra("trip_id", tripId)
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

    override fun onDestroy() {
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
