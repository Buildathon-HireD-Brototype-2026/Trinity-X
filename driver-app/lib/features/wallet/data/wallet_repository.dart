import 'dart:async';
import '../../trips/data/trip_repository.dart';
import '../domain/wallet_models.dart';

abstract class WalletRepository {
  /// Watches all live trips converted into WalletTripRecord
  Stream<List<WalletTripRecord>> watchWalletTrips();

  /// Gets the historical past month settlements (read-only from backend)
  Future<List<MonthlySettlementRecord>> getPastMonths();

  /// Calculates the live wallet balance for the CURRENT MONTH only in IST
  /// Sums driver splits for completed trips in current month; expenses not subtracted.
  double calculateCurrentMonthBalance(
    List<WalletTripRecord> trips, [
    DateTime? referenceNow,
  ]);
}

class MockWalletRepository implements WalletRepository {
  final TripRepository _tripRepository;

  MockWalletRepository(this._tripRepository);

  @override
  Stream<List<WalletTripRecord>> watchWalletTrips() {
    return _tripRepository.watchTrips().map((trips) {
      return trips.map((t) => WalletTripRecord.fromTripModel(t)).toList();
    });
  }

  @override
  double calculateCurrentMonthBalance(
    List<WalletTripRecord> trips, [
    DateTime? referenceNow,
  ]) {
    final nowIST = referenceNow != null
        ? IstDateTimeHelper.toIST(referenceNow)
        : IstDateTimeHelper.nowIST();

    double total = 0.0;
    for (final trip in trips) {
      if (!trip.countsTowardBalance) continue;

      // Check if trip completed or occurred in the current IST month
      final tripIST = IstDateTimeHelper.toIST(trip.tripEndTime ?? trip.tripStartTime);
      if (tripIST.year == nowIST.year && tripIST.month == nowIST.month) {
        total += trip.driverEarning;
      }
    }
    return total;
  }

  @override
  Future<List<MonthlySettlementRecord>> getPastMonths() async {
    // Fixed historical settlement records set by admin
    return [
      MonthlySettlementRecord(
        month: 'September 2026',
        monthDate: DateTime.utc(2026, 9, 1),
        totalDriverEarning: 34250.00,
        status: SettlementStatus.paid,
        paidAmount: 34250.00,
        paidDate: DateTime.utc(2026, 10, 5, 11, 30),
        trips: [
          WalletTripRecord(
            tripId: '8390',
            orderId: 1022,
            tripStartTime: DateTime.utc(2026, 9, 29, 9, 30),
            tripEndTime: DateTime.utc(2026, 9, 29, 11, 15),
            driverEarning: 750.00,
            status: 'COMPLETED',
            totalExpense: 140.00,
            expenses: [
              WalletExpenseItem(
                id: 480,
                name: 'Toll',
                amount: 140.00,
                addedFor: 'Electronic City Flyover Toll',
                addedAt: DateTime.utc(2026, 9, 29, 10, 15),
              ),
            ],
          ),
          WalletTripRecord(
            tripId: '8385',
            orderId: 1018,
            tripStartTime: DateTime.utc(2026, 9, 25, 14, 0),
            tripEndTime: DateTime.utc(2026, 9, 25, 15, 45),
            driverEarning: 920.00,
            status: 'COMPLETED',
            totalExpense: 60.00,
            expenses: [
              WalletExpenseItem(
                id: 475,
                name: 'Parking',
                amount: 60.00,
                addedFor: 'Mall Parking Gate 3',
                addedAt: DateTime.utc(2026, 9, 25, 14, 30),
              ),
            ],
          ),
          WalletTripRecord(
            tripId: '8380',
            orderId: 1015,
            tripStartTime: DateTime.utc(2026, 9, 20, 8, 0),
            tripEndTime: DateTime.utc(2026, 9, 20, 9, 20),
            driverEarning: 580.00,
            status: 'COMPLETED',
            totalExpense: 0.0,
            expenses: const [],
          ),
        ],
      ),
      MonthlySettlementRecord(
        month: 'August 2026',
        monthDate: DateTime.utc(2026, 8, 1),
        totalDriverEarning: 28900.00,
        status: SettlementStatus.paid,
        paidAmount: 28900.00,
        paidDate: DateTime.utc(2026, 9, 4, 10, 0),
        trips: [
          WalletTripRecord(
            tripId: '8340',
            orderId: 980,
            tripStartTime: DateTime.utc(2026, 8, 28, 11, 0),
            tripEndTime: DateTime.utc(2026, 8, 28, 12, 40),
            driverEarning: 680.00,
            status: 'COMPLETED',
            totalExpense: 90.00,
            expenses: [
              WalletExpenseItem(
                id: 450,
                name: 'Toll',
                amount: 90.00,
                addedFor: 'Airport Expressway',
                addedAt: DateTime.utc(2026, 8, 28, 11, 35),
              ),
            ],
          ),
          WalletTripRecord(
            tripId: '8332',
            orderId: 975,
            tripStartTime: DateTime.utc(2026, 8, 21, 16, 30),
            tripEndTime: DateTime.utc(2026, 8, 21, 18, 0),
            driverEarning: 840.00,
            status: 'COMPLETED',
            totalExpense: 0.0,
            expenses: const [],
          ),
        ],
      ),
      MonthlySettlementRecord(
        month: 'July 2026',
        monthDate: DateTime.utc(2026, 7, 1),
        totalDriverEarning: 15400.00,
        status: SettlementStatus.paid,
        paidAmount: 15400.00,
        paidDate: DateTime.utc(2026, 8, 3, 14, 15),
        trips: [
          WalletTripRecord(
            tripId: '8290',
            orderId: 920,
            tripStartTime: DateTime.utc(2026, 7, 30, 9, 0),
            tripEndTime: DateTime.utc(2026, 7, 30, 10, 30),
            driverEarning: 550.00,
            status: 'COMPLETED',
            totalExpense: 50.0,
            expenses: [
              WalletExpenseItem(
                id: 410,
                name: 'Parking',
                amount: 50.00,
                addedFor: 'Station Parking',
                addedAt: DateTime.utc(2026, 7, 30, 9, 30),
              ),
            ],
          ),
        ],
      ),
    ];
  }
}
