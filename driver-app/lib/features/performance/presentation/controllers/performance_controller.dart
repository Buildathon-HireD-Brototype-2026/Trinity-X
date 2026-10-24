import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:driver_app/features/trips/presentation/controllers/current_trip_provider.dart';
import 'package:driver_app/features/wallet/domain/wallet_models.dart';
import 'package:driver_app/features/wallet/presentation/controllers/wallet_controller.dart';

class PerformanceSummary {
  final double totalEarnings; // All-time completed trips
  final double currentMonthEarnings; // Current IST month completed trips

  const PerformanceSummary({
    required this.totalEarnings,
    required this.currentMonthEarnings,
  });
}

/// Computes performance earnings directly from unified trips/wallet repository
final performanceSummaryProvider = Provider.autoDispose<AsyncValue<PerformanceSummary>>((ref) {
  final tripsAsync = ref.watch(allTripsProvider);
  final walletRepo = ref.watch(walletRepositoryProvider);

  return tripsAsync.whenData((trips) {
    final completedTrips = trips
        .where((t) => t.isClosed && !t.isCancelled)
        .map((t) => WalletTripRecord.fromTripModel(t))
        .toList();

    double allTimeTotal = 0.0;
    for (final trip in completedTrips) {
      allTimeTotal += trip.driverEarning;
    }

    final currentMonthTotal = walletRepo.calculateCurrentMonthBalance(completedTrips);

    return PerformanceSummary(
      totalEarnings: allTimeTotal,
      currentMonthEarnings: currentMonthTotal,
    );
  });
});
