import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/trip_repository.dart';
import '../../domain/trip_model.dart';

final tripRepositoryProvider = Provider<TripRepository>((ref) {
  return MockTripRepository();
});

/// Single source of truth for the driver's current trip.
/// Rule:
/// - Status ASSIGNED, or ONGOING if none is ASSIGNED.
/// - If there are several, take the one with the earliest pickup_time.
final currentTripProvider = StreamProvider<TripModel?>((ref) {
  final repository = ref.watch(tripRepositoryProvider);
  return repository.watchTrips().map((trips) {
    return _resolveCurrentTrip(trips);
  });
});

TripModel? _resolveCurrentTrip(List<TripModel> trips) {
  final assigned = trips.where((t) => t.status.toUpperCase() == 'ASSIGNED').toList();
  if (assigned.isNotEmpty) {
    assigned.sort((a, b) => a.pickupTime.compareTo(b.pickupTime));
    return assigned.first;
  }

  final ongoing = trips.where((t) => t.status.toUpperCase() == 'ONGOING').toList();
  if (ongoing.isNotEmpty) {
    ongoing.sort((a, b) => a.pickupTime.compareTo(b.pickupTime));
    return ongoing.first;
  }

  return null;
}
