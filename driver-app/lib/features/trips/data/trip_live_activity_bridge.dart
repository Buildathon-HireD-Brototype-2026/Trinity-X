import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import '../domain/trip_model.dart';

/// Platform bridge for iOS ActivityKit Live Activities & Dynamic Island support
/// (compact, expanded leading/trailing, minimal, and Lock Screen views).
class TripLiveActivityBridge {
  static const MethodChannel _channel =
      MethodChannel('com.hired.driver_app/trip_live_activity');

  /// Starts a Live Activity on iOS 16.1+ Lock Screen and Dynamic Island.
  static Future<bool> startLiveActivity({
    required TripModel trip,
    required int etaMinutes,
  }) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      return false;
    }
    try {
      final res = await _channel.invokeMethod<bool>('startLiveActivity', {
        'trip_id': trip.tripId,
        'status': trip.status,
        'destination_short': trip.dropoffSpot.split(',').first.trim(),
        'pickup_short': trip.pickupSpot.split(',').first.trim(),
        'eta_mins': etaMinutes,
        'passenger_name': trip.contactName,
      });
      return res ?? false;
    } catch (e) {
      debugPrint('[TripLiveActivityBridge] startLiveActivity error: $e');
      return false;
    }
  }

  /// Updates live attributes (ETA, status) on Dynamic Island and Lock Screen widget.
  static Future<bool> updateLiveActivity({
    required TripModel trip,
    required int etaMinutes,
  }) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      return false;
    }
    try {
      final res = await _channel.invokeMethod<bool>('updateLiveActivity', {
        'trip_id': trip.tripId,
        'status': trip.status,
        'eta_mins': etaMinutes,
      });
      return res ?? false;
    } catch (e) {
      debugPrint('[TripLiveActivityBridge] updateLiveActivity error: $e');
      return false;
    }
  }

  /// Ends the Live Activity when trip completes or is cancelled.
  static Future<bool> endLiveActivity({required String tripId}) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      return false;
    }
    try {
      final res = await _channel.invokeMethod<bool>('endLiveActivity', {
        'trip_id': tripId,
      });
      return res ?? false;
    } catch (e) {
      debugPrint('[TripLiveActivityBridge] endLiveActivity error: $e');
      return false;
    }
  }
}
