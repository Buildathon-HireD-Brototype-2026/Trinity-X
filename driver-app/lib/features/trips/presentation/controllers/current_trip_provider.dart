import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/trip_repository.dart';
import '../../domain/trip_model.dart';

final tripRepositoryProvider = Provider<TripRepository>((ref) {
  return MockTripRepository();
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

/// Holds which of the 2 trips is selected (default: trip 1).
/// Both the map card and the Assigned Trip card read only this provider.
/// If the selected trip starts, closes, or is reassigned away, or the list changes,
/// it falls back to Trip 1. Never leaves the selection on a trip that no longer exists.
final selectedTripProvider = Provider<TripModel?>((ref) {
  final trips = ref.watch(assignedTripsProvider).valueOrNull ?? [];
  if (trips.isEmpty) return null;

  final selectedId = ref.watch(selectedTripIdProvider);
  if (selectedId != null) {
    final matched = trips.where((t) => t.tripId == selectedId).firstOrNull;
    if (matched != null) return matched;
  }
  return trips.first;
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
