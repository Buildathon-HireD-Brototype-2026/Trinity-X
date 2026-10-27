import 'package:flutter_test/flutter_test.dart';
import 'package:driver_app/features/trips/domain/sos_model.dart';
import 'package:driver_app/features/trips/presentation/controllers/sos_controller.dart';

void main() {
  group('TripSosAlertModel Tests', () {
    test('Correctly deserializes from JSON with string and numeric IDs', () {
      final json = {
        'alertId': 101,
        'tripId': 8420,
        'driverId': 2,
        'orderId': 1041,
        'reason': 'VEHICLE_DAMAGE',
        'notes': 'Engine overheating on NH-66',
        'latitude': 9.9816,
        'longitude': 76.2999,
        'status': 'OPEN',
        'primaryAdminId': 1,
        'claimedByAdminId': null,
        'claimedByAdminName': null,
        'claimedAt': null,
        'resolvedAt': null,
        'resolutionNotes': null,
        'createdAt': '2026-10-27T18:00:00.000Z',
        'updatedAt': '2026-10-27T18:00:00.000Z',
        'driverName': 'Arjun Menon',
        'driverPhone': '+919000000002',
        'companyName': 'Apex Logistics Ltd.',
      };

      final model = TripSosAlertModel.fromJson(json);

      expect(model.alertId, 101);
      expect(model.tripId, 8420);
      expect(model.driverId, 2);
      expect(model.reason, 'VEHICLE_DAMAGE');
      expect(model.reasonDisplay, 'Vehicle Breakdown / Damage');
      expect(model.reasonEmoji, '🚗');
      expect(model.isOpen, true);
      expect(model.isActive, true);
      expect(model.isResolved, false);
      expect(model.latitude, 9.9816);
      expect(model.longitude, 76.2999);
    });

    test('Correctly identifies IN_PROGRESS and RESOLVED states', () {
      const inProgressAlert = TripSosAlertModel(
        alertId: 102,
        tripId: 8420,
        driverId: 2,
        orderId: 1041,
        reason: 'MEDICAL_EMERGENCY',
        latitude: 9.9816,
        longitude: 76.2999,
        status: 'IN_PROGRESS',
        claimedByAdminName: 'Savio',
      );

      expect(inProgressAlert.reasonDisplay, 'Medical / Personal Safety');
      expect(inProgressAlert.reasonEmoji, '🚨');
      expect(inProgressAlert.isOpen, false);
      expect(inProgressAlert.isInProgress, true);
      expect(inProgressAlert.isActive, true);
      expect(inProgressAlert.isResolved, false);

      final resolvedAlert = inProgressAlert.copyWith(
        status: 'RESOLVED',
        resolutionNotes: 'Medical assistance provided',
      );

      expect(resolvedAlert.isOpen, false);
      expect(resolvedAlert.isInProgress, false);
      expect(resolvedAlert.isActive, false);
      expect(resolvedAlert.isResolved, true);
      expect(resolvedAlert.resolutionNotes, 'Medical assistance provided');
    });

    test('SosState correctly evaluates hasActiveSos', () {
      const emptyState = SosState();
      expect(emptyState.hasActiveSos, false);

      const activeState = SosState(
        activeAlert: TripSosAlertModel(
          alertId: 103,
          tripId: 8420,
          driverId: 2,
          orderId: 1041,
          reason: 'VEHICLE_DAMAGE',
          latitude: 9.9816,
          longitude: 76.2999,
          status: 'OPEN',
        ),
      );
      expect(activeState.hasActiveSos, true);
    });
  });
}
