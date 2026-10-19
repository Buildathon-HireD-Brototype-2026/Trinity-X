import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

/// State model representing the device location status and coordinates.
class DriverLocationState {
  final LatLng? currentLatLng;
  final double? accuracy;
  final double? heading;
  final double? speed;
  final bool isGpsEnabled;
  final LocationPermission permission;
  final bool isLoading;
  final String? errorMessage;
  final DateTime? timestamp;

  const DriverLocationState({
    this.currentLatLng,
    this.accuracy,
    this.heading,
    this.speed,
    this.isGpsEnabled = true,
    this.permission = LocationPermission.denied,
    this.isLoading = true,
    this.errorMessage,
    this.timestamp,
  });

  bool get hasLocation => currentLatLng != null;
  bool get hasPermission =>
      permission == LocationPermission.always ||
      permission == LocationPermission.whileInUse;

  DriverLocationState copyWith({
    LatLng? currentLatLng,
    double? accuracy,
    double? heading,
    double? speed,
    bool? isGpsEnabled,
    LocationPermission? permission,
    bool? isLoading,
    String? errorMessage,
    DateTime? timestamp,
  }) {
    return DriverLocationState(
      currentLatLng: currentLatLng ?? this.currentLatLng,
      accuracy: accuracy ?? this.accuracy,
      heading: heading ?? this.heading,
      speed: speed ?? this.speed,
      isGpsEnabled: isGpsEnabled ?? this.isGpsEnabled,
      permission: permission ?? this.permission,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      timestamp: timestamp ?? this.timestamp,
    );
  }
}

/// Centralized driver location manager that manages the single GPS stream for both
/// the UI map and background location tracking.
class DriverLocationNotifier extends StateNotifier<DriverLocationState> {
  StreamSubscription<Position>? _positionSubscription;
  StreamSubscription<ServiceStatus>? _serviceStatusSubscription;

  DriverLocationNotifier() : super(const DriverLocationState()) {
    _init();
  }

  Future<void> _init() async {
    await checkAndRequestPermissions();
  }

  /// Request permissions and start the single GPS stream if granted.
  Future<void> checkAndRequestPermissions() async {
    try {
      final isServiceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!isServiceEnabled) {
        state = state.copyWith(
          isGpsEnabled: false,
          isLoading: false,
          errorMessage: 'Location services are disabled on your device.',
        );
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied) {
        state = state.copyWith(
          permission: permission,
          isLoading: false,
          errorMessage: 'Location permission was denied.',
        );
        return;
      }

      if (permission == LocationPermission.deniedForever) {
        state = state.copyWith(
          permission: permission,
          isLoading: false,
          errorMessage:
              'Location permission permanently denied. Please enable in Settings.',
        );
        return;
      }

      state = state.copyWith(
        permission: permission,
        isGpsEnabled: isServiceEnabled,
      );

      // Attempt to immediately seed with last known position to prevent empty map wait
      try {
        final lastKnown = await Geolocator.getLastKnownPosition();
        if (lastKnown != null && mounted) {
          state = state.copyWith(
            currentLatLng: LatLng(lastKnown.latitude, lastKnown.longitude),
            accuracy: lastKnown.accuracy,
            heading: lastKnown.heading,
            speed: lastKnown.speed,
            isLoading: false,
            timestamp: lastKnown.timestamp,
          );
        }
      } catch (e) {
        debugPrint('[DriverLocation] Last known position check error: $e');
      }

      // Start the single shared hardware GPS stream
      _startPositionStream();
      _monitorServiceStatus();
    } catch (e) {
      debugPrint('[DriverLocation] Error in checkAndRequestPermissions: $e');
      if (mounted) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Failed to initialize location: $e',
        );
      }
    }
  }

  void _startPositionStream() {
    _positionSubscription?.cancel();

    // Android & iOS location settings: high accuracy with 5-meter movement filter
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5,
    );

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen(
      (Position position) {
        if (!mounted) return;
        state = state.copyWith(
          currentLatLng: LatLng(position.latitude, position.longitude),
          accuracy: position.accuracy,
          heading: position.heading,
          speed: position.speed,
          isLoading: false,
          isGpsEnabled: true,
          errorMessage: null,
          timestamp: position.timestamp,
        );
      },
      onError: (dynamic error) {
        debugPrint('[DriverLocation] Position stream error: $error');
        if (!mounted) return;
        state = state.copyWith(
          errorMessage: 'GPS stream error: $error',
        );
      },
    );
  }

  void _monitorServiceStatus() {
    _serviceStatusSubscription?.cancel();
    _serviceStatusSubscription = Geolocator.getServiceStatusStream().listen(
      (ServiceStatus status) {
        final isEnabled = status == ServiceStatus.enabled;
        if (!mounted) return;
        state = state.copyWith(
          isGpsEnabled: isEnabled,
          errorMessage: isEnabled ? null : 'GPS has been turned off.',
        );
        if (isEnabled && state.hasPermission) {
          _startPositionStream();
        }
      },
    );
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _serviceStatusSubscription?.cancel();
    super.dispose();
  }
}

/// Single global provider for driver location updates across the application.
final driverLocationProvider =
    StateNotifierProvider<DriverLocationNotifier, DriverLocationState>((ref) {
  return DriverLocationNotifier();
});
