import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import 'package:driver_app/features/trips/presentation/controllers/current_trip_provider.dart';
import 'package:driver_app/features/trips/presentation/trip_details_screen.dart';
import 'package:driver_app/features/trips/presentation/widgets/sections/route_section.dart';
import 'package:driver_app/features/trips/presentation/widgets/sections/trip_info_section.dart';
import 'package:driver_app/features/trips/presentation/widgets/sections/passenger_section.dart';
import 'package:driver_app/features/trips/presentation/widgets/sections/earnings_section.dart';
import 'package:driver_app/features/trips/presentation/widgets/sections/expenses_section.dart';
import 'package:driver_app/features/trips/presentation/widgets/contact_bottom_sheet.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
  });

  final sampleTrip = TripModel(
    tripId: 'TRIP-SEC-1',
    orderId: 8080,
    status: 'ASSIGNED',
    companyName: 'Wipro Limited',
    pickupSpot: 'Sarjapur Main Campus Gate 2, Bengaluru, Karnataka 560035',
    dropoffSpot: 'Kempegowda International Airport Terminal 2 Departures',
    pickupTime: DateTime.utc(2026, 10, 18, 9, 30),
    estimatedReachMinutes: 45,
    contactName: 'Priya Nair',
    contactPhone: '+91 98765 43210',
    amount: 1200.0,
    driverShare: 450.0,
    otp: '123456',
    otpAttempts: 0,
    expensesConfirmed: false,
    expenses: [
      TripExpenseModel(
        expenseId: 1,
        description: 'Airport Toll Road Plaza',
        amount: 110.0,
        createdAt: DateTime.utc(2026, 10, 18, 10, 0),
      ),
    ],
    pickupLat: 12.9121,
    pickupLng: 77.6446,
    dropoffLat: 13.1986,
    dropoffLng: 77.7066,
  );

  group('Trip Details Section Tests', () {
    testWidgets('1. RouteSection renders map banner, dot-line-dot indicator, and addresses', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: RouteSection(trip: sampleTrip),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('ROUTE'), findsOneWidget);
      expect(find.text('PICKUP'), findsOneWidget);
      expect(find.text('DROPOFF'), findsOneWidget);
      expect(find.textContaining('Sarjapur Main Campus'), findsOneWidget);
      expect(find.textContaining('Kempegowda International Airport'), findsOneWidget);
    });

    testWidgets('2. TripInfoSection renders 2-column grid and suppresses empty/null rows without dashes or N/A', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: TripInfoSection(trip: sampleTrip),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('TRIP INFO'), findsOneWidget);
      expect(find.text('START TIME'), findsNothing); // Assigned trip has no startedAt
      expect(find.text('END TIME'), findsNothing); // Not closed
      expect(find.text('N/A'), findsNothing);
      expect(find.text('--'), findsNothing);
      expect(find.text('EST. TIME'), findsOneWidget);
      expect(find.text('45 mins'), findsOneWidget);
    });

    testWidgets('3. PassengerSection displays name, company, but no phone number or call icon, and hides cleanly when empty', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PassengerSection(trip: sampleTrip),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('PASSENGER'), findsOneWidget);
      expect(find.text('Priya Nair'), findsOneWidget);
      expect(find.text('Wipro Limited'), findsOneWidget);
      // Phone number and call button MUST NOT appear in PassengerSection
      expect(find.text('+91 98765 43210'), findsNothing);
      expect(find.byIcon(Icons.call_rounded), findsNothing);

      // Verify empty suppression
      final emptyTrip = sampleTrip.copyWith(
        contactName: '',
        contactPhone: '',
        companyName: '',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PassengerSection(trip: emptyTrip),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('PASSENGER'), findsNothing);
    });

    testWidgets('4. EarningsSection renders driver earning prominently and hides on cancelled trip', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EarningsSection(trip: sampleTrip),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('EARNINGS'), findsOneWidget);
      expect(find.text('Your Earning'), findsOneWidget);
      expect(find.text('₹450.00'), findsOneWidget);

      // Cancelled trip hides earnings
      final cancelledTrip = sampleTrip.copyWith(status: 'CANCELLED');
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EarningsSection(trip: cancelledTrip),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('EARNINGS'), findsNothing);
      expect(find.text('₹450.00'), findsNothing);
    });

    testWidgets('5. ExpensesSection renders total and item count, and expands on tap', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExpensesSection(
              trip: sampleTrip,
              onAddExpense: () {},
              onQuickExpense: (_) {},
              onDeleteExpense: (_) {},
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('EXPENSES'), findsOneWidget);
      expect(find.text('₹110.00'), findsOneWidget);
      expect(find.textContaining('1 item'), findsOneWidget);

      // Initially closed
      expect(find.text('Airport Toll Road Plaza'), findsNothing);

      // Tap to expand
      await tester.tap(find.text('₹110.00'));
      await tester.pumpAndSettle();

      expect(find.text('Airport Toll Road Plaza'), findsOneWidget);
    });

    testWidgets('6. TripDetailsScreen renders 360dp-wide screen without overflow', (tester) async {
      tester.view.physicalSize = const Size(360 * 2, 720 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            allTripsProvider.overrideWith((ref) => Stream.value([sampleTrip])),
          ],
          child: const MaterialApp(
            home: TripDetailsScreen(tripId: 'TRIP-SEC-1'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('ORD-8080'), findsOneWidget);
      expect(find.text('ASSIGNED'), findsOneWidget);
      expect(find.text('ROUTE'), findsOneWidget);
      expect(find.text('PASSENGER'), findsOneWidget);
      expect(find.text('EARNINGS'), findsOneWidget);
      expect(find.text('EXPENSES'), findsOneWidget);
      // Assigned trip should NOT show header contact button
      expect(find.byKey(const Key('header_contact_button')), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('7. Ongoing trip shows header contact button, tapping opens ContactBottomSheet', (tester) async {
      final ongoingTrip = sampleTrip.copyWith(status: 'ONGOING');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            allTripsProvider.overrideWith((ref) => Stream.value([ongoingTrip])),
          ],
          child: const MaterialApp(
            home: TripDetailsScreen(tripId: 'TRIP-SEC-1'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('ONGOING'), findsOneWidget);
      final contactBtn = find.byKey(const Key('header_contact_button'));
      expect(contactBtn, findsOneWidget);

      // Tap contact button to open ContactBottomSheet
      await tester.tap(contactBtn);
      await tester.pumpAndSettle();

      // Verify sheet content
      expect(find.text('Contact'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(ContactBottomSheet),
          matching: find.text('Priya Nair'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byType(ContactBottomSheet),
          matching: find.text('Wipro Limited'),
        ),
        findsOneWidget,
      );
      // The phone number ONLY appears in the bottom sheet, nowhere else in the app
      expect(find.text('+91 98765 43210'), findsOneWidget);
      expect(find.byKey(const Key('contact_sheet_dial_button')), findsOneWidget);

      // Tap close button on sheet
      await tester.tap(find.byTooltip('Close'));
      await tester.pumpAndSettle();

      // Sheet dismissed
      expect(find.text('Contact'), findsNothing);
    });

    testWidgets('8a. Header contact button is hidden on CANCELLED trips', (tester) async {
      final cancelledTrip = sampleTrip.copyWith(status: 'CANCELLED');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            allTripsProvider.overrideWith((ref) => Stream.value([cancelledTrip])),
          ],
          child: const MaterialApp(
            home: TripDetailsScreen(tripId: 'TRIP-SEC-1', key: ValueKey('cancelled_screen')),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('CANCELLED'), findsOneWidget);
      expect(find.byKey(const Key('header_contact_button')), findsNothing);
    });

    testWidgets('8b. Header contact button is hidden on CLOSED trips', (tester) async {
      final closedTrip = sampleTrip.copyWith(status: 'CLOSED');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            allTripsProvider.overrideWith((ref) => Stream.value([closedTrip])),
          ],
          child: const MaterialApp(
            home: TripDetailsScreen(tripId: 'TRIP-SEC-1', key: ValueKey('closed_screen')),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('CLOSED'), findsOneWidget);
      expect(find.byKey(const Key('header_contact_button')), findsNothing);
    });

    testWidgets('9. ContactBottomSheet hides missing rows and dial button when data is absent', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ContactBottomSheet(
              personName: 'Rohan Sharma',
              companyName: '', // Empty company
              phoneNumber: null, // No phone number
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Contact'), findsOneWidget);
      expect(find.text('PASSENGER'), findsOneWidget);
      expect(find.text('Rohan Sharma'), findsOneWidget);

      // Company and Phone rows must be hidden
      expect(find.text('COMPANY'), findsNothing);
      expect(find.text('PHONE NUMBER'), findsNothing);
      expect(find.byKey(const Key('contact_sheet_dial_button')), findsNothing);
      expect(find.text('N/A'), findsNothing);
      expect(find.text('--'), findsNothing);
    });

    testWidgets('10. If trip ends or is cancelled while sheet is open, sheet is automatically dismissed', (tester) async {
      final tripController = StreamController<List<TripModel>>.broadcast();
      addTearDown(tripController.close);

      final ongoingTrip = sampleTrip.copyWith(status: 'ONGOING');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            allTripsProvider.overrideWith((ref) => tripController.stream),
          ],
          child: const MaterialApp(
            home: TripDetailsScreen(tripId: 'TRIP-SEC-1'),
          ),
        ),
      );

      tripController.add([ongoingTrip]);
      await tester.pumpAndSettle();

      expect(find.text('ONGOING'), findsOneWidget);
      final contactBtn = find.byKey(const Key('header_contact_button'));
      expect(contactBtn, findsOneWidget);

      // Open sheet
      await tester.tap(contactBtn);
      await tester.pumpAndSettle();

      expect(find.text('Contact'), findsOneWidget);

      // Trip updates to CLOSED
      final closedTrip = sampleTrip.copyWith(status: 'CLOSED');
      tripController.add([closedTrip]);
      await tester.pumpAndSettle();

      // Sheet should be automatically closed
      expect(find.text('Contact'), findsNothing);
      expect(find.text('CLOSED'), findsOneWidget);
    });
  });
}
