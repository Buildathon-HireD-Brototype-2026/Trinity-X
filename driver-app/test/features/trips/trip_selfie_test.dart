import 'package:flutter_test/flutter_test.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import 'package:driver_app/features/trips/data/trip_repository.dart';

void main() {
  group('TripModel Selfie Serialization Tests', () {
    test('TripModel parses startSelfieUrl and hasSelfie correctly from JSON', () {
      final json = {
        'trip_id': '101',
        'order_id': 202,
        'status': 'ASSIGNED',
        'pickup_spot': 'Kochi Airport',
        'dropoff_spot': 'Infopark',
        'pickup_time': DateTime.now().toUtc().toIso8601String(),
        'start_selfie_url': 'https://res.cloudinary.com/demo/image/upload/trip-101.jpg',
        'has_selfie': true,
        'start_selfie_uploaded_at': '2026-10-28T10:00:00.000Z',
        'start_selfie_expires_at': '2026-10-29T10:00:00.000Z',
      };

      final trip = TripModel.fromJson(json);
      expect(trip.tripId, '101');
      expect(trip.hasSelfie, true);
      expect(trip.startSelfieUrl, 'https://res.cloudinary.com/demo/image/upload/trip-101.jpg');
      expect(trip.startSelfieUploadedAt, DateTime.parse('2026-10-28T10:00:00.000Z'));
      expect(trip.startSelfieExpiresAt, DateTime.parse('2026-10-29T10:00:00.000Z'));
    });

    test('TripModel fallback to selfie_url or selfieURL when start_selfie_url is missing', () {
      final json = {
        'trip_id': '102',
        'order_id': 203,
        'status': 'ASSIGNED',
        'pickup_spot': 'Marine Drive',
        'dropoff_spot': 'Kaloor',
        'pickup_time': DateTime.now().toUtc().toIso8601String(),
        'selfie_url': 'https://res.cloudinary.com/demo/image/upload/legacy-selfie.jpg',
      };

      final trip = TripModel.fromJson(json);
      expect(trip.startSelfieUrl, 'https://res.cloudinary.com/demo/image/upload/legacy-selfie.jpg');
      expect(trip.hasSelfie, true);
    });

    test('TripModel toJson includes start_selfie_url and has_selfie', () {
      final trip = TripModel(
        tripId: '103',
        status: 'ASSIGNED',
        pickupSpot: 'MG Road',
        pickupTime: DateTime.now().toUtc(),
        startSelfieUrl: 'https://res.cloudinary.com/test.jpg',
        hasSelfie: true,
      );

      final json = trip.toJson();
      expect(json['start_selfie_url'], 'https://res.cloudinary.com/test.jpg');
      expect(json['has_selfie'], true);
    });
  });

  group('MockTripRepository Selfie Tests', () {
    test('uploadStartSelfie updates mock trip with selfie metadata', () async {
      final repo = MockTripRepository();
      final trips = await repo.getTrips();
      final targetTripId = trips.first.tripId;

      final url = await repo.uploadStartSelfie(targetTripId, '/path/to/selfie.jpg');
      expect(url, isNotNull);
      expect(url, contains('trip-selfies'));

      final updatedTrip = await repo.getTripDetails(targetTripId);
      expect(updatedTrip.hasSelfie, true);
      expect(updatedTrip.startSelfieUrl, equals(url));
    });
  });
}
