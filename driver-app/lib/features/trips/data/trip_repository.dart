import 'dart:async';
import '../domain/trip_model.dart';

abstract class TripRepository {
  Future<List<TripModel>> getTrips();
  Stream<List<TripModel>> watchTrips();
}

class MockTripRepository implements TripRepository {
  final _controller = StreamController<List<TripModel>>.broadcast();

  // Mock initial trips in UTC (e.g. 5:00 UTC = 10:30 AM IST, 6:15 UTC = 11:45 AM IST)
  List<TripModel> _mockTrips = [
    TripModel(
      tripId: '8421',
      status: 'ASSIGNED',
      pickupSpot: 'Tech Park Gate 2, Electronic City',
      pickupTime: DateTime.utc(2026, 10, 11, 5, 0), // 10:30 AM IST
      estimatedReachMinutes: 18,
    ),
    TripModel(
      tripId: '8422',
      status: 'ASSIGNED',
      pickupSpot: 'Prestige Tech Cloud, Devanahalli',
      pickupTime: DateTime.utc(2026, 10, 11, 6, 15), // 11:45 AM IST
      estimatedReachMinutes: 35,
    ),
  ];

  MockTripRepository() {
    _controller.add(_mockTrips);
  }

  @override
  Future<List<TripModel>> getTrips() async {
    return List.unmodifiable(_mockTrips);
  }

  @override
  Stream<List<TripModel>> watchTrips() async* {
    yield List.unmodifiable(_mockTrips);
    yield* _controller.stream;
  }

  /// Updates mock trips (for testing assignment, start, closure)
  void updateTrips(List<TripModel> trips) {
    _mockTrips = trips;
    _controller.add(List.unmodifiable(_mockTrips));
  }
}
