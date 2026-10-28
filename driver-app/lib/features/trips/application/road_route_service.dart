import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

final roadRouteServiceProvider = Provider<RoadRouteService>((ref) {
  return RoadRouteService();
});

/// Service responsible for fetching real road-following routes (polylines)
/// between the driver's location and the stage target (Pickup or Dropoff).
class RoadRouteService {
  final Dio _dio;

  RoadRouteService({Dio? dio}) : _dio = dio ?? Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
    ),
  );

  LatLng? _lastOrigin;
  LatLng? _lastDestination;
  List<LatLng>? _cachedRoute;

  /// Retrieves a road-following polyline connecting [origin] and [destination].
  /// Refreshes only when driver has moved >= [minDistanceMeters] (default 100m)
  /// or destination has changed.
  Future<List<LatLng>?> getRoadRoute({
    required LatLng origin,
    required LatLng destination,
    double minDistanceMeters = 100.0,
    bool forceRefresh = false,
  }) async {
    // 1. Check if cached route is still valid (< 100m movement & same destination)
    if (!forceRefresh && _cachedRoute != null && _lastOrigin != null && _lastDestination != null) {
      final destSame = (_lastDestination!.latitude - destination.latitude).abs() < 0.0001 &&
          (_lastDestination!.longitude - destination.longitude).abs() < 0.0001;
      const distanceCalc = Distance();
      final originMovedMeters = distanceCalc(origin, _lastOrigin!);

      if (destSame && originMovedMeters < minDistanceMeters) {
        return _cachedRoute;
      }
    }

    List<LatLng>? roadPoints;

    // 2. Attempt Google Directions API if an API key is configured
    final googleApiKey = dotenv.env['MAPS_API_KEY'] ??
        dotenv.env['GOOGLE_MAPS_API_KEY'] ??
        const String.fromEnvironment('MAPS_API_KEY');

    if (googleApiKey.isNotEmpty && !googleApiKey.contains('YOUR_')) {
      try {
        final googleUrl = 'https://maps.googleapis.com/maps/api/directions/json';
        final res = await _dio.get(googleUrl, queryParameters: {
          'origin': '${origin.latitude},${origin.longitude}',
          'destination': '${destination.latitude},${destination.longitude}',
          'mode': 'driving',
          'key': googleApiKey,
        });

        if (res.statusCode == 200 && res.data is Map) {
          final data = res.data as Map;
          final status = data['status']?.toString();
          if (status == 'OK') {
            final routes = data['routes'] as List?;
            if (routes != null && routes.isNotEmpty) {
              final polyStr = routes[0]['overview_polyline']?['points']?.toString();
              if (polyStr != null && polyStr.isNotEmpty) {
                roadPoints = decodePolyline(polyStr);
              }
            }
          }
        }
      } catch (e) {
        debugPrint('[RoadRouteService] Google Directions API attempt failed: $e');
      }
    }

    // 3. Fallback to Open Source Routing Machine (OSRM) if Google API key not set or failed
    if (roadPoints == null || roadPoints.isEmpty) {
      try {
        final osrmUrl =
            'https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=polyline';
        final res = await _dio.get(osrmUrl);

        if (res.statusCode == 200) {
          final data = res.data is String ? jsonDecode(res.data) : res.data;
          if (data is Map && data['code'] == 'Ok') {
            final routes = data['routes'] as List?;
            if (routes != null && routes.isNotEmpty) {
              final geometry = routes[0]['geometry']?.toString();
              if (geometry != null && geometry.isNotEmpty) {
                roadPoints = decodePolyline(geometry);
              }
            }
          }
        }
      } catch (e) {
        debugPrint('[RoadRouteService] OSRM Road Route attempt failed: $e');
      }
    }

    // 4. Update cache if road route obtained
    if (roadPoints != null && roadPoints.isNotEmpty) {
      _lastOrigin = origin;
      _lastDestination = destination;
      _cachedRoute = roadPoints;
      return roadPoints;
    }

    // Never fall back to a straight line when road route fails
    return null;
  }

  /// Decodes standard Google / OSRM encoded polyline format into LatLng points.
  static List<LatLng> decodePolyline(String encoded) {
    final poly = <LatLng>[];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.add(LatLng(lat / 1E5, lng / 1E5));
    }
    return poly;
  }

  void clearCache() {
    _lastOrigin = null;
    _lastDestination = null;
    _cachedRoute = null;
  }
}
