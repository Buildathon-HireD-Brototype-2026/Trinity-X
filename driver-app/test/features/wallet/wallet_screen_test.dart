import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/features/trips/data/trip_repository.dart';
import 'package:driver_app/features/wallet/domain/wallet_models.dart';
import 'package:driver_app/features/wallet/data/wallet_repository.dart';
import 'package:driver_app/features/wallet/presentation/controllers/wallet_controller.dart';
import 'package:driver_app/features/wallet/presentation/wallet_screen.dart';
import 'package:driver_app/features/wallet/presentation/widgets/trip_details_bottom_sheet.dart';
import 'package:driver_app/features/wallet/presentation/widgets/expense_list_sheet.dart';
import 'package:driver_app/features/wallet/presentation/widgets/previous_months_section.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
  });

  group('Wallet Business Logic & IST Rollover Unit Tests', () {
    test('1. Balance equals sum of driver earnings for current month only (expenses not subtracted)', () {
      final tripRepo = MockTripRepository();
      final walletRepo = MockWalletRepository(tripRepo);

      // Reference time in IST: 18 October 2026
      final refDate = DateTime.utc(2026, 10, 18, 12, 0);

      final trips = [
        // Completed trip in Oct 2026: driver earning 850, expense 110
        WalletTripRecord(
          tripId: 'T1',
          orderId: 101,
          tripStartTime: DateTime.utc(2026, 10, 15, 10, 0),
          tripEndTime: DateTime.utc(2026, 10, 15, 11, 0),
          completedAt: DateTime.utc(2026, 10, 15, 11, 0),
          driverEarning: 850.0,
          status: 'CLOSED',
          totalExpense: 110.0,
          expenses: [
            WalletExpenseItem(
              id: 1,
              name: 'Toll',
              amount: 110.0,
              addedFor: 'Expressway',
              addedAt: DateTime.utc(2026, 10, 15, 10, 30),
            ),
          ],
        ),
        // Completed trip in Oct 2026: driver earning 650, expense 50
        WalletTripRecord(
          tripId: 'T2',
          orderId: 102,
          tripStartTime: DateTime.utc(2026, 10, 16, 14, 0),
          tripEndTime: DateTime.utc(2026, 10, 16, 15, 0),
          completedAt: DateTime.utc(2026, 10, 16, 15, 0),
          driverEarning: 650.0,
          status: 'COMPLETED',
          totalExpense: 50.0,
        ),
        // Trip from September 2026: driver earning 900 (should NOT be included in October balance)
        WalletTripRecord(
          tripId: 'T3',
          orderId: 99,
          tripStartTime: DateTime.utc(2026, 9, 28, 14, 0),
          tripEndTime: DateTime.utc(2026, 9, 28, 15, 0),
          completedAt: DateTime.utc(2026, 9, 28, 15, 0),
          driverEarning: 900.0,
          status: 'COMPLETED',
          totalExpense: 0.0,
        ),
      ];

      final balance = walletRepo.calculateCurrentMonthBalance(trips, refDate);
      // October trips: 850 + 650 = 1500 (expenses 110 and 50 are not subtracted)
      expect(balance, equals(1500.0));

      final tripCount = walletRepo.calculateCurrentMonthTripCount(trips, refDate);
      expect(tripCount, equals(2));
    });

    test('2. Edge Case: ONLY completed trips are included; assigned, ongoing, and cancelled never show or count', () {
      final tripRepo = MockTripRepository();
      final walletRepo = MockWalletRepository(tripRepo);

      final refDate = DateTime.utc(2026, 10, 18, 12, 0);

      final trips = [
        WalletTripRecord(
          tripId: 'T1',
          orderId: 101,
          tripStartTime: DateTime.utc(2026, 10, 15, 10, 0),
          tripEndTime: DateTime.utc(2026, 10, 15, 11, 0),
          completedAt: DateTime.utc(2026, 10, 15, 11, 0),
          driverEarning: 500.0,
          status: 'CLOSED',
          totalExpense: 0.0,
        ),
        // Cancelled trip
        WalletTripRecord(
          tripId: 'T2',
          orderId: 102,
          tripStartTime: DateTime.utc(2026, 10, 16, 10, 0),
          tripEndTime: DateTime.utc(2026, 10, 16, 10, 30),
          completedAt: DateTime.utc(2026, 10, 16, 10, 30),
          driverEarning: 0.0,
          status: 'CANCELLED',
          totalExpense: 0.0,
        ),
        // Active/Ongoing trip not yet completed
        WalletTripRecord(
          tripId: 'T3',
          orderId: 103,
          tripStartTime: DateTime.utc(2026, 10, 18, 9, 0),
          completedAt: DateTime.utc(2026, 10, 18, 9, 0),
          driverEarning: 400.0,
          status: 'ONGOING',
          totalExpense: 0.0,
        ),
      ];

      final balance = walletRepo.calculateCurrentMonthBalance(trips, refDate);
      expect(balance, equals(500.0));
      expect(walletRepo.calculateCurrentMonthTripCount(trips, refDate), equals(1));
    });

    test('3. Period summary calculation strictly matches sum of filtered rows', () {
      final tripRepo = MockTripRepository();
      final walletRepo = MockWalletRepository(tripRepo);

      final trips = [
        WalletTripRecord(
          tripId: 'T1',
          orderId: 101,
          tripStartTime: DateTime.utc(2026, 10, 15, 10, 0),
          completedAt: DateTime.utc(2026, 10, 15, 11, 0),
          driverEarning: 850.0,
          status: 'CLOSED',
          totalExpense: 110.0,
        ),
        WalletTripRecord(
          tripId: 'T2',
          orderId: 102,
          tripStartTime: DateTime.utc(2026, 10, 16, 14, 0),
          completedAt: DateTime.utc(2026, 10, 16, 15, 0),
          driverEarning: 620.0,
          status: 'CLOSED',
          totalExpense: 60.0,
        ),
      ];

      final summary = walletRepo.calculatePeriodSummary(trips);
      expect(summary.totalDriverEarning, equals(1470.0));
      expect(summary.completedTripCount, equals(2));
      expect(summary.totalExpense, equals(170.0));
    });

    test('4. Month rollover in IST resets the wallet balance to 0 for the new month', () {
      final tripRepo = MockTripRepository();
      final walletRepo = MockWalletRepository(tripRepo);

      final octTrip = [
        WalletTripRecord(
          tripId: 'T-OCT',
          orderId: 99,
          tripStartTime: DateTime.utc(2026, 10, 20, 10, 0),
          completedAt: DateTime.utc(2026, 10, 20, 11, 0),
          driverEarning: 1200.0,
          status: 'CLOSED',
          totalExpense: 0.0,
        ),
      ];

      // Simulated current date: 1 November 2026 in IST
      final novDate = DateTime.utc(2026, 11, 1, 6, 0); // Nov 1st IST
      final novBalance = walletRepo.calculateCurrentMonthBalance(octTrip, novDate);
      expect(novBalance, equals(0.0));
      expect(walletRepo.calculateCurrentMonthTripCount(octTrip, novDate), equals(0));
    });
  });

  group('Wallet Screen UI & PRD D-12 Compliance Widget Tests', () {
    testWidgets('5. WalletScreen renders top card with month label, balance, trip count, and range summary',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const WalletScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check App bar
      expect(find.text('Wallet'), findsOneWidget);

      // Check Balance card labels and counts
      expect(find.text('Balance'), findsOneWidget);
      expect(find.textContaining('2026'), findsWidgets);
      expect(find.textContaining('completed trip'), findsWidgets);

      // Date filter options & heading
      expect(find.text('Today'), findsOneWidget);
      expect(find.text('This Week'), findsOneWidget);
      expect(find.text('This Month'), findsNWidgets(2)); // Chip and section heading
      expect(find.text('Custom'), findsOneWidget);

      // Period range summary row items
      expect(find.text('Driver Earning'), findsWidgets);
      expect(find.text('Trips'), findsWidgets);
      expect(find.text('Total Expense'), findsWidgets);

      // PRD TC-P11-03: STRICTLY NO in-app withdrawal or payout buttons
      expect(find.text('Withdraw'), findsNothing);
      expect(find.text('Payout'), findsNothing);
      expect(find.text('Cash Out'), findsNothing);
    });

    testWidgets('6. Tapping a trip opens Trip Details bottom sheet with read-only split, times, and total expense',
        (tester) async {
      final sampleTrip = WalletTripRecord(
        tripId: 'T-TEST-1040',
        orderId: 1040,
        tripStartTime: DateTime.utc(2026, 10, 17, 14, 0),
        tripEndTime: DateTime.utc(2026, 10, 17, 15, 20),
        completedAt: DateTime.utc(2026, 10, 17, 15, 20),
        driverEarning: 850.0,
        status: 'CLOSED',
        totalExpense: 110.0,
        expenses: [
          WalletExpenseItem(
            id: 495,
            name: 'Toll',
            amount: 110.0,
            addedFor: 'Airport Expressway Toll',
            addedAt: DateTime.utc(2026, 10, 17, 14, 30),
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => TripDetailsBottomSheet.show(context, sampleTrip),
                child: const Text('Open Details'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Details'));
      await tester.pumpAndSettle();

      // Check Trip Details sheet content
      expect(find.text('Trip Details'), findsOneWidget);
      expect(find.text('#ORD-1040'), findsOneWidget);
      expect(find.text('COMPLETED'), findsOneWidget);
      expect(find.text('Start Time'), findsOneWidget);
      expect(find.text('Completion Time'), findsOneWidget);
      expect(find.text('Driver Earning'), findsOneWidget);
      expect(find.text('₹850.00'), findsOneWidget);
      expect(find.text('Total Expense'), findsOneWidget);
      expect(find.text('₹110.00'), findsOneWidget);
    });

    testWidgets('7. Tapping expense row in Trip Details opens ExpenseListSheet with items and total',
        (tester) async {
      final sampleTrip = WalletTripRecord(
        tripId: 'T-EXP-TEST',
        orderId: 1040,
        tripStartTime: DateTime.utc(2026, 10, 17, 14, 0),
        tripEndTime: DateTime.utc(2026, 10, 17, 15, 20),
        completedAt: DateTime.utc(2026, 10, 17, 15, 20),
        driverEarning: 850.0,
        status: 'CLOSED',
        totalExpense: 170.0,
        expenses: [
          WalletExpenseItem(
            id: 495,
            name: 'Toll',
            amount: 110.0,
            addedFor: 'Airport Expressway Toll',
            addedAt: DateTime.utc(2026, 10, 17, 14, 30),
          ),
          WalletExpenseItem(
            id: 496,
            name: 'Parking',
            amount: 60.0,
            addedFor: 'Terminal 1 Parking',
            addedAt: DateTime.utc(2026, 10, 17, 15, 10),
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => TripDetailsBottomSheet.show(context, sampleTrip),
                child: const Text('Open Details'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Details'));
      await tester.pumpAndSettle();

      // Tap on the Total Expense row
      await tester.tap(find.text('Total Expense'));
      await tester.pumpAndSettle();

      // Verify ExpenseListSheet
      expect(find.byType(ExpenseListSheet), findsOneWidget);
      expect(find.text('Trip Expenses'), findsOneWidget);
      expect(find.text('Toll'), findsOneWidget);
      expect(find.text('₹110.00'), findsOneWidget);
      expect(find.text('Parking'), findsOneWidget);
      expect(find.text('₹60.00'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(ExpenseListSheet),
          matching: find.text('₹170.00'),
        ),
        findsOneWidget,
      );
    });

    testWidgets('8. Zero expense trip displays ₹0.00 and does NOT open expense sheet',
        (tester) async {
      final zeroExpenseTrip = WalletTripRecord(
        tripId: 'T-ZERO-EXP',
        orderId: 1038,
        tripStartTime: DateTime.utc(2026, 10, 14, 11, 0),
        tripEndTime: DateTime.utc(2026, 10, 14, 12, 0),
        completedAt: DateTime.utc(2026, 10, 14, 12, 0),
        driverEarning: 450.0,
        status: 'CLOSED',
        totalExpense: 0.0,
        expenses: const [],
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => TripDetailsBottomSheet.show(context, zeroExpenseTrip),
                child: const Text('Open Details'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Details'));
      await tester.pumpAndSettle();

      expect(find.text('₹0.00'), findsOneWidget);
      await tester.tap(find.text('Total Expense'));
      await tester.pumpAndSettle();

      // Expense list sheet should NOT open because trip has no expenses
      expect(find.text('Trip Expenses'), findsNothing);
    });

    testWidgets('9. PreviousMonthsSection displays exactly 2 previous months with trip count, expenses, and Paid/Pending status',
        (tester) async {
      final previousMonths = [
        MonthlySettlementRecord(
          month: 'September 2026',
          monthDate: DateTime.utc(2026, 9, 1),
          totalDriverEarning: 34250.0,
          tripCount: 38,
          totalExpense: 1420.0,
          status: SettlementStatus.paid,
          paidAmount: 34250.0,
          paidDate: DateTime.utc(2026, 10, 5),
        ),
        MonthlySettlementRecord(
          month: 'August 2026',
          monthDate: DateTime.utc(2026, 8, 1),
          totalDriverEarning: 28900.0,
          tripCount: 32,
          totalExpense: 980.0,
          status: SettlementStatus.pending,
          pendingAmount: 28900.0,
        ),
        // A 3rd older month that must be filtered out
        MonthlySettlementRecord(
          month: 'July 2026',
          monthDate: DateTime.utc(2026, 7, 1),
          totalDriverEarning: 15400.0,
          tripCount: 18,
          totalExpense: 450.0,
          status: SettlementStatus.paid,
          paidAmount: 15400.0,
          paidDate: DateTime.utc(2026, 8, 3),
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: PreviousMonthsSection(previousMonths: previousMonths),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Previous Months'), findsOneWidget);

      // Exactly 2 months shown: September and August (July must NOT be shown)
      expect(find.text('September 2026'), findsOneWidget);
      expect(find.text('PAID'), findsOneWidget);
      expect(find.textContaining('38 trips • Expenses: ₹1,420.00'), findsOneWidget);
      expect(find.textContaining('Paid ₹34,250.00 on 5 Oct 2026'), findsOneWidget);

      expect(find.text('August 2026'), findsOneWidget);
      expect(find.text('PENDING'), findsOneWidget);
      expect(find.textContaining('32 trips • Expenses: ₹980.00'), findsOneWidget);
      expect(find.textContaining('Pending amount: ₹28,900.00'), findsOneWidget);

      expect(find.text('July 2026'), findsNothing);
    });
  });
}
