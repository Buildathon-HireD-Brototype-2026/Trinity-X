import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import '../domain/trip_model.dart';

/// Native MethodChannel bridge connecting Flutter trip state to Android
/// TripForegroundService and the Floating System Overlay Window.
class TripNativeBridge {
  static const MethodChannel _channel =
      MethodChannel('com.hired.driver_app/trip_mini_overlay');

  final _overlayClosedController = StreamController<void>.broadcast();
  final _openTripDetailsController = StreamController<String?>.broadcast();
  final _pipModeController = StreamController<bool>.broadcast();

  Stream<void> get onOverlayClosedByUser => _overlayClosedController.stream;
  Stream<String?> get onOpenTripDetailsFromOverlay => _openTripDetailsController.stream;
  Stream<bool> get onPictureInPictureModeChanged => _pipModeController.stream;

  TripNativeBridge() {
    _channel.setMethodCallHandler(_handleNativeCall);
  }

  Future<dynamic> _handleNativeCall(MethodCall call) async {
    switch (call.method) {
      case 'onOverlayClosedByUser':
        _overlayClosedController.add(null);
        break;
      case 'onOpenTripDetailsFromOverlay':
        final args = call.arguments as Map<dynamic, dynamic>?;
        final tripId = args?['trip_id'] as String?;
        _openTripDetailsController.add(tripId);
        break;
      case 'onPictureInPictureModeChanged':
        final args = call.arguments as Map<dynamic, dynamic>?;
        final inPiP = args?['isInPiP'] as bool? ?? false;
        _pipModeController.add(inPiP);
        break;
      default:
        break;
    }
  }

  /// Checks if Android "Display over other apps" (SYSTEM_ALERT_WINDOW) is granted.
  Future<bool> checkOverlayPermission() async {
    if (kIsWeb) return false;
    try {
      final granted = await _channel.invokeMethod<bool>('checkOverlayPermission');
      return granted ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] checkOverlayPermission error: $e');
      return false;
    }
  }

  /// Requests the user to toggle "Display over other apps" in Android System Settings.
  Future<bool> requestOverlayPermission() async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('requestOverlayPermission');
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] requestOverlayPermission error: $e');
      return false;
    }
  }

  /// Checks if Picture-in-Picture is supported on this device.
  Future<bool> isPipSupported() async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('isPipSupported');
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] isPipSupported error: $e');
      return false;
    }
  }

  /// Checks if the device is a low-RAM/low-spec device (RAM <= 2GB or Android SDK < 30).
  Future<bool> isLowRamDevice() async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('isLowRamDevice');
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] isLowRamDevice error: $e');
      return false;
    }
  }

  /// Checks if Picture-in-Picture is allowed by user permissions in App Settings.
  Future<bool> isPipAllowed() async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('isPipAllowed');
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] isPipAllowed error: $e');
      return false;
    }
  }

  /// Manually triggers entering Picture-in-Picture mode.
  Future<bool> enterPictureInPicture() async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('enterPiP');
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] enterPictureInPicture error: $e');
      return false;
    }
  }

  /// Configures auto-enter Picture-in-Picture on Android 12+ (API 31+).
  Future<bool> setAutoEnterPiP(bool enabled) async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('setAutoEnterPiP', enabled);
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] setAutoEnterPiP error: $e');
      return false;
    }
  }

  /// Synchronizes overall trip running and miniDismissed states with native layer
  /// so Android PiP auto-enter and overlay triggers know whether to fire on swipe up / home.
  Future<bool> updateTripState({
    required bool isTripRunning,
    required bool miniDismissed,
  }) async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('updateTripState', {
        'isTripRunning': isTripRunning,
        'miniDismissed': miniDismissed,
      });
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] updateTripState error: $e');
      return false;
    }
  }

  /// Starts the Android Foreground Service with an ongoing notification
  /// and shows the system floating mini window (if permission granted).
  Future<bool> startTripService({
    required TripModel trip,
    required int elapsedSeconds,
    bool overlayVisible = true,
  }) async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('startTripService', {
        'trip_id': trip.tripId,
        'status': trip.status,
        'pickup_spot': trip.pickupSpot,
        'dropoff_spot': trip.dropoffSpot,
        'eta_mins': trip.estimatedReachMinutes,
        'passenger_phone': trip.contactPhone,
        'elapsed_seconds': elapsedSeconds,
        'overlay_visible': overlayVisible,
        if (trip.pickupLat != null) 'driver_lat': trip.pickupLat,
        if (trip.pickupLng != null) 'driver_lng': trip.pickupLng,
      });
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] startTripService error: $e');
      return false;
    }
  }

  /// Updates live trip values in the ongoing notification and floating overlay.
  Future<bool> updateTripService({
    required TripModel trip,
    required int elapsedSeconds,
  }) async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('updateTripService', {
        'trip_id': trip.tripId,
        'status': trip.status,
        'pickup_spot': trip.pickupSpot,
        'dropoff_spot': trip.dropoffSpot,
        'eta_mins': trip.estimatedReachMinutes,
        'passenger_phone': trip.contactPhone,
        'elapsed_seconds': elapsedSeconds,
        if (trip.pickupLat != null) 'driver_lat': trip.pickupLat,
        if (trip.pickupLng != null) 'driver_lng': trip.pickupLng,
      });
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] updateTripService error: $e');
      return false;
    }
  }

  /// Updates live driver coordinates in the native overlay MapView.
  Future<bool> updateDriverCoordinates({
    required double lat,
    required double lng,
  }) async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('updateDriverCoordinates', {
        'driver_lat': lat,
        'driver_lng': lng,
      });
      return res ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Shows or hides ONLY the floating overlay window without killing the
  /// foreground service or stopping background tracking.
  Future<bool> setOverlayVisible(bool visible) async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('setOverlayVisible', visible);
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] setOverlayVisible error: $e');
      return false;
    }
  }

  /// Completely stops the foreground service and removes overlay & notification
  /// (invoked only when trip is completed or explicitly cancelled).
  Future<bool> stopTripService() async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('stopTripService');
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] stopTripService error: $e');
      return false;
    }
  }

  /// Sends the app to the background (moveTaskToBack or PiP) and displays
  /// the outside-app mini view (system floating overlay or PiP window).
  Future<bool> sendToBackgroundWithMini() async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('sendToBackgroundWithMini');
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] sendToBackgroundWithMini error: $e');
      return false;
    }
  }

  /// Sends the app to the background without showing any outside overlay view.
  Future<bool> sendToBackground() async {
    if (kIsWeb) return false;
    try {
      final res = await _channel.invokeMethod<bool>('sendToBackground');
      return res ?? false;
    } catch (e) {
      debugPrint('[TripNativeBridge] sendToBackground error: $e');
      return false;
    }
  }

  /// Checks if MainActivity was launched with an outside overlay tap to open trip details.
  Future<Map<String, dynamic>> checkPendingOpenTrip() async {
    if (kIsWeb) return {'should_open': false, 'trip_id': null};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('checkPendingOpenTrip');
      if (res != null) {
        return {
          'should_open': res['should_open'] as bool? ?? false,
          'trip_id': res['trip_id'] as String?,
        };
      }
    } catch (e) {
      debugPrint('[TripNativeBridge] checkPendingOpenTrip error: $e');
    }
    return {'should_open': false, 'trip_id': null};
  }

  void dispose() {
    _overlayClosedController.close();
    _openTripDetailsController.close();
    _pipModeController.close();
  }
}
