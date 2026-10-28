import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/wallet_repository.dart';
import '../../domain/wallet_models.dart';
export '../../data/wallet_repository.dart';


/// Stream of ONLY completed trips (PRD Section 1: Assigned, ongoing, cancelled NEVER appear)
final allCompletedTripsProvider = StreamProvider<List<WalletTripRecord>>((ref) {
  final repo = ref.watch(walletRepositoryProvider);
  return repo.watchCompletedTrips();
});

/// Live wallet balance for the CURRENT MONTH only in IST (UTC+05:30).
/// Sum of driver earnings (driver split) from all completed trips this month.
/// Expenses are NOT subtracted. Resets to 0 at month boundary.
final currentMonthBalanceProvider = Provider<double>((ref) {
  final tripsAsync = ref.watch(allCompletedTripsProvider);
  final repo = ref.watch(walletRepositoryProvider);
  final trips = tripsAsync.valueOrNull ?? [];
  return repo.calculateCurrentMonthBalance(trips);
});

/// Number of completed trips in the CURRENT MONTH only.
final currentMonthTripCountProvider = Provider<int>((ref) {
  final tripsAsync = ref.watch(allCompletedTripsProvider);
  final repo = ref.watch(walletRepositoryProvider);
  final trips = tripsAsync.valueOrNull ?? [];
  return repo.calculateCurrentMonthTripCount(trips);
});

/// Currently selected date filter (Today, This Week, This Month, Custom).
/// Only filters the trip list below the card; the balance card always shows the current month total.
final walletDateFilterProvider =
    StateProvider<WalletDateFilter>((ref) => WalletDateFilter.thisMonth);

/// Selected custom date range when [WalletDateFilter.custom] is active.
final customDateRangeProvider = StateProvider<DateTimeRange?>((ref) => null);

/// Filtered completed trips list for the selected period, sorted newest first.
final filteredCompletedTripsProvider =
    Provider<AsyncValue<List<WalletTripRecord>>>((ref) {
  final allTripsAsync = ref.watch(allCompletedTripsProvider);
  final filter = ref.watch(walletDateFilterProvider);
  final customRange = ref.watch(customDateRangeProvider);

  return allTripsAsync.whenData((trips) {
    final nowIST = IstDateTimeHelper.nowIST();

    final filtered = trips.where((trip) {
      if (!trip.isCompleted) return false;
      final tripCompletionIST = IstDateTimeHelper.toIST(trip.completedAt);

      switch (filter) {
        case WalletDateFilter.today:
          return tripCompletionIST.year == nowIST.year &&
              tripCompletionIST.month == nowIST.month &&
              tripCompletionIST.day == nowIST.day;

        case WalletDateFilter.thisWeek:
          // Monday is 1, Sunday is 7 in IST
          final mondayThisWeek = DateTime(
            nowIST.year,
            nowIST.month,
            nowIST.day - (nowIST.weekday - 1),
          );
          final endOfWeek = mondayThisWeek.add(const Duration(days: 6, hours: 23, minutes: 59, seconds: 59));
          return IstDateTimeHelper.isDateInPeriod(trip.completedAt, mondayThisWeek, endOfWeek);

        case WalletDateFilter.thisMonth:
          return tripCompletionIST.year == nowIST.year &&
              tripCompletionIST.month == nowIST.month;

        case WalletDateFilter.custom:
          if (customRange == null) return true;
          return IstDateTimeHelper.isDateInPeriod(
            trip.completedAt,
            customRange.start,
            customRange.end,
          );
      }
    }).toList();

    // Sort newest first
    filtered.sort((a, b) => b.completedAt.compareTo(a.completedAt));
    return filtered;
  });
});

/// Live summary for the currently selected filter period:
/// total driver earning, completed trip count, and total expense.
/// Sums directly from the filtered rows so totals always equal the rows shown!
final filteredPeriodSummaryProvider = Provider<WalletPeriodSummary>((ref) {
  final tripsAsync = ref.watch(filteredCompletedTripsProvider);
  final repo = ref.watch(walletRepositoryProvider);
  final trips = tripsAsync.valueOrNull ?? [];
  return repo.calculatePeriodSummary(trips);
});

/// Previous 2 months settlement records (read-only from backend).
final previousMonthsProvider =
    FutureProvider<List<MonthlySettlementRecord>>((ref) {
  final repo = ref.watch(walletRepositoryProvider);
  return repo.getPreviousMonths();
});
