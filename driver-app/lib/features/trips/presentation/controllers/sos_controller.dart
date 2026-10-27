import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/auth_interceptor.dart';
import '../../data/sos_service.dart';
import '../../domain/sos_model.dart';

final sosServiceProvider = Provider<SosService>((ref) {
  final dio = ref.watch(dioProvider);
  return SosService(dio);
});

class SosState {
  final TripSosAlertModel? activeAlert;
  final bool isLoading;
  final String? retryMessage;
  final String? errorMessage;

  const SosState({
    this.activeAlert,
    this.isLoading = false,
    this.retryMessage,
    this.errorMessage,
  });

  bool get hasActiveSos => activeAlert != null && activeAlert!.isActive;

  SosState copyWith({
    TripSosAlertModel? activeAlert,
    bool clearActiveAlert = false,
    bool? isLoading,
    String? retryMessage,
    bool clearRetryMessage = false,
    String? errorMessage,
    bool clearErrorMessage = false,
  }) {
    return SosState(
      activeAlert: clearActiveAlert ? null : (activeAlert ?? this.activeAlert),
      isLoading: isLoading ?? this.isLoading,
      retryMessage: clearRetryMessage ? null : (retryMessage ?? this.retryMessage),
      errorMessage: clearErrorMessage ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class SosNotifier extends StateNotifier<SosState> {
  final SosService _service;
  Timer? _statusPollTimer;
  Timer? _locationPingTimer;
  String? _currentTripId;

  SosNotifier(this._service) : super(const SosState());

  /// Check whether an active SOS alert already exists for this trip
  Future<TripSosAlertModel?> checkActiveSos(String tripId) async {
    _currentTripId = tripId;
    try {
      final alert = await _service.getActiveSos(tripId);
      if (alert != null) {
        state = state.copyWith(activeAlert: alert, clearErrorMessage: true);
        if (alert.isActive) {
          _startTimers(tripId, alert.alertId);
        } else {
          _stopTimers();
        }
      } else {
        state = state.copyWith(clearActiveAlert: true);
        _stopTimers();
      }
      return alert;
    } catch (e) {
      return null;
    }
  }

  /// Send a new SOS alert
  Future<TripSosAlertModel?> sendSos({
    required String tripId,
    required String reason,
    String? notes,
  }) async {
    _currentTripId = tripId;
    state = state.copyWith(isLoading: true, clearErrorMessage: true, clearRetryMessage: true);

    try {
      // 1. Get GPS coordinates with 5s timeout & fallback
      final position = await SosService.getCurrentLocation();
      final lat = position?.latitude ?? 9.9816; // Fallback to Kerala Kochi HQ default if unavailable
      final lng = position?.longitude ?? 76.2999;

      // 2. Call backend with auto-retry
      final alert = await _service.sendSos(
        tripId: tripId,
        reason: reason,
        latitude: lat,
        longitude: lng,
        notes: notes,
        onRetry: (retryMsg) {
          state = state.copyWith(retryMessage: retryMsg);
        },
      );

      state = state.copyWith(
        activeAlert: alert,
        isLoading: false,
        clearRetryMessage: true,
      );

      // 3. Start live status polling and location pings
      _startTimers(tripId, alert.alertId);
      return alert;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        clearRetryMessage: true,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      );
      return null;
    }
  }

  /// Cancel active SOS alert as false alarm
  Future<bool> cancelSos(int alertId) async {
    state = state.copyWith(isLoading: true, clearErrorMessage: true);
    try {
      final resolvedAlert = await _service.cancelSos(alertId);
      state = state.copyWith(
        activeAlert: resolvedAlert,
        isLoading: false,
      );
      _stopTimers();
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }

  /// Manual or external update of alert
  void setAlert(TripSosAlertModel? alert) {
    state = state.copyWith(activeAlert: alert);
    if (alert != null && alert.isActive && _currentTripId != null) {
      _startTimers(_currentTripId!, alert.alertId);
    } else {
      _stopTimers();
    }
  }

  void _startTimers(String tripId, int alertId) {
    _stopTimers();

    // 1. Poll status every 5 seconds
    _statusPollTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      final updated = await _service.getActiveSos(tripId);
      if (updated != null) {
        state = state.copyWith(activeAlert: updated);
        if (updated.isResolved) {
          _stopTimers();
        }
      }
    });

    // 2. Send live location ping every 15 seconds
    _locationPingTimer = Timer.periodic(const Duration(seconds: 15), (_) async {
      if (state.activeAlert != null && state.activeAlert!.isActive) {
        final position = await SosService.getCurrentLocation();
        if (position != null) {
          final refreshed = await _service.updateLocation(
            alertId: alertId,
            latitude: position.latitude,
            longitude: position.longitude,
          );
          if (refreshed != null) {
            state = state.copyWith(activeAlert: refreshed);
          }
        }
      }
    });
  }

  void _stopTimers() {
    _statusPollTimer?.cancel();
    _statusPollTimer = null;
    _locationPingTimer?.cancel();
    _locationPingTimer = null;
  }

  @override
  void dispose() {
    _stopTimers();
    super.dispose();
  }
}

final sosControllerProvider = StateNotifierProvider<SosNotifier, SosState>((ref) {
  final service = ref.watch(sosServiceProvider);
  return SosNotifier(service);
});
