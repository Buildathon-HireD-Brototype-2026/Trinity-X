package com.hired.driver_app

import android.app.ActivityManager
import android.app.AppOpsManager
import android.app.PictureInPictureParams
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Rational
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    companion object {
        private const val CHANNEL_NAME = "com.hired.driver_app/trip_mini_overlay"
    }

    private var methodChannel: MethodChannel? = null
    private var pendingOpenTripDetails: Boolean = false
    private var pendingTripId: String? = null

    private var isTripRunning: Boolean = false
    private var isMiniDismissed: Boolean = false
    private var isAutoPiPEnabled: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
        }
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun isPipSupported(): Boolean {
        return false
    }

    private fun isPipAllowed(): Boolean {
        return false
    }

    private fun updatePiPParams(autoEnter: Boolean) {
        // PiP minimize mode disabled per user requirement
    }

    private fun enterPipMode(): Boolean {
        return false
    }

    private var isAppInForeground: Boolean = false

    override fun onResume() {
        super.onResume()
        isAppInForeground = true
        // When driver opens or returns to app, outside system overlay must hide immediately!
        TripForegroundService.setInstanceOverlayVisible(false)
        notifyFlutterOpenTripDetails()
    }

    override fun onPause() {
        super.onPause()
        isAppInForeground = false
        // When leaving app (Recent apps, Home, back exit) during an ongoing trip, always show floating overlay outside
        if (isTripRunning) {
            TripForegroundService.setInstanceOverlayVisible(true, force = true)
        }
    }

    override fun onStop() {
        super.onStop()
        isAppInForeground = false
        if (isTripRunning) {
            TripForegroundService.setInstanceOverlayVisible(true, force = true)
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // Driver pressed Home or Recent apps: always show floating overlay outside during ongoing trip
        if (isTripRunning) {
            TripForegroundService.setInstanceOverlayVisible(true, force = true)
        }
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        methodChannel?.invokeMethod(
            "onPictureInPictureModeChanged",
            mapOf("isInPiP" to isInPictureInPictureMode)
        )
    }

    private fun handleIntent(intent: Intent?) {
        if (intent == null) return
        if (intent.getBooleanExtra("open_trip_details", false)) {
            pendingOpenTripDetails = true
            pendingTripId = intent.getStringExtra("trip_id")
            intent.removeExtra("open_trip_details")
            intent.removeExtra("trip_id")
            // Immediate overlay hide when launched to open trip details
            TripForegroundService.setInstanceOverlayVisible(false)
            notifyFlutterOpenTripDetails()
        }
    }

    private fun notifyFlutterOpenTripDetails() {
        if (pendingOpenTripDetails && methodChannel != null) {
            methodChannel?.invokeMethod("onOpenTripDetailsFromOverlay", mapOf("trip_id" to pendingTripId))
            pendingOpenTripDetails = false
            pendingTripId = null
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL_NAME).apply {
            setMethodCallHandler { call, result ->
                when (call.method) {
                    "checkOverlayPermission" -> {
                        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            Settings.canDrawOverlays(this@MainActivity)
                        } else {
                            true
                        }
                        result.success(granted)
                    }

                    "requestOverlayPermission" -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            try {
                                val intent = Intent(
                                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                    Uri.parse("package:$packageName")
                                )
                                startActivity(intent)
                                result.success(true)
                            } catch (e: Exception) {
                                result.error("PERMISSION_ERROR", e.message, null)
                            }
                        } else {
                            result.success(true)
                        }
                    }

                    "startTripService" -> {
                        isMiniDismissed = false
                        TripForegroundService.resetOverlayDismissedByUser()
                        val args = call.arguments as? Map<*, *> ?: emptyMap<String, Any>()
                        val rawTripId = args["trip_id"]?.toString() ?: ""
                        val safeTripId = rawTripId.filter { it.isLetterOrDigit() || it == '-' || it == '_' }.take(64)
                        val rawPhone = args["passenger_phone"]?.toString() ?: "+919876512345"
                        val safePhone = rawPhone.filter { it.isDigit() || it == '+' }.take(16).ifEmpty { "+919876512345" }
                        val safeEta = ((args["eta_mins"] as? Number)?.toInt() ?: 18).coerceIn(0, 720)
                        val safeElapsed = ((args["elapsed_seconds"] as? Number)?.toInt() ?: 0).coerceIn(0, 86400)

                        val requestedOverlay = args["overlay_visible"] as? Boolean ?: true
                        val overlayVisible = if (isAppInForeground) false else requestedOverlay

                        val intent = Intent(this@MainActivity, TripForegroundService::class.java).apply {
                            action = TripForegroundService.ACTION_START
                            putExtra(TripForegroundService.EXTRA_TRIP_ID, safeTripId)
                            putExtra(TripForegroundService.EXTRA_STATUS, args["status"]?.toString() ?: "ONGOING")
                            putExtra(TripForegroundService.EXTRA_PICKUP, args["pickup_spot"]?.toString() ?: "")
                            putExtra(TripForegroundService.EXTRA_DROPOFF, args["dropoff_spot"]?.toString() ?: "")
                            putExtra(TripForegroundService.EXTRA_ETA_MINS, safeEta)
                            putExtra(TripForegroundService.EXTRA_ELAPSED_SECONDS, safeElapsed)
                            putExtra(TripForegroundService.EXTRA_OVERLAY_VISIBLE, overlayVisible)
                            putExtra(TripForegroundService.EXTRA_PASSENGER_PHONE, safePhone)
                            putExtra(TripForegroundService.EXTRA_IS_DARK_THEME, args["is_dark_theme"] as? Boolean ?: false)
                        }
                        ContextCompat.startForegroundService(this@MainActivity, intent)
                        result.success(true)
                    }

                    "updateTripService" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<String, Any>()
                        val rawPhone = args["passenger_phone"]?.toString()
                        val safePhone = rawPhone?.filter { it.isDigit() || it == '+' }?.take(16)
                        val safeEta = (args["eta_mins"] as? Number)?.toInt()?.coerceIn(0, 720)

                        if (TripForegroundService.instance != null) {
                            runOnUiThread {
                                TripForegroundService.updateInstanceData(
                                    status = args["status"]?.toString(),
                                    pickup = args["pickup_spot"]?.toString(),
                                    dropoff = args["dropoff_spot"]?.toString(),
                                    etaMins = safeEta,
                                    passengerPhone = safePhone,
                                    isDark = args["is_dark_theme"] as? Boolean
                                )
                            }
                        } else if (TripForegroundService.isServiceRunning) {
                            try {
                                val rawTripId = args["trip_id"]?.toString() ?: ""
                                val safeTripId = rawTripId.filter { it.isLetterOrDigit() || it == '-' || it == '_' }.take(64)
                                val safeElapsed = ((args["elapsed_seconds"] as? Number)?.toInt() ?: 0).coerceIn(0, 86400)

                                val intent = Intent(this@MainActivity, TripForegroundService::class.java).apply {
                                    action = TripForegroundService.ACTION_UPDATE
                                    putExtra(TripForegroundService.EXTRA_TRIP_ID, safeTripId)
                                    putExtra(TripForegroundService.EXTRA_STATUS, args["status"]?.toString() ?: "ONGOING")
                                    putExtra(TripForegroundService.EXTRA_PICKUP, args["pickup_spot"]?.toString() ?: "")
                                    putExtra(TripForegroundService.EXTRA_DROPOFF, args["dropoff_spot"]?.toString() ?: "")
                                    putExtra(TripForegroundService.EXTRA_ETA_MINS, safeEta ?: 18)
                                    putExtra(TripForegroundService.EXTRA_ELAPSED_SECONDS, safeElapsed)
                                    putExtra(TripForegroundService.EXTRA_IS_DARK_THEME, args["is_dark_theme"] as? Boolean ?: false)
                                }
                                ContextCompat.startForegroundService(this@MainActivity, intent)
                            } catch (_: Exception) {}
                        }
                        result.success(true)
                    }

                    "setOverlayVisible" -> {
                        val visible = call.arguments as? Boolean ?: true
                        if (TripForegroundService.instance != null) {
                            runOnUiThread {
                                TripForegroundService.setInstanceOverlayVisible(visible)
                            }
                        } else if (TripForegroundService.isServiceRunning) {
                            try {
                                val intent = Intent(this@MainActivity, TripForegroundService::class.java).apply {
                                    action = TripForegroundService.ACTION_SET_OVERLAY_VISIBLE
                                    putExtra(TripForegroundService.EXTRA_OVERLAY_VISIBLE, visible)
                                }
                                ContextCompat.startForegroundService(this@MainActivity, intent)
                            } catch (_: Exception) {}
                        }
                        result.success(true)
                    }

                    "stopTripService" -> {
                        try {
                            val intent = Intent(this@MainActivity, TripForegroundService::class.java).apply {
                                action = TripForegroundService.ACTION_STOP
                            }
                            startService(intent)
                        } catch (_: Exception) {}
                        result.success(true)
                    }

                    "isServiceRunning" -> {
                        result.success(TripForegroundService.isServiceRunning)
                    }

                    "checkPendingOpenTrip" -> {
                        val shouldOpen = pendingOpenTripDetails
                        val tId = pendingTripId
                        pendingOpenTripDetails = false
                        pendingTripId = null
                        result.success(mapOf("should_open" to shouldOpen, "trip_id" to tId))
                    }

                    "isLowRamDevice" -> {
                        val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                        val isLowRam = (activityManager?.isLowRamDevice == true) || (Build.VERSION.SDK_INT < Build.VERSION_CODES.R)
                        result.success(isLowRam)
                    }

                    "isPipSupported" -> {
                        result.success(isPipSupported())
                    }

                    "isPipAllowed" -> {
                        result.success(isPipAllowed())
                    }

                    "enterPiP" -> {
                        result.success(enterPipMode())
                    }

                    "setAutoEnterPiP" -> {
                        val enabled = call.arguments as? Boolean ?: false
                        updatePiPParams(enabled)
                        result.success(true)
                    }

                    "updateTripState" -> {
                        val args = call.arguments as? Map<*, *>
                        isTripRunning = args?.get("isTripRunning") as? Boolean ?: isTripRunning
                        isMiniDismissed = args?.get("miniDismissed") as? Boolean ?: isMiniDismissed
                        val autoEnter = isTripRunning && !isMiniDismissed
                        updatePiPParams(autoEnter)
                        result.success(true)
                    }

                    "sendToBackgroundWithMini" -> {
                        if (isTripRunning) {
                            TripForegroundService.setInstanceOverlayVisible(true, force = true)
                        }
                        moveTaskToBack(true)
                        result.success(true)
                    }

                    "sendToBackground" -> {
                        moveTaskToBack(true)
                        result.success(true)
                    }

                    else -> result.notImplemented()
                }
            }
        }

        TripForegroundService.overlayCloseListener = {
            runOnUiThread {
                isMiniDismissed = true
                methodChannel?.invokeMethod("onOverlayClosedByUser", null)
            }
        }

        notifyFlutterOpenTripDetails()
    }
}
