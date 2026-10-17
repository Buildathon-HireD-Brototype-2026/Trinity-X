import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../trips/presentation/controllers/current_trip_provider.dart';
import '../../data/wallet_repository.dart';
import '../../domain/wallet_models.dart';

/// Provider for WalletRepository
final walletRepositoryProvider = Provider<WalletRepository>((ref) {
  final tripRepo = ref.watch(tripRepositoryProvider);
  return MockWalletRepository(tripRepo);
});

/// Stream of all live wallet trips
final allWalletTripsProvider = StreamProvider<List<WalletTripRecord>>((ref) {
  final repo = ref.watch(walletRepositoryProvider);
  return repo.watchWalletTrips();
});

/// Live wallet balance for the CURRENT MONTH only in IST (UTC+05:30).
/// Sum of driver earnings (driver split) from all completed trips this month.
/// Expenses are NOT subtracted. Cancelled trips are excluded.
/// Resets to 0 at month boundary.
final currentMonthBalanceProvider = Provider<double>((ref) {
  final tripsAsync = ref.watch(allWalletTripsProvider);
  final repo = ref.watch(walletRepositoryProvider);
  final trips = tripsAsync.valueOrNull ?? [];
  return repo.calculateCurrentMonthBalance(trips);
});

/// Currently selected date filter for the trips list (Today, This Week, This Month, Custom).
/// Only filters the trip list; the balance card always shows the current month total.
final walletDateFilterProvider =
    StateProvider<WalletDateFilter>((ref) => WalletDateFilter.thisMonth);

/// Selected custom date range when [WalletDateFilter.custom] is active.
final customDateRangeProvider = StateProvider<DateTimeRange?>((ref) => null);

/// Trips list under the filter, sorted newest first.
final filteredWalletTripsProvider = Provider<AsyncValue<List<WalletTripRecord>>>((ref) {
  final allTripsAsync = ref.watch(allWalletTripsProvider);
  final filter = ref.watch(walletDateFilterProvider);
  final customRange = ref.watch(customDateRangeProvider);

  return allTripsAsync.whenData((trips) {
    final nowIST = IstDateTimeHelper.nowIST();

    final filtered = trips.where((trip) {
      final tripIST = IstDateTimeHelper.toIST(trip.tripStartTime);

      switch (filter) {
        case WalletDateFilter.today:
          return tripIST.year == nowIST.year &&
              tripIST.month == nowIST.month &&
              tripIST.day == nowIST.day;

        case WalletDateFilter.thisWeek:
          // Monday is 1, Sunday is 7
          final mondayThisWeek = DateTime(
            nowIST.year,
            nowIST.month,
            nowIST.day - (nowIST.weekday - 1),
          );
          final endOfWeek = mondayThisWeek.add(const Duration(days: 7));
          final tripDateOnly = DateTime(tripIST.year, tripIST.month, tripIST.day);
          return (tripDateOnly.isAtSameMomentAs(mondayThisWeek) || tripDateOnly.isAfter(mondayThisWeek)) &&
              tripDateOnly.isBefore(endOfWeek);

        case WalletDateFilter.thisMonth:
          return tripIST.year == nowIST.year && tripIST.month == nowIST.month;

        case WalletDateFilter.custom:
          if (customRange == null) return true;
          final startIST = DateTime(
            customRange.start.year,
            customRange.start.month,
            customRange.start.day,
          );
          final endIST = DateTime(
            customRange.end.year,
            customRange.end.month,
            customRange.end.day,
            23,
            59,
            59,
          );
          return (tripIST.isAtSameMomentAs(startIST) || tripIST.isAfter(startIST)) &&
              (tripIST.isAtSameMomentAs(endIST) || tripIST.isBefore(endIST));
      }
    }).toList();

    // Sort newest first
    filtered.sort((a, b) => b.tripStartTime.compareTo(a.tripStartTime));
    return filtered;
  });
});

/// Future provider for past month settlement records (read-only from backend).
final pastMonthsProvider = FutureProvider<List<MonthlySettlementRecord>>((ref) {
  final repo = ref.watch(walletRepositoryProvider);
  return repo.getPastMonths();
});
