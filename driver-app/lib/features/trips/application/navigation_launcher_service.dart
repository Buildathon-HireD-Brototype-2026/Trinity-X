import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/storage/local_cache_service.dart';
import '../domain/trip_model.dart';
import '../presentation/controllers/trip_mini_overlay_controller.dart';

final navigationLauncherServiceProvider = Provider<NavigationLauncherService>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return NavigationLauncherService(ref, prefs);
});

class AutoOpenNavNotifier extends StateNotifier<bool> {
  final NavigationLauncherService _service;
  AutoOpenNavNotifier(this._service) : super(_service.isAutoOpenEnabled);

  Future<void> toggle(bool value) async {
    await _service.setAutoOpenEnabled(value);
    state = value;
  }
}

final autoOpenNavSettingProvider =
    StateNotifierProvider<AutoOpenNavNotifier, bool>((ref) {
  final service = ref.watch(navigationLauncherServiceProvider);
  return AutoOpenNavNotifier(service);
});

class NavigationLauncherService {
  final Ref _ref;
  final SharedPreferences _prefs;

  static const _keyAutoOpenNav = 'auto_open_navigation_setting';
  static const _navAutoOpenedPrefix = 'nav_auto_opened_';

  DateTime? _lastLaunchTime;
  static const _debounceDuration = Duration(milliseconds: 500);

  NavigationLauncherService(this._ref, this._prefs);

  /// Setting toggle: whether turn-by-turn navigation auto-opens when trip starts. Default ON.
  bool get isAutoOpenEnabled => _prefs.getBool(_keyAutoOpenNav) ?? true;

  Future<void> setAutoOpenEnabled(bool enabled) async {
    await _prefs.setBool(_keyAutoOpenNav, enabled);
  }

  /// Opens the platform's default turn-by-turn navigation app:
  /// - Android: Google Maps with `google.navigation:q=LAT,LNG&mode=d`
  ///   Fallback: Google Maps directions in the browser.
  /// - iOS: Apple Maps with `https://maps.apple.com/?daddr=LAT,LNG&dirflg=d`
  ///   Fallback: Google Maps directions in the browser.
  /// Debounces rapid taps so only one launch occurs.
  Future<bool> launchNavigation({
    required double lat,
    required double lng,
  }) async {
    final now = DateTime.now();
    if (_lastLaunchTime != null && now.difference(_lastLaunchTime!) < _debounceDuration) {
      return false;
    }
    _lastLaunchTime = now;

    if (!kIsWeb && Platform.isAndroid) {
      final googleMapsNavUri = Uri.parse('google.navigation:q=$lat,$lng&mode=d');
      try {
        if (await canLaunchUrl(googleMapsNavUri)) {
          final launched = await launchUrl(
            googleMapsNavUri,
            mode: LaunchMode.externalApplication,
          );
          if (launched) return true;
        }
      } catch (e) {
        debugPrint('[NavigationLauncherService] Android native launch error: $e');
      }

      // Android fallback: browser URL
      return _launchBrowserFallback(lat, lng);
    } else if (!kIsWeb && Platform.isIOS) {
      final appleMapsUri = Uri.parse('https://maps.apple.com/?daddr=$lat,$lng&dirflg=d');
      try {
        final launched = await launchUrl(
          appleMapsUri,
          mode: LaunchMode.externalApplication,
        );
        if (launched) return true;
      } catch (e) {
        debugPrint('[NavigationLauncherService] iOS Apple Maps launch error: $e');
      }

      // iOS fallback: browser URL
      return _launchBrowserFallback(lat, lng);
    } else {
      return _launchBrowserFallback(lat, lng);
    }
  }

  Future<bool> _launchBrowserFallback(double lat, double lng) async {
    final fallbackUri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving',
    );
    try {
      return await launchUrl(
        fallbackUri,
        mode: LaunchMode.externalApplication,
      );
    } catch (e) {
      debugPrint('[NavigationLauncherService] Browser fallback error: $e');
      return false;
    }
  }

  /// Guard check: whether auto-open has already fired for this specific trip id.
  bool hasAutoOpenedForTrip(String tripId) {
    return _prefs.getBool('$_navAutoOpenedPrefix$tripId') ?? false;
  }

  /// Marks that auto-open has fired for this trip id.
  Future<void> markAutoOpenedForTrip(String tripId) async {
    await _prefs.setBool('$_navAutoOpenedPrefix$tripId', true);
  }

  /// Auto-open trigger on live trip start:
  /// - Only if auto-open setting is ON
  /// - Only if app is in foreground
  /// - Only once per trip id (navAutoOpened)
  /// - Target = DESTINATION (dropoff coordinates)
  Future<void> handleTripStarted(TripModel trip) async {
    if (!isAutoOpenEnabled) return;
    if (hasAutoOpenedForTrip(trip.tripId)) return;

    // Check if coordinates exist and are valid
    if (!trip.hasValidCoordinates || trip.dropoffLat == null || trip.dropoffLng == null) {
      return;
    }

    // Check if app is in the foreground
    final overlayState = _ref.read(tripMiniOverlayControllerProvider);
    if (!overlayState.isForeground) {
      return;
    }

    // Mark as handled immediately to guard against repeats
    await markAutoOpenedForTrip(trip.tripId);

    await launchNavigation(
      lat: trip.dropoffLat!,
      lng: trip.dropoffLng!,
    );
  }
}
