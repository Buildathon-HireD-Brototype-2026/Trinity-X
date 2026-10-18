import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:driver_app/core/routing/route_names.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/features/history/presentation/controllers/trip_history_controller.dart';
import 'package:driver_app/features/history/presentation/trip_history_screen.dart';
import 'package:driver_app/features/profile/presentation/profile_screen.dart';
import 'package:driver_app/features/trips/data/trip_repository.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import 'package:driver_app/features/trips/presentation/controllers/current_trip_provider.dart';
import 'package:driver_app/features/trips/presentation/trips_screen.dart';
import 'package:driver_app/features/wallet/data/wallet_repository.dart';
import 'package:driver_app/features/wallet/domain/wallet_models.dart';
import 'package:driver_app/features/wallet/presentation/controllers/wallet_controller.dart';
import 'package:driver_app/features/wallet/presentation/widgets/previous_months_section.dart';
import 'package:driver_app/features/wallet/presentation/widgets/trip_details_bottom_sheet.dart';

void main() {
  late MockTripRepository tripRepository;
  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    tripRepository = MockTripRepository();
  });

  Widget createTestWidget(Widget child, {List<Override> overrides = const []}) {
    return ProviderScope(
      overrides: [
        tripRepositoryProvider.overrideWithValue(tripRepository),
        sharedPreferencesProvider.overrideWithValue(prefs),
        ...overrides,
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        home: child,
      ),
    );
  }

  group('Trip History (PRD D-10 & D-12) Integration & UI Tests', () {
    testWidgets('1. Assigned Trips shows ONLY assigned/ongoing trips; completed and cancelled are excluded',
        (tester) async {
      await tester.pumpWidget(createTestWidget(const TripsScreen()));
      await tester.pumpAndSettle();

      // Trips screen should show assigned/ongoing trips (8420 ongoing, 8421 assigned, etc.)
      expect(find.textContaining('1041'), findsOneWidget); // 8420 (Order #1041)
      expect(find.textContaining('1042'), findsOneWidget); // 8421 (Order #1042)

      // Completed trips (1040, 1039, 1038) must NOT appear in Assigned Trips
      expect(find.textContaining('1040'), findsNothing);
      expect(find.textContaining('1039'), findsNothing);
      expect(find.textContaining('1038'), findsNothing);

      // Cancelled trips (1037) must NOT appear in Assigned Trips
      expect(find.textContaining('1037'), findsNothing);
    });

    testWidgets('2. Completing an ongoing trip immediately moves it out of Assigned Trips and into Trip History',
        (tester) async {
      await tester.pumpWidget(createTestWidget(const TripsScreen()));
      await tester.pumpAndSettle();

      // Trip 8420 (Order 1041) is initially ongoing and present in Assigned Trips
      expect(find.textContaining('1041'), findsOneWidget);

      // Complete trip 8420 via repository
      await tripRepository.completeTrip('8420');
      await tester.pumpAndSettle();

      // It must immediately disappear from Assigned Trips
      expect(find.textContaining('1041'), findsNothing);

      // Now open Trip History screen and verify it appears there
      await tester.pumpWidget(createTestWidget(const TripHistoryScreen()));
      await tester.pumpAndSettle();

      // Trip 8420 (Order 1041) now appears in Trip History
      expect(find.text('#ORD-1041'), findsOneWidget);
    });

    testWidgets('3. Profile screen Operations section contains "Trip History" item',
        (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createTestWidget(const ProfileScreen()));
      await tester.pumpAndSettle();

      // Operations header
      expect(find.text('OPERATIONS'), findsOneWidget);

      // Trip History row
      expect(find.text('Trip History'), findsOneWidget);
      expect(find.byIcon(Icons.history_rounded), findsOneWidget);
    });

    testWidgets('4. TripHistoryScreen displays title, back button, month filter chips, and grouped trips',
        (tester) async {
      await tester.pumpWidget(createTestWidget(const TripHistoryScreen()));
      await tester.pumpAndSettle();

      // Title & Back button
      expect(find.text('Trip History'), findsOneWidget);
      expect(find.byTooltip('Back'), findsOneWidget);

      // Filter Chips
      expect(find.text('All'), findsOneWidget);
      expect(find.text('Custom'), findsOneWidget);

      // Completed trips are present (newest first)
      expect(find.text('#ORD-1040'), findsOneWidget);
      expect(find.text('#ORD-1039'), findsOneWidget);

      // Compact rows show driver earnings
      expect(find.text('₹850.00'), findsOneWidget); // Order 1040 driver share
      expect(find.text('₹620.00'), findsOneWidget); // Order 1039 driver share
    });

    testWidgets('5. Tapping a trip row opens read-only Trip Details bottom sheet with expenses',
        (tester) async {
      await tester.pumpWidget(createTestWidget(const TripHistoryScreen()));
      await tester.pumpAndSettle();

      // Tap on completed trip #ORD-1040
      await tester.tap(find.text('#ORD-1040'));
      await tester.pumpAndSettle();

      // Trip Details bottom sheet opens in read-only mode
      expect(find.byType(TripDetailsBottomSheet), findsOneWidget);
      expect(find.text('Trip Details'), findsOneWidget);
      expect(find.text('COMPLETED'), findsOneWidget);
      expect(find.text('Driver Earning'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(TripDetailsBottomSheet),
          matching: find.text('₹850.00'),
        ),
        findsOneWidget,
      );
      expect(find.text('Total Expense'), findsOneWidget);

      // No active trip buttons exist on read-only details
      expect(find.text('Navigate to Pickup'), findsNothing);
      expect(find.text('Open in Navigation App'), findsNothing);
      expect(find.byIcon(Icons.phone_rounded), findsNothing);
      expect(find.byIcon(Icons.call_rounded), findsNothing);

      // Tapping Total Expense opens expenses breakdown sheet
      await tester.tap(find.text('Total Expense'));
      await tester.pumpAndSettle();

      expect(find.text('Trip Expenses'), findsOneWidget);
      expect(find.text('Toll'), findsOneWidget);
      expect(find.textContaining('Airport Expressway Toll'), findsOneWidget);
      expect(find.text('₹110.00'), findsNWidgets(3));
    });

    testWidgets('6. Search by Order ID filters the trip history list',
        (tester) async {
      await tester.pumpWidget(createTestWidget(const TripHistoryScreen()));
      await tester.pumpAndSettle();

      expect(find.text('#ORD-1040'), findsOneWidget);
      expect(find.text('#ORD-1039'), findsOneWidget);

      // Enter search text "1039"
      await tester.enterText(find.byType(TextField), '1039');
      await tester.pumpAndSettle();

      // Only #ORD-1039 should remain
      expect(find.text('#ORD-1039'), findsOneWidget);
      expect(find.text('#ORD-1040'), findsNothing);
    });

    testWidgets('7. Filtering by a month with no trips displays "No trips" empty state',
        (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          const TripHistoryScreen(
            initialYear: 2025,
            initialMonth: 1, // January 2025 has 0 trips
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('No trips'), findsOneWidget);
      expect(find.byIcon(Icons.history_rounded), findsOneWidget);
    });

    testWidgets('8. Wallet Previous Months link: September shows N trips and matches History for that month',
        (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      addTearDown(tester.view.resetPhysicalSize);

      final walletRepo = MockWalletRepository(tripRepository);
      final prevMonths = await walletRepo.getPreviousMonths();

      final septMonth = prevMonths.firstWhere((m) => m.month.contains('September'));
      final septTripsInWalletCount = septMonth.tripCount;

      // Now load TripHistoryScreen with September preselected
      await tester.pumpWidget(
        createTestWidget(
          TripHistoryScreen(
            initialYear: septMonth.monthDate.year,
            initialMonth: septMonth.monthDate.month,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // History should show only September trips (Orders 1022, 1018, 1015)
      expect(find.text('#ORD-1022'), findsOneWidget);
      expect(find.text('#ORD-1018'), findsOneWidget);
      expect(find.text('#ORD-1015'), findsOneWidget);

      // October trips must NOT appear
      expect(find.text('#ORD-1040'), findsNothing);
      expect(find.text('#ORD-1039'), findsNothing);

      // Verify that the count matches exactly
      expect(septTripsInWalletCount, 3);
    });
  });
}
