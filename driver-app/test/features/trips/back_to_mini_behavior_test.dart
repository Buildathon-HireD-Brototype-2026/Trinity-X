import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:driver_app/core/routing/app_router.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/features/auth/domain/driver_model.dart';
import 'package:driver_app/features/auth/presentation/controllers/driver_profile_controller.dart';
import 'package:driver_app/features/trips/data/trip_native_bridge.dart';
import 'package:driver_app/features/trips/data/trip_repository.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import 'package:driver_app/features/trips/presentation/controllers/current_trip_provider.dart';
import 'package:driver_app/features/trips/presentation/controllers/trip_mini_overlay_controller.dart';
import 'package:driver_app/features/trips/presentation/widgets/trip_mini_overlay_host.dart';

class MockTestTripNativeBridge extends TripNativeBridge {
  bool sendToBackgroundWithMiniCalled = false;
  bool sendToBackgroundCalled = false;
  bool serviceStarted = false;
  bool serviceStopped = false;
  bool overlayVisible = false;

  void resetCalls() {
    sendToBackgroundWithMiniCalled = false;
    sendToBackgroundCalled = false;
  }

  @override
  Future<bool> checkOverlayPermission() async => true;

  @override
  Future<bool> isPipSupported() async => true;

  @override
  Future<bool> isPipAllowed() async => true;

  @override
  Future<bool> isLowRamDevice() async => false;

  @override
  Future<bool> setAutoEnterPiP(bool enabled) async => true;

  @override
  Future<bool> updateTripState({
    required bool isTripRunning,
    required bool miniDismissed,
  }) async => true;

  @override
  Future<bool> startTripService({
    required TripModel trip,
    required int elapsedSeconds,
    bool overlayVisible = true,
  }) async {
    serviceStarted = true;
    serviceStopped = false;
    this.overlayVisible = overlayVisible;
    return true;
  }

  @override
  Future<bool> updateTripService({
    required TripModel trip,
    required int elapsedSeconds,
  }) async => true;

  @override
  Future<bool> stopTripService() async {
    serviceStopped = true;
    serviceStarted = false;
    overlayVisible = false;
    return true;
  }

  @override
  Future<bool> sendToBackgroundWithMini() async {
    sendToBackgroundWithMiniCalled = true;
    return true;
  }

  @override
  Future<bool> sendToBackground() async {
    sendToBackgroundCalled = true;
    return true;
  }
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
  Future<bool> toggleDuty({bool force = false}) async => true;

  @override
  Future<void> setOnline(bool online) async {
    final current = state.value;
    if (current != null) {
      state = AsyncValue.data(current.copyWith(isOnline: online));
    }
  }

