import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/features/performance/presentation/controllers/performance_controller.dart';
import 'package:driver_app/features/performance/presentation/performance_screen.dart';
import 'package:driver_app/features/trips/data/trip_repository.dart';
import 'package:driver_app/features/trips/presentation/controllers/current_trip_provider.dart';
import 'package:driver_app/features/wallet/data/wallet_repository.dart';
import 'package:driver_app/features/wallet/domain/wallet_models.dart';
import 'package:driver_app/features/wallet/presentation/controllers/wallet_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
  });

  group('Performance Controller & Screen Tests', () {
    testWidgets('Calculates and displays Total Earnings and This Month matching Wallet calculations', (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 800));

      final container = ProviderContainer();
      addTearDown(container.dispose);

      // Read trips from provider
      final trips = await container.read(allTripsProvider.future);
      final completedTrips = trips
          .where((t) => t.isClosed && !t.isCancelled)
          .map((t) => WalletTripRecord.fromTripModel(t))
          .toList();

      final walletRepo = container.read(walletRepositoryProvider);
      final expectedMonthTotal = walletRepo.calculateCurrentMonthBalance(completedTrips);
      double expectedAllTimeTotal = 0;
      for (final t in completedTrips) {
        expectedAllTimeTotal += t.driverEarning;
      }

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const PerformanceScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Screen title
      expect(find.text('Performance'), findsOneWidget);

      // Verify Section Header

      // Verify "Total Earnings" label and value
      expect(find.text('Total Earnings'), findsOneWidget);
      expect(
        find.text(IstDateTimeHelper.formatCurrency(expectedAllTimeTotal)),
        findsOneWidget,
      );

      // Verify "This Month" label and value
      expect(find.text('This Month'), findsOneWidget);
      expect(
        find.text(IstDateTimeHelper.formatCurrency(expectedMonthTotal)),
        findsOneWidget,
      );

      // Verify NO other metrics, charts, or extra buttons exist
      expect(find.text('Completed Trips'), findsNothing);
      expect(find.text('Rating'), findsNothing);
      expect(find.text('Acceptance Rate'), findsNothing);
    });

    testWidgets('Renders properly in Dark Theme without overflow', (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 800));

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: const PerformanceScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Performance'), findsOneWidget);
      expect(find.text('Total Earnings'), findsOneWidget);
      expect(find.text('This Month'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
