import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/auth_interceptor.dart';
import '../storage/local_cache_service.dart';
import 'driver_location_provider.dart';

/// Service managing real-time GPS pings to POST /driver/location,
/// 3-second throttling, and local offline queue sync via POST /driver/locations/batch.
class LocationTrackingService {
  final Dio _dio;
  final SharedPreferences _prefs;
  DateTime? _lastPingTime;
  bool _isSyncingBatch = false;

  static const String _queueKey = 'offline_location_pings_queue';
  static const Duration _minPingInterval = Duration(seconds: 3);

  LocationTrackingService(this._dio, this._prefs);

  /// Send live location ping or queue locally if offline
  Future<void> onLocationUpdate(DriverLocationState location) async {
    final latLng = location.currentLatLng;
    if (latLng == null) return;

    final now = DateTime.now();
    if (_lastPingTime != null && now.difference(_lastPingTime!) < _minPingInterval) {
      return; // Respect 3-second throttle
    }
    _lastPingTime = now;

    final payload = {
      'latitude': latLng.latitude,
      'longitude': latLng.longitude,
      'speed': location.speed ?? 0.0,
      'heading': location.heading ?? 0.0,
      'accuracy': location.accuracy ?? 10.0,
      'timestamp': (location.timestamp ?? now).toIso8601String(),
    };

    try {
      // 1. If we have pending offline pings, attempt batch flush first
      await _flushOfflineQueueIfAny();

      // 2. Send live single ping
      await _dio.post('/driver/location', data: payload);
    } on DioException catch (e) {
      debugPrint('[LocationTracking] Ping failed (${e.type}). Queueing locally for offline sync.');
      await _enqueueOfflinePing(payload);
    } catch (e) {
      debugPrint('[LocationTracking] Unexpected error: $e');
      await _enqueueOfflinePing(payload);
    }
  }

  Future<void> _enqueueOfflinePing(Map<String, dynamic> ping) async {
    try {
      final existingJson = _prefs.getStringList(_queueKey) ?? [];
      existingJson.add(jsonEncode(ping));
      // Cap queue size at 100 to prevent unbounded local storage
      if (existingJson.length > 100) {
        existingJson.removeAt(0);
      }
      await _prefs.setStringList(_queueKey, existingJson);
    } catch (e) {
      debugPrint('[LocationTracking] Enqueue error: $e');
    }
  }

  Future<void> _flushOfflineQueueIfAny() async {
    if (_isSyncingBatch) return;
    final queue = _prefs.getStringList(_queueKey);
    if (queue == null || queue.isEmpty) return;

    _isSyncingBatch = true;
    try {
      final locations = queue
          .map((item) => jsonDecode(item) as Map<String, dynamic>)
          .toList();

      await _dio.post(
        '/driver/locations/batch',
        data: {'locations': locations},
      );
      // Batch sync successful, clear queue
      await _prefs.remove(_queueKey);
      debugPrint('[LocationTracking] Successfully flushed ${locations.length} offline pings.');
    } catch (e) {
      debugPrint('[LocationTracking] Batch flush failed, keeping in queue: $e');
    } finally {
      _isSyncingBatch = false;
    }
  }
}

final locationTrackingServiceProvider = Provider<LocationTrackingService>((ref) {
  final dio = ref.watch(dioProvider);
  final prefs = ref.watch(sharedPreferencesProvider);
  return LocationTrackingService(dio, prefs);
});
