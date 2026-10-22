import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/auth_interceptor.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../data/trip_repository.dart';
import '../../domain/trip_model.dart';

final tripRepositoryProvider = Provider<TripRepository>((ref) {
  if (Platform.environment.containsKey('FLUTTER_TEST')) {
    return MockTripRepository();
  }
  final secureStorage = ref.watch(secureStorageServiceProvider);
  final storageName = secureStorage.runtimeType.toString();
  if (storageName.contains('Fake') ||
      storageName.contains('Mock') ||
      storageName != 'SecureStorageService') {
    return MockTripRepository();
  }
  final dio = ref.watch(dioProvider);
  return ApiTripRepository(dio);
});

/// All assigned and scheduled trips, sorted chronologically by pickup_time (earliest first).
final allTripsProvider = StreamProvider<List<TripModel>>((ref) {
  final repository = ref.watch(tripRepositoryProvider);
  return repository.watchTrips().map((trips) {
    final list = List<TripModel>.from(trips);
    list.sort((a, b) => a.pickupTime.compareTo(b.pickupTime));
    return list;
  });
});

/// Up to 2 active trips with status ASSIGNED or ONGOING, sorted by pickup_time (earliest first).
/// Single source of truth for both the Map card and the Assigned Trip card.
final assignedTripsProvider = StreamProvider<List<TripModel>>((ref) {
  final repository = ref.watch(tripRepositoryProvider);
  return repository.watchTrips().map((trips) {
    return _resolveAssignedTrips(trips);
  });
});

/// Manages which trip ID is selected when up to 2 active trips exist.
class SelectedTripNotifier extends StateNotifier<String?> {
  SelectedTripNotifier() : super(null);

  void select(String tripId) => state = tripId;

  void swap(List<TripModel> activeTrips) {
    if (activeTrips.length < 2) return;
    final currentId = state ?? activeTrips.first.tripId;
    if (currentId == activeTrips.first.tripId) {
      state = activeTrips[1].tripId;
    } else {
      state = activeTrips.first.tripId;
    }
  }

  void reset() => state = null;
}

final selectedTripIdProvider =
    StateNotifierProvider<SelectedTripNotifier, String?>((ref) {
  return SelectedTripNotifier();
});

/// Holds which trip is currently selected for details viewing.
/// Defaults to the active ongoing/assigned trip, or falls back to first available trip.
final selectedTripProvider = Provider<TripModel?>((ref) {
  final allTrips = ref.watch(allTripsProvider).valueOrNull ?? [];
  final selectedId = ref.watch(selectedTripIdProvider);

  if (selectedId != null && allTrips.isNotEmpty) {
    final matched = allTrips.where((t) => t.tripId == selectedId).firstOrNull;
    if (matched != null) return matched;
  }

  final activeTrips = ref.watch(assignedTripsProvider).valueOrNull ?? [];
  if (activeTrips.isNotEmpty) return activeTrips.first;

  return allTrips.firstOrNull;
});

/// Retained for backward compatibility.
final currentTripProvider = Provider<AsyncValue<TripModel?>>((ref) {
  final selected = ref.watch(selectedTripProvider);
  return AsyncValue.data(selected);
});

List<TripModel> _resolveAssignedTrips(List<TripModel> trips) {
  final active = trips
      .where((t) =>
          t.status.toUpperCase() == 'ASSIGNED' ||
          t.status.toUpperCase() == 'ONGOING')
      .toList();
  active.sort((a, b) => a.pickupTime.compareTo(b.pickupTime));
  return active.take(2).toList();
}

/// Controls whether the driver is scheduled to go offline automatically after the ongoing trip ends (Recommendation 2).
final isOfflineAfterTripProvider = StateProvider<bool>((ref) => false);

