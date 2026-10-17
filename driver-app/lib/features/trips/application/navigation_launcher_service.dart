import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/storage/local_cache_service.dart';
import '../domain/trip_model.dart';
import '../presentation/controllers/trip_mini_overlay_controller.dart';

enum MapsAppType {
  googleMaps,
  waze,
  appleMaps,
  browser,
}

class MapsAppOption {
  final MapsAppType type;
  final String title;
  final IconData icon;

  const MapsAppOption({
    required this.type,
    required this.title,
    required this.icon,
  });
}

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

  static const _keyPreferredApp = 'preferred_maps_navigation_app';
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

  /// Stored preferred maps app type, if chosen previously by the driver.
  MapsAppType? getPreferredApp() {
    final raw = _prefs.getString(_keyPreferredApp);
    if (raw == null) return null;
    return MapsAppType.values.where((e) => e.name == raw).firstOrNull;
  }

  Future<void> setPreferredApp(MapsAppType type) async {
    await _prefs.setString(_keyPreferredApp, type.name);
  }

  /// Detects installed maps apps using their URL schemes.
  Future<List<MapsAppOption>> getInstalledMapsApps() async {
    final list = <MapsAppOption>[];

    // 1. Google Maps
    final googleMapsUri = Platform.isIOS
        ? Uri.parse('comgooglemaps://')
        : Uri.parse('google.navigation:q=0,0&mode=d');
    try {
      if (await canLaunchUrl(googleMapsUri)) {
        list.add(const MapsAppOption(
          type: MapsAppType.googleMaps,
          title: 'Google Maps',
          icon: Icons.map_rounded,
        ));
      }
    } catch (_) {}

    // 2. Waze
    final wazeUri = Uri.parse('waze://?ll=0,0&navigate=yes');
    try {
      if (await canLaunchUrl(wazeUri)) {
        list.add(const MapsAppOption(
          type: MapsAppType.waze,
          title: 'Waze',
          icon: Icons.navigation_rounded,
        ));
      }
    } catch (_) {}

    // 3. Apple Maps (iOS only)
    if (Platform.isIOS) {
      final appleMapsUri = Uri.parse('maps://?daddr=0,0&dirflg=d');
      try {
        if (await canLaunchUrl(appleMapsUri)) {
          list.add(const MapsAppOption(
            type: MapsAppType.appleMaps,
            title: 'Apple Maps',
            icon: Icons.explore_rounded,
          ));
        }
      } catch (_) {}
    }

    return list;
  }

  /// Builds the launch URI for the given map app type and target lat/lng.
  Uri buildLaunchUri({
    required MapsAppType type,
    required double lat,
    required double lng,
  }) {
    switch (type) {
      case MapsAppType.googleMaps:
        if (Platform.isIOS) {
          return Uri.parse('comgooglemaps://?daddr=$lat,$lng&directionsmode=driving');
        }
        return Uri.parse('google.navigation:q=$lat,$lng&mode=d');

      case MapsAppType.waze:
        return Uri.parse('waze://?ll=$lat,$lng&navigate=yes');

      case MapsAppType.appleMaps:
        return Uri.parse('maps://?daddr=$lat,$lng&dirflg=d');

      case MapsAppType.browser:
        return Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving');
    }
  }

  /// Browser fallback URI for directions
  Uri getBrowserFallbackUri(double lat, double lng) {
    return Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving');
  }

  /// Launches navigation to the target coordinates using the driver's chosen or specified app.
  /// Debounces rapid taps so only one launch happens.
  Future<bool> launchNavigation({
    required double lat,
    required double lng,
    MapsAppType? appType,
  }) async {
    final now = DateTime.now();
    if (_lastLaunchTime != null && now.difference(_lastLaunchTime!) < _debounceDuration) {
      return false;
    }
    _lastLaunchTime = now;

    var targetType = appType ?? getPreferredApp();

    if (targetType == null) {
      final installed = await getInstalledMapsApps();
      if (installed.isEmpty) {
        targetType = MapsAppType.browser;
      } else {
        targetType = installed.first.type;
      }
    }

    final uri = buildLaunchUri(type: targetType, lat: lat, lng: lng);

    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (launched) return true;
    } catch (e) {
      debugPrint('[NavigationLauncherService] Failed to launch $uri: $e');
    }

    // Fallback: browser URL
    try {
      final fallbackUri = getBrowserFallbackUri(lat, lng);
      return await launchUrl(fallbackUri, mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint('[NavigationLauncherService] Fallback browser launch failed: $e');
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
  /// - If driver has not chosen an app, uses Google Maps if installed, else first installed app, else skips silently.
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

    // Determine target app
    final preferred = getPreferredApp();
    MapsAppType? targetApp = preferred;

    if (targetApp == null) {
      final installed = await getInstalledMapsApps();
      if (installed.isEmpty) {
        // Skips silently if no maps app installed (no sheet, no error)
        return;
      }
      final hasGoogleMaps = installed.any((e) => e.type == MapsAppType.googleMaps);
      targetApp = hasGoogleMaps ? MapsAppType.googleMaps : installed.first.type;
    }

    await launchNavigation(
      lat: trip.dropoffLat!,
      lng: trip.dropoffLng!,
      appType: targetApp,
    );
  }
}
