import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../domain/sos_model.dart';

class SosService {
  final Dio _dio;

  SosService(this._dio);

  /// Acquire the driver's current GPS position with 5-second timeout and fallback
  static Future<Position?> getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('[SosService] Location services are disabled. Falling back to last known.');
        return await Geolocator.getLastKnownPosition();
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('[SosService] Location permission denied. Falling back to last known.');
          return await Geolocator.getLastKnownPosition();
        }
      }

      if (permission == LocationPermission.deniedForever) {
        debugPrint('[SosService] Location permission permanently denied.');
        return await Geolocator.getLastKnownPosition();
      }

      // High accuracy with strict 5-second timeout
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 5),
        ),
      );
    } catch (e) {
      debugPrint('[SosService] Error acquiring current location ($e). Trying last known position...');
      try {
        return await Geolocator.getLastKnownPosition();
      } catch (_) {
        return null;
      }
    }
  }

  /// Send SOS alert with 3 automatic retries on network error
  Future<TripSosAlertModel> sendSos({
    required String tripId,
    required String reason,
    required double latitude,
    required double longitude,
    String? notes,
    void Function(String message)? onRetry,
  }) async {
    int attempts = 0;
    const maxRetries = 3;

    while (true) {
      try {
        attempts++;
        final response = await _dio.post(
          '/driver/trips/$tripId/sos',
          data: {
            'reason': reason,
            if (notes != null && notes.isNotEmpty) 'notes': notes,
            'latitude': latitude,
            'longitude': longitude,
          },
        );

        final data = response.data;
        if (data is Map<String, dynamic> && data['data'] != null) {
          return TripSosAlertModel.fromJson(data['data'] as Map<String, dynamic>);
        } else if (data is Map<String, dynamic>) {
          return TripSosAlertModel.fromJson(data);
        }
        throw Exception('Invalid server response format.');
      } on DioException catch (dioErr) {
        // If it's a 4xx validation or client error (not network error), don't retry blindly
        final statusCode = dioErr.response?.statusCode;
        final isNetworkError = dioErr.type == DioExceptionType.connectionTimeout ||
            dioErr.type == DioExceptionType.sendTimeout ||
            dioErr.type == DioExceptionType.receiveTimeout ||
            dioErr.type == DioExceptionType.connectionError ||
            statusCode == 502 ||
            statusCode == 503 ||
            statusCode == 504;

        if (isNetworkError && attempts <= maxRetries) {
          final message = 'Retrying... ($attempts/$maxRetries)';
          debugPrint('[SosService] Network error during SOS send: $dioErr. $message');
          onRetry?.call(message);
          await Future.delayed(Duration(milliseconds: 1000 * attempts));
          continue;
        }

        final errorMsg = dioErr.response?.data?['error']?['message'] ??
            dioErr.response?.data?['message'] ??
            dioErr.message ??
            'Failed to send SOS.';
        throw Exception(errorMsg);
      } catch (e) {
        if (attempts <= maxRetries) {
          final message = 'Retrying... ($attempts/$maxRetries)';
          debugPrint('[SosService] Unexpected error sending SOS: $e. $message');
          onRetry?.call(message);
          await Future.delayed(Duration(milliseconds: 1000 * attempts));
          continue;
        }
        throw Exception(e.toString());
      }
    }
  }

  /// Get active SOS alert for a trip (or null if none)
  Future<TripSosAlertModel?> getActiveSos(String tripId) async {
    try {
      final response = await _dio.get('/driver/trips/$tripId/sos/active');
      final data = response.data;

      if (data is Map<String, dynamic>) {
        final alertData = data['data']?['alert'] ?? data['alert'];
        if (alertData != null && alertData is Map<String, dynamic>) {
          return TripSosAlertModel.fromJson(alertData);
        }
      }
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      debugPrint('[SosService] Failed to fetch active SOS: ${e.message}');
      return null;
    } catch (e) {
      debugPrint('[SosService] Unexpected error fetching active SOS: $e');
      return null;
    }
  }

  /// Update live location for an active SOS alert
  Future<TripSosAlertModel?> updateLocation({
    required int alertId,
    required double latitude,
    required double longitude,
  }) async {
    try {
      final response = await _dio.patch(
        '/driver/sos/$alertId/location',
        data: {
          'latitude': latitude,
          'longitude': longitude,
        },
      );
      final data = response.data;
      if (data is Map<String, dynamic> && data['data'] != null) {
        return TripSosAlertModel.fromJson(data['data'] as Map<String, dynamic>);
      }
      return null;
    } catch (e) {
      debugPrint('[SosService] Failed to update SOS location ping: $e');
      return null;
    }
  }

  /// Cancel SOS alert as false alarm
  Future<TripSosAlertModel> cancelSos(int alertId) async {
    try {
      final response = await _dio.patch('/driver/sos/$alertId/cancel');
      final data = response.data;
      if (data is Map<String, dynamic> && data['data'] != null) {
        return TripSosAlertModel.fromJson(data['data'] as Map<String, dynamic>);
      } else if (data is Map<String, dynamic>) {
        return TripSosAlertModel.fromJson(data);
      }
      throw Exception('Invalid cancel response');
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] ??
          e.response?.data?['message'] ??
          e.message ??
          'Failed to cancel SOS.';
      throw Exception(msg);
    }
  }
}
