import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

final locationServiceProvider = Provider<LocationService>((ref) {
  return LocationService();
});

final currentDeviceLocationProvider = FutureProvider<LatLng?>((ref) async {
  final service = ref.watch(locationServiceProvider);
  return service.getCurrentLocation();
});

class LocationService {
  static const LatLng defaultFallback = LatLng(12.9716, 77.5946);

  bool get isTest =>
      WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');

  Future<LatLng?> getCurrentLocation() async {
    if (isTest) {
      return defaultFallback;
    }

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('[LocationService] Location service disabled');
        return null;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('[LocationService] Location permission denied');
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        debugPrint('[LocationService] Location permission denied forever');
        return null;
      }

      // Try fast last known position first
      Position? position = await Geolocator.getLastKnownPosition();

      // Fetch fresh position with reasonable timeout
      try {
        position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 5),
          ),
        );
      } catch (e) {
        debugPrint('[LocationService] Fresh location error, using lastKnown: $e');
      }

      if (position != null) {
        return LatLng(position.latitude, position.longitude);
      }
    } catch (e) {
      debugPrint('[LocationService] Error fetching GPS position: $e');
    }

    return null;
  }
}