  @override
  Future<void> logout() async {
    state = const AsyncValue.data(null);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;
  late MockTestTripNativeBridge mockBridge;
  late MockTripRepository mockRepo;

  const testDriver = DriverModel(
    id: 99,
    name: 'Ramesh Kumar',
    phone: '9876543210',
    email: 'ramesh@hired.in',
    status: 'ACTIVE',
    rating: 4.95,
    isOnline: true,
  );

  final sampleOngoingTrip = TripModel(
    tripId: 'TRIP-ACTIVE-999',
    orderId: 777,
    status: 'ONGOING',
    companyName: 'Infosys BPM',
    pickupSpot: 'Electronic City Phase 1, Bangalore',
    dropoffSpot: 'Kempegowda International Airport, Terminal 2',
    pickupTime: DateTime.now().subtract(const Duration(minutes: 10)),
    estimatedReachMinutes: 24,
    contactName: 'Sneha Rao',
    contactPhone: '+91 98450 11223',
    startedAt: DateTime.now().subtract(const Duration(minutes: 10)),
  );

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    mockBridge = MockTestTripNativeBridge();
    mockRepo = MockTripRepository();
  });

  Widget buildTestHost({
    required ProviderContainer container,
    required Widget child,
  }) {
    return UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        navigatorKey: rootNavigatorKey,
        home: TripMiniOverlayHost(child: child),
      ),
    );
  }

  group('Back-to-mini ONLY while trip is ongoing - Specification Tests', () {
    testWidgets('1. No trip → Back from the root exits the app normally, with no mini view',
        (tester) async {
      mockRepo.updateTrips([]);

      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tripRepositoryProvider.overrideWithValue(mockRepo),
          tripNativeBridgeProvider.overrideWithValue(mockBridge),
          driverProfileProvider.overrideWith(
            (ref) => _TestDriverProfileController(testDriver),
          ),
        ],
      );

      // Initialize controller
      container.read(tripMiniOverlayControllerProvider);
      await container.read(allTripsProvider.future);

      await tester.pumpWidget(
        buildTestHost(
          container: container,
          child: const Scaffold(
            body: Text('Root Screen - No Trip'),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));

      final overlayState = container.read(tripMiniOverlayControllerProvider);
      expect(overlayState.tripRunning, isFalse,
          reason: 'Single source of truth must report tripRunning == false');

      final popScopeFinder = find.byWidgetPredicate((w) => w is PopScope);
      expect(popScopeFinder, findsOneWidget);
      final PopScope popScope = tester.widget(popScopeFinder) as PopScope;
      expect(popScope.canPop, isTrue,
          reason: 'When tripRunning == false, back interceptor must allow normal system pop (canPop: true)');

      // Simulate system back press
      await tester.binding.handlePopRoute();
      await tester.pump(const Duration(milliseconds: 50));

      expect(mockBridge.sendToBackgroundWithMiniCalled, isFalse,
          reason: 'Must NOT invoke mini view or backgrounding when no trip is running');
      expect(mockBridge.sendToBackgroundCalled, isFalse);

      container.dispose();
    });

    testWidgets('2. Trip running → Back from the root sends the app to the mini view',
        (tester) async {
      mockRepo.updateTrips([sampleOngoingTrip]);

      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tripRepositoryProvider.overrideWithValue(mockRepo),
          tripNativeBridgeProvider.overrideWithValue(mockBridge),
          driverProfileProvider.overrideWith(
            (ref) => _TestDriverProfileController(testDriver),
          ),
        ],
      );

      container.read(tripMiniOverlayControllerProvider);
      await container.read(allTripsProvider.future);

      await tester.pumpWidget(
        buildTestHost(
          container: container,
          child: const Scaffold(
            body: Text('Root Screen - Trip Running'),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));

      final overlayState = container.read(tripMiniOverlayControllerProvider);
      expect(overlayState.tripRunning, isTrue,
          reason: 'tripRunning must be true while trip is ONGOING');

      final popScopeFinder = find.byWidgetPredicate((w) => w is PopScope);
      expect(popScopeFinder, findsOneWidget);
      final PopScope popScope = tester.widget(popScopeFinder) as PopScope;
      expect(popScope.canPop, isFalse,
          reason: 'When tripRunning == true, PopScope interceptor must be enabled (canPop: false)');

      // Simulate back at root (nothing left to pop)
      await tester.binding.handlePopRoute();
      await tester.pump(const Duration(milliseconds: 50));

      expect(mockBridge.sendToBackgroundWithMiniCalled, isTrue,
          reason: 'Back press at root with running trip MUST send app to mini view / moveTaskToBack');
      expect(container.read(tripMiniOverlayControllerProvider).tripRunning, isTrue,
          reason: 'Trip keeps running and app stays in Recents');

      container.dispose();
    });

    testWidgets('3. Back with screens on stack pops normally until root, only triggers mini at root',
        (tester) async {
      mockRepo.updateTrips([sampleOngoingTrip]);

      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tripRepositoryProvider.overrideWithValue(mockRepo),
          tripNativeBridgeProvider.overrideWithValue(mockBridge),
          driverProfileProvider.overrideWith(
            (ref) => _TestDriverProfileController(testDriver),
          ),
        ],
      );

      container.read(tripMiniOverlayControllerProvider);
      await container.read(allTripsProvider.future);

      await tester.pumpWidget(
        buildTestHost(
          container: container,
          child: const Scaffold(
            body: Text('Root Screen'),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));

      // Push a second screen onto the navigation stack
      rootNavigatorKey.currentState!.push(
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => const Scaffold(body: Text('Pushed Details Screen')),
          transitionDuration: Duration.zero,
          reverseTransitionDuration: Duration.zero,
        ),
      );
      await tester.pump();

      expect(find.text('Pushed Details Screen'), findsOneWidget);
      expect(rootNavigatorKey.currentState!.canPop(), isTrue);

      mockBridge.resetCalls();

      // 1st Back: Should pop the pushed screen normally
      await tester.binding.handlePopRoute();
      await tester.pump();

      expect(find.text('Pushed Details Screen'), findsNothing);
      expect(find.text('Root Screen'), findsOneWidget);
      expect(mockBridge.sendToBackgroundWithMiniCalled, isFalse,
          reason: 'Screen on stack was popped normally; mini view must NOT be triggered yet');

      // 2nd Back: Now at root (canPop == false), must send to mini view
      // Wait past debounce duration (350ms)
      await tester.pump(const Duration(milliseconds: 400));
      await tester.binding.handlePopRoute();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(mockBridge.sendToBackgroundWithMiniCalled, isTrue,
          reason: 'Back at root now triggers sendAppToBackgroundWithMini');

      container.dispose();
    });

    testWidgets('4. End the trip → Back from the root exits normally',
        (tester) async {
      mockRepo.updateTrips([sampleOngoingTrip]);

      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tripRepositoryProvider.overrideWithValue(mockRepo),
          tripNativeBridgeProvider.overrideWithValue(mockBridge),
          driverProfileProvider.overrideWith(
            (ref) => _TestDriverProfileController(testDriver),
          ),
        ],
      );

      container.read(tripMiniOverlayControllerProvider);
      await container.read(allTripsProvider.future);

      await tester.pumpWidget(
        buildTestHost(
          container: container,
          child: const Scaffold(body: Text('Root Screen')),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));

      expect(container.read(tripMiniOverlayControllerProvider).tripRunning, isTrue);

      // Now end the trip (status completed/closed)
      final closedTrip = sampleOngoingTrip.copyWith(status: 'CLOSED');
      mockRepo.updateTrips([closedTrip]);
      await tester.pump(const Duration(milliseconds: 50));

      expect(container.read(tripMiniOverlayControllerProvider).tripRunning, isFalse,
          reason: 'tripRunning must become false immediately when trip is ended');

      mockBridge.resetCalls();

      final PopScope popScope =
          tester.widget(find.byWidgetPredicate((w) => w is PopScope)) as PopScope;
      expect(popScope.canPop, isTrue,
          reason: 'Back interceptor is disabled the moment trip ends');

      // Press Back at root
      await tester.binding.handlePopRoute();
      await tester.pump(const Duration(milliseconds: 50));

      expect(mockBridge.sendToBackgroundWithMiniCalled, isFalse,
          reason: 'Ended trip must NOT trigger mini view on back');

      container.dispose();
    });

    testWidgets('5. Start a trip → the interceptor works right away without app restart',
        (tester) async {
      mockRepo.updateTrips([]);

      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tripRepositoryProvider.overrideWithValue(mockRepo),
          tripNativeBridgeProvider.overrideWithValue(mockBridge),
          driverProfileProvider.overrideWith(
            (ref) => _TestDriverProfileController(testDriver),
          ),
        ],
      );

      container.read(tripMiniOverlayControllerProvider);
      await container.read(allTripsProvider.future);

      await tester.pumpWidget(
        buildTestHost(
          container: container,
          child: const Scaffold(body: Text('Root Screen')),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));

      expect(container.read(tripMiniOverlayControllerProvider).tripRunning, isFalse);
      PopScope popScope =
          tester.widget(find.byWidgetPredicate((w) => w is PopScope)) as PopScope;
      expect(popScope.canPop, isTrue);

      // Trip starts dynamically (no app restart)
      mockRepo.updateTrips([sampleOngoingTrip]);
      await tester.pump(const Duration(milliseconds: 50));

      expect(container.read(tripMiniOverlayControllerProvider).tripRunning, isTrue);
      popScope =
          tester.widget(find.byWidgetPredicate((w) => w is PopScope)) as PopScope;
      expect(popScope.canPop, isFalse,
          reason: 'Interceptor enabled right away as soon as trip starts');

      mockBridge.resetCalls();
      await tester.binding.handlePopRoute();
      await tester.pump(const Duration(milliseconds: 50));

      expect(mockBridge.sendToBackgroundWithMiniCalled, isTrue,
          reason: 'Back at root immediately routes to mini view once trip starts');

      container.dispose();
    });

    testWidgets('6. Debounce prevents rapid multi-tap spam from double-triggering background',
        (tester) async {
      mockRepo.updateTrips([sampleOngoingTrip]);

      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tripRepositoryProvider.overrideWithValue(mockRepo),
          tripNativeBridgeProvider.overrideWithValue(mockBridge),
          driverProfileProvider.overrideWith(
            (ref) => _TestDriverProfileController(testDriver),
          ),
        ],
      );

      container.read(tripMiniOverlayControllerProvider);
      await container.read(allTripsProvider.future);

      await tester.pumpWidget(
        buildTestHost(
          container: container,
          child: const Scaffold(body: Text('Root Screen')),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));

      mockBridge.resetCalls();

      // First tap
      await tester.binding.handlePopRoute();
      expect(mockBridge.sendToBackgroundWithMiniCalled, isTrue);

      mockBridge.resetCalls();

      // Immediate second tap within 50ms (well under 350ms debounce)
      await tester.pump(const Duration(milliseconds: 50));
      await tester.binding.handlePopRoute();

      expect(mockBridge.sendToBackgroundWithMiniCalled, isFalse,
          reason: 'Rapid back taps must be debounced');

      container.dispose();
    });
  });
}
