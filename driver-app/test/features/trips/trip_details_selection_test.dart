import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/features/auth/domain/driver_model.dart';
import 'package:driver_app/features/auth/presentation/controllers/driver_profile_controller.dart';
import 'package:driver_app/features/home/presentation/home_dashboard_screen.dart';
import 'package:driver_app/features/trips/data/trip_native_bridge.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import 'package:driver_app/features/trips/presentation/controllers/current_trip_provider.dart';
import 'package:driver_app/features/trips/presentation/controllers/trip_mini_overlay_controller.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/features/trips/presentation/trip_details_screen.dart';

class _FakeBridge extends FakeTripNativeBridge {}

class FakeTripNativeBridge implements TripNativeBridge {
  @override
  Stream<String?> get onOpenTripDetailsFromOverlay => const Stream.empty();
  @override
  Stream<void> get onOverlayClosedByUser => const Stream.empty();
  @override
  Stream<bool> get onPictureInPictureModeChanged => const Stream.empty();
  @override
  Future<bool> checkOverlayPermission() async => true;
  @override
  Future<bool> requestOverlayPermission() async => true;
  @override
  Future<bool> isPipSupported() async => true;
  @override
  Future<bool> isPipAllowed() async => true;
  @override
  Future<bool> enterPictureInPicture() async => true;
  @override
  Future<bool> setAutoEnterPiP(bool enabled) async => true;
  @override
  Future<bool> updateTripState({required bool isTripRunning, required bool miniDismissed}) async => true;
  @override
  Future<bool> startTripService({required TripModel trip, required int elapsedSeconds, bool overlayVisible = true}) async => true;
  @override
  Future<bool> updateTripService({required TripModel trip, required int elapsedSeconds}) async => true;
  @override
  Future<bool> setOverlayVisible(bool visible) async => true;
  @override
  Future<bool> stopTripService() async => true;
  @override
  Future<bool> sendToBackgroundWithMini() async => true;
  @override
  Future<bool> sendToBackground() async => true;
  @override
  Future<bool> isLowRamDevice() async => false;
  @override
  void dispose() {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;
  late _FakeBridge fakeBridge;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    fakeBridge = _FakeBridge();
  });

  group('Assigned Trip Selection and Trip Details Isolation Tests', () {
    testWidgets('1. TripDetailsScreen with tripId renders ONLY that trip details', (tester) async {
      final trip1 = TripModel(
        tripId: 'TRIP-101',
        orderId: 5001,
        status: 'ASSIGNED',
        companyName: 'Company Alpha',
        pickupSpot: 'Alpha Gate 1',
        dropoffSpot: 'Alpha Tower',
        pickupTime: DateTime.now().toUtc(),
        estimatedReachMinutes: 20,
        contactName: 'Alice Alpha',
        contactPhone: '+91 99999 11111',
        amount: 1000.0,
        driverShare: 300.0,
        otp: '111222',
        otpAttempts: 0,
        expensesConfirmed: false,
        expenses: const [],
      );

      final trip2 = TripModel(
        tripId: 'TRIP-202',
        orderId: 5002,
        status: 'ASSIGNED',
        companyName: 'Company Beta',
        pickupSpot: 'Beta Spot 2',
        dropoffSpot: 'Beta Terminal',
        pickupTime: DateTime.now().toUtc().add(const Duration(hours: 3)),
        estimatedReachMinutes: 45,
        contactName: 'Bob Beta',
        contactPhone: '+91 88888 22222',
        amount: 2500.0,
        driverShare: 750.0,
        otp: '333444',
        otpAttempts: 0,
        expensesConfirmed: false,
        expenses: const [],
      );

      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tripNativeBridgeProvider.overrideWithValue(fakeBridge),
          allTripsProvider.overrideWith((ref) => Stream.value([trip1, trip2])),
          assignedTripsProvider.overrideWith((ref) => Stream.value([trip1, trip2])),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: TripDetailsScreen(tripId: 'TRIP-202'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Must show Company Beta details
      expect(find.text('Company Beta'), findsOneWidget);
      expect(find.text('Beta Spot 2'), findsOneWidget);
      expect(find.text('Beta Terminal'), findsOneWidget);
      expect(find.text('Bob Beta'), findsOneWidget);
      expect(find.text('+91 88888 22222'), findsOneWidget);
      expect(find.text('₹2500.00'), findsOneWidget);
      expect(find.text('₹750.00'), findsOneWidget);

      // Must NOT show Company Alpha details
      expect(find.text('Company Alpha'), findsNothing);
      expect(find.text('Alpha Gate 1'), findsNothing);
      expect(find.text('Alice Alpha'), findsNothing);
    });

    testWidgets('2. Tapping assigned trip card selects that trip and shows only that trip details', (tester) async {
      final tripA = TripModel(
        tripId: 'TRIP-AAA',
        orderId: 7001,
        status: 'ASSIGNED',
        companyName: 'Tata Consultancy Services',
        pickupSpot: 'Whitefield Main Gate',
        dropoffSpot: 'Bengaluru Airport T1',
        pickupTime: DateTime.now().toUtc().add(const Duration(hours: 1)),
        estimatedReachMinutes: 50,
        contactName: 'Rajesh Sharma',
        contactPhone: '+91 91234 56789',
        amount: 1800.0,
        driverShare: 540.0,
        otp: '556677',
        otpAttempts: 0,
        expensesConfirmed: false,
        expenses: const [],
      );

      final tripB = TripModel(
        tripId: 'TRIP-BBB',
        orderId: 7002,
        status: 'ASSIGNED',
        companyName: 'Wipro Limited',
        pickupSpot: 'Sarjapur Campus Gate 3',
        dropoffSpot: 'Electronic City Phase 1',
        pickupTime: DateTime.now().toUtc().add(const Duration(hours: 4)),
        estimatedReachMinutes: 30,
        contactName: 'Sneha Patel',
        contactPhone: '+91 99887 66554',
        amount: 1200.0,
        driverShare: 360.0,
        otp: '889900',
        otpAttempts: 0,
        expensesConfirmed: false,
        expenses: const [],
      );

      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tripNativeBridgeProvider.overrideWithValue(fakeBridge),
          allTripsProvider.overrideWith((ref) => Stream.value([tripA, tripB])),
          assignedTripsProvider.overrideWith((ref) => Stream.value([tripA, tripB])),
        ],
      );

      // Explicitly select tripB
      container.read(selectedTripIdProvider.notifier).select('TRIP-BBB');

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: TripDetailsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Must show Wipro Limited and Sneha Patel
      expect(find.text('Wipro Limited'), findsOneWidget);
      expect(find.text('Sarjapur Campus Gate 3'), findsOneWidget);
      expect(find.text('Sneha Patel'), findsOneWidget);
      expect(find.text('₹1200.00'), findsOneWidget);
      expect(find.text('₹360.00'), findsOneWidget);

      // Must NOT show Tata Consultancy Services
      expect(find.text('Tata Consultancy Services'), findsNothing);
      expect(find.text('Rajesh Sharma'), findsNothing);
    });

    testWidgets('3. Duty locked online when trip is ongoing; offline toggle blocked', (tester) async {
      const activeDriver = DriverModel(
        id: 101,
        name: 'Rajesh Kumar',
        phone: '9876543210',
        email: 'rajesh@hired.in',
        status: 'ACTIVE',
        isOnline: true,
        rating: 4.88,
        totalTrips: 142,
      );

      final ongoingTrip = TripModel(
        tripId: '8420',
        orderId: 1041,
        status: 'ONGOING',
        companyName: 'Apex Logistics Ltd.',
        pickupSpot: 'Indiranagar Metro Station',
        dropoffSpot: 'Embassy GolfLinks Business Park',
        pickupTime: DateTime.now().toUtc(),
        estimatedReachMinutes: 12,
        contactName: 'Rohan Mehra',
        contactPhone: '+91 98765 43210',
        amount: 1200.0,
        driverShare: 360.0,
        otp: '389102',
        otpAttempts: 0,
        expensesConfirmed: false,
        expenses: const [],
      );

      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tripNativeBridgeProvider.overrideWithValue(fakeBridge),
          driverProfileProvider.overrideWith(
            (ref) => _TestDriverProfileController(activeDriver),
          ),
          allTripsProvider.overrideWith((ref) => Stream.value([ongoingTrip])),
          assignedTripsProvider.overrideWith((ref) => Stream.value([ongoingTrip])),
        ],
      );

      // Initialize controller
      container.read(tripMiniOverlayControllerProvider);
      await container.read(allTripsProvider.future);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: HomeDashboardScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Top duty switch button must show "Now online"
      expect(find.text('Now online'), findsOneWidget);

      // Tap duty switch while trip is ongoing
      await tester.tap(find.byKey(const Key('duty_status_switch')));
      await tester.pumpAndSettle();

      // Must show the Trip in Progress safety dialog
      expect(find.text('Trip in Progress'), findsOneWidget);
      expect(find.textContaining('Corporate safety requires live GPS tracking'), findsOneWidget);

      // Ensure driver stays online
      expect(container.read(driverProfileProvider).value?.isOnline, isTrue);

      container.dispose();
    });

    testWidgets('4. Ongoing TripDetailsScreen renders all cards, expenses and action buttons cleanly', (tester) async {
      final ongoingTrip = TripModel(
        tripId: '8420',
        orderId: 1041,
        status: 'ONGOING',
        companyName: 'Apex Logistics Ltd.',
        pickupSpot: 'Indiranagar Metro Station, 100 Feet Rd, Bengaluru',
        dropoffSpot: 'Embassy GolfLinks Business Park, Domlur, Bengaluru',
        pickupTime: DateTime.now().toUtc(),
        estimatedReachMinutes: 12,
        contactName: 'Rohan Mehra',
        contactPhone: '+91 98765 43210',
        notes: 'Morning corporate commute. Client meeting at 9:45 AM.',
        amount: 1200.00,
        driverShare: 360.00,
        otp: '389102',
        otpAttempts: 0,
        expensesConfirmed: false,
        expenses: const [
          TripExpenseModel(
            expenseId: 500,
            description: 'Parking Ticket - Metro Station',
            amount: 50.00,
          ),
        ],
        startedAt: DateTime.now().toUtc().subtract(const Duration(minutes: 10)),
      );

      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tripNativeBridgeProvider.overrideWithValue(fakeBridge),
          allTripsProvider.overrideWith((ref) => Stream.value([ongoingTrip])),
          assignedTripsProvider.overrideWith((ref) => Stream.value([ongoingTrip])),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const TripDetailsScreen(tripId: '8420'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Must find order overview and top route details
      expect(find.text('Apex Logistics Ltd.'), findsOneWidget);
      expect(find.text('Indiranagar Metro Station, 100 Feet Rd, Bengaluru'), findsOneWidget);
      expect(find.text('Embassy GolfLinks Business Park, Domlur, Bengaluru'), findsOneWidget);
      expect(find.text('Rohan Mehra'), findsOneWidget);

      // Drag down to reveal financial summary and expenses
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -400));
      await tester.pumpAndSettle();

      expect(find.text('FINANCIAL SUMMARY & PAYOUT'), findsOneWidget);
      expect(find.text('TRIP EXPENSES'), findsOneWidget);
      expect(find.text('Add Expense'), findsOneWidget);

      // Drag down further to reveal action buttons
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -400));
      await tester.pumpAndSettle();

      expect(find.text('Complete & Close Trip (OTP)'), findsOneWidget);
      expect(find.text('Cancel Ongoing Trip'), findsOneWidget);

      // Verify top timing badge is NOT present in AppBar
      expect(find.byIcon(Icons.timer_outlined), findsNothing);

      container.dispose();
    });
  });
}

class _TestDriverProfileController extends StateNotifier<AsyncValue<DriverModel?>>
    implements DriverProfileController {
  _TestDriverProfileController(DriverModel initial)
      : super(AsyncValue.data(initial));

  @override
  Future<void> initProfile() async {}

  @override
  Future<void> refresh() async {}

  @override
  Future<bool> toggleDuty({bool force = false}) async {
    final current = state.value;
    if (current == null) return false;
    return false;
  }

  @override
  Future<void> setOnline(bool isOnline) async {
    final current = state.value;
    if (current != null) {
      state = AsyncValue.data(current.copyWith(isOnline: isOnline));
    }
  }

  @override
  Future<void> logout() async {
    state = const AsyncValue.data(null);
  }
}
