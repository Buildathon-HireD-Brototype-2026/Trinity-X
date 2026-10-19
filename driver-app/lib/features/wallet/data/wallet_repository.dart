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
    // Unified trip source: derives from _tripRepository completed trips so History and Wallet match.
    final allTrips = await _tripRepository.getTrips();
    final completedTrips = allTrips
        .where((t) => t.isClosed && !t.isCancelled)
        .map((t) => WalletTripRecord.fromTripModel(t))
        .toList();

    // September 2026 trips (IST month 9, 2026)
    final septTrips = completedTrips.where((t) {
      final ist = IstDateTimeHelper.toIST(t.completedAt);
      return ist.year == 2026 && ist.month == 9;
    }).toList();
    final septEarnings = septTrips.fold(0.0, (sum, t) => sum + t.driverEarning);
    final septExpenses = septTrips.fold(0.0, (sum, t) => sum + t.totalExpense);

    // August 2026 trips (IST month 8, 2026)
    final augTrips = completedTrips.where((t) {
      final ist = IstDateTimeHelper.toIST(t.completedAt);
      return ist.year == 2026 && ist.month == 8;
    }).toList();
    final augEarnings = augTrips.fold(0.0, (sum, t) => sum + t.driverEarning);
    final augExpenses = augTrips.fold(0.0, (sum, t) => sum + t.totalExpense);

    return [
      MonthlySettlementRecord(
        month: 'September 2026',
        monthDate: DateTime.utc(2026, 9, 1),
        totalDriverEarning: septEarnings,
        tripCount: septTrips.length,
        totalExpense: septExpenses,
        status: SettlementStatus.paid,
        paidAmount: septEarnings,
        paidDate: DateTime.utc(2026, 10, 5, 11, 30),
        trips: septTrips,
      ),
      MonthlySettlementRecord(
        month: 'August 2026',
        monthDate: DateTime.utc(2026, 8, 1),
        totalDriverEarning: augEarnings,
        tripCount: augTrips.length,
        totalExpense: augExpenses,
        status: SettlementStatus.paid,
        paidAmount: augEarnings,
        paidDate: DateTime.utc(2026, 9, 4, 10, 0),
        trips: augTrips,
      ),
    ];
  }
}
