import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../data/auth_repository.dart';
import '../../domain/driver_model.dart';

/// Provides the active driver profile.
/// Uses cache-first strategy (Zomato-like instant hydration)
/// with background auto-sync whenever database updates happen.
final driverProfileProvider =
    StateNotifierProvider<DriverProfileController, AsyncValue<DriverModel?>>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);
  final secureStorage = ref.watch(secureStorageServiceProvider);
  return DriverProfileController(authRepository, secureStorage);
});

class DriverProfileController extends StateNotifier<AsyncValue<DriverModel?>> {
  final AuthRepository _authRepository;
  final SecureStorageService _secureStorage;
  StreamSubscription<DriverModel>? _driverSubscription;

  DriverProfileController(this._authRepository, this._secureStorage)
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
    final cached = await _authRepository.getCachedDriver();
    if (cached != null) {
      state = AsyncValue.data(cached);
    }

    // 2. Read driver ID from secure storage and establish live stream
    final driverId = await _secureStorage.getDriverId();
    if (driverId != null) {
      _subscribeToDriverUpdates(driverId);
    } else if (cached == null) {
      state = const AsyncValue.data(null);
    }
  }

  void _subscribeToDriverUpdates(int driverId) {
    _driverSubscription?.cancel();
    _driverSubscription = _authRepository.watchDriver(driverId).listen(
      (driver) {
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
  Future<void> toggleDuty() async {
    final current = state.value;
    if (current == null) return;

    final newStatus = !current.isOnline;
    // Optimistic UI update
    state = AsyncValue.data(current.copyWith(isOnline: newStatus));

    try {
      final updated = await _authRepository.toggleDuty(current.id, newStatus);
      state = AsyncValue.data(updated);
    } catch (e) {
      // Revert optimistic update
      state = AsyncValue.data(current);
    }
  }

  Future<void> logout() async {
    _driverSubscription?.cancel();
    await _authRepository.logout();
    state = const AsyncValue.data(null);
  }
}
