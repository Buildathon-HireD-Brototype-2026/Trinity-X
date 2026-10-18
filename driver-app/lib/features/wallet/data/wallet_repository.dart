import 'dart:async';
import '../../trips/data/trip_repository.dart';
import '../domain/wallet_models.dart';

abstract class WalletRepository {
  /// Watches ONLY completed trips converted into WalletTripRecord
  /// PRD Section 1: Assigned, ongoing, and cancelled trips NEVER appear.
  Stream<List<WalletTripRecord>> watchCompletedTrips();

  /// Gets the previous 2 months settlement records (PRD Section 5)
  Future<List<MonthlySettlementRecord>> getPreviousMonths([DateTime? referenceNow]);

  /// Calculates the live wallet balance for the CURRENT MONTH only in IST
  /// Sums driver splits for completed trips in current month; expenses not subtracted.
  double calculateCurrentMonthBalance(
    List<WalletTripRecord> trips, [
    DateTime? referenceNow,
  ]);

  /// Calculates the number of completed trips in the current month in IST
  int calculateCurrentMonthTripCount(
    List<WalletTripRecord> trips, [
    DateTime? referenceNow,
  ]);

  /// Calculates period summary for a filtered list of trips (PRD Section 3)
  WalletPeriodSummary calculatePeriodSummary(List<WalletTripRecord> trips);
}

class MockWalletRepository implements WalletRepository {
  final TripRepository _tripRepository;

  MockWalletRepository(this._tripRepository);

  @override
  Stream<List<WalletTripRecord>> watchCompletedTrips() {
    return _tripRepository.watchTrips().map((trips) {
      // PRD Section 1: Everywhere on wallet screen, include ONLY trips with status Completed
      return trips
          .where((t) => t.isClosed && t.status.toUpperCase() != 'CANCELLED')
          .map((t) => WalletTripRecord.fromTripModel(t))
          .toList();
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

      final tripIST = IstDateTimeHelper.toIST(trip.completedAt);
      if (tripIST.year == nowIST.year && tripIST.month == nowIST.month) {
        total += trip.driverEarning;
      }
    }
    return total;
  }

  @override
  int calculateCurrentMonthTripCount(
    List<WalletTripRecord> trips, [
    DateTime? referenceNow,
  ]) {
    final nowIST = referenceNow != null
        ? IstDateTimeHelper.toIST(referenceNow)
        : IstDateTimeHelper.nowIST();

    int count = 0;
    for (final trip in trips) {
      if (!trip.countsTowardBalance) continue;

      final tripIST = IstDateTimeHelper.toIST(trip.completedAt);
      if (tripIST.year == nowIST.year && tripIST.month == nowIST.month) {
        count++;
      }
    }
    return count;
  }

  @override
  WalletPeriodSummary calculatePeriodSummary(List<WalletTripRecord> trips) {
    double totalEarning = 0.0;
    double totalExpense = 0.0;
    int count = 0;

    for (final trip in trips) {
      if (!trip.isCompleted) continue;
      totalEarning += trip.driverEarning;
      totalExpense += trip.totalExpense;
      count++;
    }

    return WalletPeriodSummary(
      totalDriverEarning: totalEarning,
      completedTripCount: count,
      totalExpense: totalExpense,
    );
  }

  @override
  Future<List<MonthlySettlementRecord>> getPreviousMonths([DateTime? referenceNow]) async {
    // PRD Section 5: "showing only the last 2 months before the current one (e.g. in October: September and August)"
    // Anything older than 2 months is no longer shown.
    return [
      MonthlySettlementRecord(
        month: 'September 2026',
        monthDate: DateTime.utc(2026, 9, 1),
        totalDriverEarning: 34250.00,
        tripCount: 38,
        totalExpense: 1420.00,
        status: SettlementStatus.paid,
        paidAmount: 34250.00,
        paidDate: DateTime.utc(2026, 10, 5, 11, 30),
        trips: [
          WalletTripRecord(
            tripId: '8390',
            orderId: 1022,
            tripStartTime: DateTime.utc(2026, 9, 29, 9, 30),
            tripEndTime: DateTime.utc(2026, 9, 29, 11, 15),
            completedAt: DateTime.utc(2026, 9, 29, 11, 15),
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
            completedAt: DateTime.utc(2026, 9, 25, 15, 45),
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
            completedAt: DateTime.utc(2026, 9, 20, 9, 20),
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
        tripCount: 32,
        totalExpense: 980.00,
        status: SettlementStatus.paid,
        paidAmount: 28900.00,
        paidDate: DateTime.utc(2026, 9, 4, 10, 0),
        trips: [
          WalletTripRecord(
            tripId: '8340',
            orderId: 980,
            tripStartTime: DateTime.utc(2026, 8, 28, 11, 0),
            tripEndTime: DateTime.utc(2026, 8, 28, 12, 40),
            completedAt: DateTime.utc(2026, 8, 28, 12, 40),
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
            completedAt: DateTime.utc(2026, 8, 21, 18, 0),
            driverEarning: 840.00,
            status: 'COMPLETED',
            totalExpense: 0.0,
            expenses: const [],
          ),
        ],
      ),
    ];
  }
}
