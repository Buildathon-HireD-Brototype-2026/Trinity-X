import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../../trips/presentation/controllers/trip_mini_overlay_controller.dart';
import '../../data/auth_repository.dart';
import '../../domain/driver_model.dart';

/// Provides the active driver profile.
/// Uses cache-first strategy (Zomato-like instant hydration)
/// with background auto-sync whenever database updates happen.
final driverProfileProvider =
    StateNotifierProvider<DriverProfileController, AsyncValue<DriverModel?>>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);
  final secureStorage = ref.watch(secureStorageServiceProvider);
  return DriverProfileController(ref, authRepository, secureStorage);
});

class DriverProfileController extends StateNotifier<AsyncValue<DriverModel?>> {
  final Ref _ref;
  final AuthRepository _authRepository;
  final SecureStorageService _secureStorage;
  StreamSubscription<DriverModel>? _driverSubscription;

  DriverProfileController(this._ref, this._authRepository, this._secureStorage)
      : super(const AsyncValue.loading()) {
    initProfile();
  }

  @override
  void dispose() {
    _driverSubscription?.cancel();
    super.dispose();
  }

  Future<void> initProfile() async {
    // 1. Instant Cache Hydration: Read immediately from cache so UI renders with 0 reload lag
    var cached = await _authRepository.getCachedDriver();
    if (!mounted) return;

    // Safety rule: If an ongoing trip is active, account MUST be online!
    final isOngoing = _ref.read(tripMiniOverlayControllerProvider).isTripOngoing;
    if (isOngoing && cached != null && !cached.isOnline) {
      cached = cached.copyWith(isOnline: true);
      _authRepository.toggleDuty(cached.id, true);
    }

    if (cached != null) {
      state = AsyncValue.data(cached);
    }

    // 2. Read driver ID from secure storage and establish live stream
    final driverId = await _secureStorage.getDriverId();
    if (!mounted) return;
    if (driverId != null) {
      _subscribeToDriverUpdates(driverId);
    } else if (cached == null) {
      state = const AsyncValue.data(null);
    }

    // 3. Listen to ongoing trip changes to enforce online account status
    _ref.listen<TripMiniOverlayState>(tripMiniOverlayControllerProvider, (prev, next) {
      if (next.isTripOngoing) {
        final current = state.value;
        if (current != null && !current.isOnline) {
          setOnline(true);
        }
      }
    });
  }

  void _subscribeToDriverUpdates(int driverId) {
    _driverSubscription?.cancel();
    _driverSubscription = _authRepository.watchDriver(driverId).listen(
      (driver) {
        // Safety rule: If an ongoing trip is active, account MUST be online!
        final isOngoing = _ref.read(tripMiniOverlayControllerProvider).isTripOngoing;
        if (isOngoing && !driver.isOnline) {
          driver = driver.copyWith(isOnline: true);
          _authRepository.toggleDuty(driver.id, true);
        }
        // Auto-refresh: state automatically updates when database record changes!
        state = AsyncValue.data(driver);
      },
      onError: (err, stack) {
        // If already have cached data, don't blow it away
        if (state.value == null) {
          state = AsyncValue.error(err, stack);
        }
      },
    );
  }

  /// Manually force a fresh database sync (e.g. on Pull-to-Refresh or App Resume)
  Future<void> refresh() async {
    final current = state.value;
    if (current != null) {
      try {
        final fresh = await _authRepository.fetchRemoteDriver(current.id);
        state = AsyncValue.data(fresh);
      } catch (_) {
        // Keep offline data on network failure
      }
    }
  }

  /// Toggle Online/Offline duty status
  /// Returns false if toggling offline is blocked due to an ongoing trip.
  Future<bool> toggleDuty({bool force = false}) async {
    final current = state.value;
    if (current == null) return false;

    final newStatus = !current.isOnline;

    // Safety rule: Driver cannot go offline while a trip is currently ongoing!
    if (!newStatus && !force) {
      final isTripOngoing = _ref.read(tripMiniOverlayControllerProvider).isTripOngoing;
      if (isTripOngoing) {
        return false;
      }
    }

    // Optimistic UI update
    state = AsyncValue.data(current.copyWith(isOnline: newStatus));

    try {
      final updated = await _authRepository.toggleDuty(current.id, newStatus);
      state = AsyncValue.data(updated);
      return true;
    } catch (e) {
      // Revert optimistic update
      state = AsyncValue.data(current);
      return false;
    }
  }

  /// Sets online status directly (e.g. when an ongoing trip is active)
  Future<void> setOnline(bool isOnline) async {
    final current = state.value;
    if (current == null || current.isOnline == isOnline) return;

    state = AsyncValue.data(current.copyWith(isOnline: isOnline));
    try {
      final updated = await _authRepository.toggleDuty(current.id, isOnline);
      state = AsyncValue.data(updated);
    } catch (_) {
      state = AsyncValue.data(current);
    }
  }

  Future<void> logout() async {
    _driverSubscription?.cancel();
    await _authRepository.logout();
    state = const AsyncValue.data(null);
  }
}
