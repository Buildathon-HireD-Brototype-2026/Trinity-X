import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Centralized configuration for Google Maps SDK and live tracking.
class MapsConfig {
  static const String androidPlaceholderKey = 'YOUR_ANDROID_MAPS_API_KEY';
  static const String iosPlaceholderKey = 'YOUR_IOS_MAPS_API_KEY';

  /// Zoom level for driver-location mode (street level).
  static const double driverLocationZoom = 16.0;

  /// Camera movement thresholds for driver following:
  /// Normal: moves when driver shifts > 20m, throttled to at most once per 3s.
  static const double normalMoveThresholdMeters = 20.0;
  static const Duration normalThrottleDuration = Duration(seconds: 3);

  /// Low-spec / Lite mode: moves when driver shifts > 50m, throttled to at most once per 5s.
  static const double liteMoveThresholdMeters = 50.0;
  static const Duration liteThrottleDuration = Duration(seconds: 5);

  /// Native channel to check if the platform has configured a real API key (not placeholder).
  static const MethodChannel _channel = MethodChannel('com.hired.driver_app/trip_mini_overlay');
  static bool? _cachedIsKeyValid;

  /// Checks whether a real Maps API key is configured on the host platform.
  /// If running in test or if the key is still the placeholder, returns false.
  static Future<bool> isKeyConfigured() async {
    if (kIsWeb) return false;
    if (_cachedIsKeyValid != null) return _cachedIsKeyValid!;

    try {
      final res = await _channel.invokeMethod<bool>('checkMapsApiKeyValid');
      _cachedIsKeyValid = res ?? false;
      return _cachedIsKeyValid!;
    } catch (_) {
      // In tests or if channel is unavailable
      _cachedIsKeyValid = false;
      return false;
    }
  }

  /// Reset cache for test suites
  @visibleForTesting
  static void setMockKeyConfigured(bool? value) {
    _cachedIsKeyValid = value;
  }

  /// Dark mode map style JSON for Google Maps
  static const String darkMapStyle = '''
  [
    {"elementType": "geometry", "stylers": [{"color": "#1f1d2b"}]},
    {"elementType": "labels.icon", "stylers": [{"visibility": "off"}]},
    {"elementType": "labels.text.fill", "stylers": [{"color": "#94a3b8"}]},
    {"elementType": "labels.text.stroke", "stylers": [{"color": "#0f172a"}]},
    {"featureType": "administrative", "elementType": "geometry", "stylers": [{"color": "#334155"}]},
    {"featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{"color": "#cbd5e1"}]},
    {"featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{"color": "#e2e8f0"}]},
    {"featureType": "poi", "elementType": "labels.text.fill", "stylers": [{"color": "#64748b"}]},
    {"featureType": "poi.park", "elementType": "geometry", "stylers": [{"color": "#132320"}]},
    {"featureType": "road", "elementType": "geometry.fill", "stylers": [{"color": "#2a2839"}]},
    {"featureType": "road", "elementType": "labels.text.fill", "stylers": [{"color": "#94a3b8"}]},
    {"featureType": "road.arterial", "elementType": "geometry", "stylers": [{"color": "#363348"}]},
    {"featureType": "road.highway", "elementType": "geometry", "stylers": [{"color": "#4a4563"}]},
    {"featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{"color": "#5b557b"}]},
    {"featureType": "water", "elementType": "geometry", "stylers": [{"color": "#090d16"}]},
    {"featureType": "water", "elementType": "labels.text.fill", "stylers": [{"color": "#475569"}]}
  ]
  ''';
}
