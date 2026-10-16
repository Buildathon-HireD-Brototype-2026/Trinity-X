import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/features/auth/domain/driver_model.dart';
import 'package:driver_app/features/auth/presentation/controllers/driver_profile_controller.dart';
import 'package:driver_app/features/trips/data/trip_native_bridge.dart';
import 'package:driver_app/features/trips/data/trip_repository.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import 'package:driver_app/features/trips/presentation/controllers/current_trip_provider.dart';
import 'package:driver_app/features/trips/presentation/controllers/trip_mini_overlay_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeTripNativeBridge extends TripNativeBridge {
  bool serviceStarted = false;
  bool serviceStopped = false;
  bool overlayVisible = true;
  int lastElapsed = 0;

  bool autoPiPEnabled = false;
  bool nativeTripRunning = false;
  bool nativeMiniDismissed = false;

  @override
  Future<bool> isLowRamDevice() async => false;

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
  Future<bool> setAutoEnterPiP(bool enabled) async {
    autoPiPEnabled = enabled;
    return true;
  }

  @override
  Future<bool> updateTripState({
    required bool isTripRunning,
    required bool miniDismissed,
  }) async {
    nativeTripRunning = isTripRunning;
    nativeMiniDismissed = miniDismissed;
    return true;
  }

  @override
  Future<bool> startTripService({
    required TripModel trip,
    required int elapsedSeconds,
    bool overlayVisible = true,
  }) async {
    serviceStarted = true;
    serviceStopped = false;
    this.overlayVisible = overlayVisible;
    lastElapsed = elapsedSeconds;
    return true;
  }

  @override
  Future<bool> updateTripService({
    required TripModel trip,
    required int elapsedSeconds,
  }) async {
    lastElapsed = elapsedSeconds;
    return true;
  }

  @override
  Future<bool> setOverlayVisible(bool visible) async {
    overlayVisible = visible;
    return true;
  }

  @override
  Future<bool> stopTripService() async {
    serviceStopped = true;
    serviceStarted = false;
    return true;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ProviderContainer container;
  late MockTripRepository mockRepo;
  late FakeTripNativeBridge fakeBridge;
  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    mockRepo = MockTripRepository();
    fakeBridge = FakeTripNativeBridge();

    container = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        tripRepositoryProvider.overrideWithValue(mockRepo),
        tripNativeBridgeProvider.overrideWithValue(fakeBridge),
      ],
    );
    // Initialize controller and initial trips
    container.read(tripMiniOverlayControllerProvider);
    await container.read(allTripsProvider.future);
  });

  tearDown(() {
    container.dispose();
  });

  group('Ongoing Trip Mini Screen - State & Lifecycle Architecture Tests', () {
    test('1. When trip status is ASSIGNED, mini screen is not visible', () async {
      // Set all trips to ASSIGNED
      final trips = (await mockRepo.getTrips()).map((t) => t.copyWith(status: 'ASSIGNED')).toList();
      mockRepo.updateTrips(trips);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final state = container.read(tripMiniOverlayControllerProvider);
      expect(state.isTripOngoing, isFalse);
      expect(state.shouldShowInAppMiniCard, isFalse);
    });

    test('2. When trip status transitions to ONGOING, mini screen activates and service starts', () async {
      final trips = await mockRepo.getTrips();
      final firstTrip = trips.first;

      await mockRepo.startTrip(firstTrip.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final state = container.read(tripMiniOverlayControllerProvider);
      expect(state.isTripOngoing, isTrue);
      expect(state.ongoingTrip?.tripId, equals(firstTrip.tripId));
      expect(fakeBridge.serviceStarted, isTrue);
    });

    test('3. In-App mini card is visible on /home and auto-hides on /trip-details', () async {
      final trips = await mockRepo.getTrips();
      await mockRepo.startTrip(trips.first.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      // On /home: Should show
      notifier.updateCurrentRoute('/home');
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isTrue);

      // On /trips: Should show
      notifier.updateCurrentRoute('/trips');
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isTrue);

      // On /trip-details: Must auto-hide
      notifier.updateCurrentRoute('/trip-details');
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse);

      // Returning to /home: Shows again
      notifier.updateCurrentRoute('/home');
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isTrue);
    });

    test('4. Closing outside overlay with (X) closes ONLY overlay UI, keeping trip and service running', () async {
      final trips = await mockRepo.getTrips();
      await mockRepo.startTrip(trips.first.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);
      await notifier.setOutsideOverlayVisible(false);

      final state = container.read(tripMiniOverlayControllerProvider);
      // Overlay UI is hidden
      expect(state.isOutsideOverlayVisible, isFalse);
      expect(fakeBridge.overlayVisible, isFalse);

      // BUT Trip is still running, service is NOT stopped
      expect(state.isTripOngoing, isTrue);
      expect(fakeBridge.serviceStopped, isFalse);
      expect(fakeBridge.serviceStarted, isTrue);
    });

    test('5. Cancelling trip inside full screen stops tracking and tears down service', () async {
      final trips = await mockRepo.getTrips();
      final tripId = trips.first.tripId;
      await mockRepo.startTrip(tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      expect(container.read(tripMiniOverlayControllerProvider).isTripOngoing, isTrue);

      // Cancel trip
      await mockRepo.cancelTrip(tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final state = container.read(tripMiniOverlayControllerProvider);
      expect(state.isTripOngoing, isFalse);
      expect(state.shouldShowInAppMiniCard, isFalse);
      expect(fakeBridge.serviceStopped, isTrue);
    });

    test('6. Completing trip with OTP stops tracking and tears down service', () async {
      final trips = await mockRepo.getTrips();
      final tripId = trips.first.tripId;
      await mockRepo.startTrip(tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      expect(container.read(tripMiniOverlayControllerProvider).isTripOngoing, isTrue);

      // Complete trip
      await mockRepo.completeTrip(tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final state = container.read(tripMiniOverlayControllerProvider);
      expect(state.isTripOngoing, isFalse);
      expect(state.shouldShowInAppMiniCard, isFalse);
      expect(fakeBridge.serviceStopped, isTrue);
    });

    test('7. Elapsed time formats properly into MM:SS and HH:MM:SS', () {
      const state1 = TripMiniOverlayState(elapsedSeconds: 75);
      expect(state1.formattedTime, equals('01:15'));

      const state2 = TripMiniOverlayState(elapsedSeconds: 3665);
      expect(state2.formattedTime, equals('01:01:05'));
    });

    test('8. When mini screen is closed by user, visiting /trip-details resets visibility and reappears when leaving', () async {
      final trips = await mockRepo.getTrips();
      await mockRepo.startTrip(trips.first.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      // User is on /home and closes the mini card
      notifier.updateCurrentRoute('/home');
      notifier.dismissInAppCard();
      await notifier.setOutsideOverlayVisible(false);

      var state = container.read(tripMiniOverlayControllerProvider);
      expect(state.isInAppVisible, isFalse);
      expect(state.isOutsideOverlayVisible, isFalse);
      expect(state.shouldShowInAppMiniCard, isFalse);

      // User visits ongoing trip details screen
      notifier.updateCurrentRoute('/trip-details');

      state = container.read(tripMiniOverlayControllerProvider);
      // Visibility flags are reset to true
      expect(state.isInAppVisible, isTrue);
      expect(state.isOutsideOverlayVisible, isTrue);
      // But hidden while on /trip-details
      expect(state.shouldShowInAppMiniCard, isFalse);

      // Now user leaves the trip details screen (e.g. back to /home)
      notifier.updateCurrentRoute('/home');

      state = container.read(tripMiniOverlayControllerProvider);
      // Mini screen reappears!
      expect(state.shouldShowInAppMiniCard, isTrue);
      expect(state.isOutsideOverlayVisible, isTrue);
    });

    test('9. Full dismiss & re-show cycle: close mini -> trip & service keep running -> return to trip screen -> leave -> mini reappears', () async {
      final trips = await mockRepo.getTrips();
      await mockRepo.startTrip(trips.first.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      // Start on trip details screen
      notifier.updateCurrentRoute('/trip-details');
      expect(container.read(tripMiniOverlayControllerProvider).miniDismissed, isFalse);

      // Driver leaves to /home: mini shows
      notifier.updateCurrentRoute('/home');
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isTrue);

      // Driver dismisses mini card (X)
      notifier.dismissInAppCard();
      expect(container.read(tripMiniOverlayControllerProvider).miniDismissed, isTrue);
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse);

      // Trip, background tracking, and foreground service are completely intact
      expect(container.read(tripMiniOverlayControllerProvider).isTripOngoing, isTrue);
      expect(fakeBridge.serviceStopped, isFalse);
      expect(fakeBridge.serviceStarted, isTrue);

      // Driver returns to trip screen (via Recents, notification, or menu)
      notifier.updateCurrentRoute('/trip-details');
      // miniDismissed must be reset to false!
      expect(container.read(tripMiniOverlayControllerProvider).miniDismissed, isFalse);

      // Driver leaves again (back button or navigating away): mini pops up again!
      notifier.updateCurrentRoute('/trips');
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isTrue);
    });

    test('10. Auto-PiP state synchronization: enabled when trip running, disabled when dismissed or ended', () async {
      final trips = await mockRepo.getTrips();
      await mockRepo.startTrip(trips.first.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      // Ongoing trip enables auto PiP in native layer
      expect(fakeBridge.autoPiPEnabled, isTrue);

      // When user dismisses mini float, auto PiP is paused
      notifier.dismissInAppCard();
      expect(fakeBridge.autoPiPEnabled, isFalse);

      // When user reopens trip details screen, auto PiP is re-enabled
      notifier.updateCurrentRoute('/trip-details');
      expect(fakeBridge.autoPiPEnabled, isTrue);

      // When trip ends, auto PiP is disabled and service stops
      await mockRepo.completeTrip(trips.first.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(fakeBridge.autoPiPEnabled, isFalse);
      expect(fakeBridge.serviceStopped, isTrue);
    });

    test('11. In-app navigation while dismissed: stays hidden across other screens until trip page is visited', () async {
      final trips = await mockRepo.getTrips();
      await mockRepo.startTrip(trips.first.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      // On home: mini is visible
      notifier.updateCurrentRoute('/home');
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isTrue);

      // Driver dismisses mini (X)
      notifier.dismissInAppCard();
      expect(container.read(tripMiniOverlayControllerProvider).miniDismissed, isTrue);
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse);

      // Navigate to /trips: stays hidden
      notifier.updateCurrentRoute('/trips');
      expect(container.read(tripMiniOverlayControllerProvider).miniDismissed, isTrue);
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse);

      // Navigate to /profile: stays hidden
      notifier.updateCurrentRoute('/profile');
      expect(container.read(tripMiniOverlayControllerProvider).miniDismissed, isTrue);
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse);

      // Now open Ongoing Trip page: triggers exit animation, then completes to hide
      notifier.updateCurrentRoute('/trip-details');
      expect(container.read(tripMiniOverlayControllerProvider).miniDismissed, isFalse);
      expect(container.read(tripMiniOverlayControllerProvider).isOnTripPage, isTrue);
      // While exiting animation plays, it's completing to false:
      notifier.completeExitToTripPage();
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse);

      // Driver presses back: returns to /home -> mini float reappears!
      notifier.updateCurrentRoute('/home');
      expect(container.read(tripMiniOverlayControllerProvider).isOnTripPage, isFalse);
      expect(container.read(tripMiniOverlayControllerProvider).miniDismissed, isFalse);
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isTrue);
    });

    test('12. Repeat close -> open trip page -> back cycle 5 times cleanly with no duplicates', () async {
      final trips = await mockRepo.getTrips();
      await mockRepo.startTrip(trips.first.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      for (int i = 1; i <= 5; i++) {
        // Step A: Driver is outside trip page, mini is visible
        notifier.updateCurrentRoute('/home');
        expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isTrue,
            reason: 'Iteration $i: mini should be visible on /home');

        // Step B: Driver dismisses mini
        notifier.dismissInAppCard();
        expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse,
            reason: 'Iteration $i: mini should be hidden after dismiss');

        // Step C: Driver opens Ongoing Trip page
        notifier.setTripPageForeground(true);
        expect(container.read(tripMiniOverlayControllerProvider).miniDismissed, isFalse,
            reason: 'Iteration $i: miniDismissed must reset to false on trip page');
        notifier.completeExitToTripPage();
        expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse,
            reason: 'Iteration $i: mini must be hidden on trip page');

        // Step D: Driver presses back
        notifier.setTripPageForeground(false);
        expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isTrue,
            reason: 'Iteration $i: mini must reappear on back');
      }
    });

    test('13. Trip ends while on the trip page: no mini on back', () async {
      final trips = await mockRepo.getTrips();
      final tripId = trips.first.tripId;
      await mockRepo.startTrip(tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      // On trip details page
      notifier.setTripPageForeground(true);
      expect(container.read(tripMiniOverlayControllerProvider).isOnTripPage, isTrue);

      // Complete trip with OTP while on page
      await mockRepo.completeTrip(tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      // Trip is no longer ongoing
      expect(container.read(tripMiniOverlayControllerProvider).isTripOngoing, isFalse);

      // Driver presses back
      notifier.setTripPageForeground(false);
      // Mini must NEVER show because trip has ended
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse);
    });

    test('14. Low-spec device and lite mode: enables lite mode for low RAM / older SDK', () async {
      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      // Initially default state
      expect(container.read(tripMiniOverlayControllerProvider).isLiteMode, isFalse);

      // Simulate low-spec device detection
      container.read(tripMiniOverlayControllerProvider.notifier).state =
          container.read(tripMiniOverlayControllerProvider).copyWith(isLowSpecDevice: true);
      expect(container.read(tripMiniOverlayControllerProvider).isLiteMode, isTrue);

      // Or toggle manual reduce-animations setting
      notifier.setReduceAnimations(true);
      expect(container.read(tripMiniOverlayControllerProvider).manualReduceAnimations, isTrue);
      expect(container.read(tripMiniOverlayControllerProvider).isLiteMode, isTrue);
    });

    test('15. Remove animations setting persists in SharedPreferences and disables spring physics', () async {
      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      notifier.setReduceAnimations(true);
      expect(prefs.getBool('reduce_animations_setting'), isTrue);

      notifier.setReduceAnimations(false);
      expect(prefs.getBool('reduce_animations_setting'), isFalse);
    });

    test('16. Mini visible -> open Ongoing Trip page triggers exit animation and unmounts cleanly with no ghost', () async {
      final trips = await mockRepo.getTrips();
      await mockRepo.startTrip(trips.first.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      // Mini visible on /home
      notifier.updateCurrentRoute('/home');
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isTrue);

      // Push to trip page begins
      notifier.startExitToTripPage();
      expect(container.read(tripMiniOverlayControllerProvider).isExitingToTripPage, isTrue);
      expect(container.read(tripMiniOverlayControllerProvider).isOnTripPage, isTrue);

      // Exit animation ends -> unmount widget from tree
      notifier.completeExitToTripPage();
      expect(container.read(tripMiniOverlayControllerProvider).isExitingToTripPage, isFalse);
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse);
    });

    test('17. Entering page while mini is already dismissed (X) -> no exit animation, cleanly sets isOnTripPage', () async {
      final trips = await mockRepo.getTrips();
      await mockRepo.startTrip(trips.first.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      // User dismisses mini on home
      notifier.dismissInAppCard();
      expect(container.read(tripMiniOverlayControllerProvider).miniDismissed, isTrue);

      // Now push to trip page starts
      notifier.startExitToTripPage();
      // Should not play exit animation because it was already dismissed
      expect(container.read(tripMiniOverlayControllerProvider).isExitingToTripPage, isFalse);
      expect(container.read(tripMiniOverlayControllerProvider).isOnTripPage, isTrue);
      expect(container.read(tripMiniOverlayControllerProvider).miniDismissed, isFalse);
      expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse);
    });

    test('18. Rapid push/pop 5 times quickly without glitch or duplicate mini floats', () async {
      final trips = await mockRepo.getTrips();
      await mockRepo.startTrip(trips.first.tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final notifier = container.read(tripMiniOverlayControllerProvider.notifier);

      for (int i = 0; i < 5; i++) {
        // Quick push
        notifier.startExitToTripPage();
        notifier.completeExitToTripPage();
        expect(container.read(tripMiniOverlayControllerProvider).isOnTripPage, isTrue);
        expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isFalse);

        // Immediate pop
        notifier.setTripPageForeground(false);
        expect(container.read(tripMiniOverlayControllerProvider).isOnTripPage, isFalse);
        expect(container.read(tripMiniOverlayControllerProvider).shouldShowInAppMiniCard, isTrue);
      }
    });

    test('19. Ongoing trip links duty: Driver cannot go offline while trip is ongoing, toggleDuty is blocked', () async {
      final trips = await mockRepo.getTrips();
      final tripId = trips.first.tripId;

      // Start the trip -> triggers ONGOING
      await mockRepo.startTrip(tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));

      expect(container.read(tripMiniOverlayControllerProvider).isTripOngoing, isTrue);

      // Initialize driver profile as online
      const onlineDriver = DriverModel(
        id: 101,
        name: 'Rajesh Sharma',
        phone: '+919876543210',
        status: 'ACTIVE',
        isOnline: true,
      );
      container.read(driverProfileProvider.notifier).state = const AsyncValue.data(onlineDriver);

      // Attempt to toggle duty to offline while trip is ongoing
      final result = await container.read(driverProfileProvider.notifier).toggleDuty();

      // Must be blocked!
      expect(result, isFalse);
      expect(container.read(driverProfileProvider).value?.isOnline, isTrue);

      // Complete the trip
      await mockRepo.completeTrip(tripId);
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(container.read(tripMiniOverlayControllerProvider).isTripOngoing, isFalse);

      // Now toggling offline succeeds!
      final offlineResult = await container.read(driverProfileProvider.notifier).toggleDuty();
      expect(offlineResult, isTrue);
      expect(container.read(driverProfileProvider).value?.isOnline, isFalse);
    });
  });
}
