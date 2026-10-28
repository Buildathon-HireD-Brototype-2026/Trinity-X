import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/features/auth/domain/driver_model.dart';
import 'package:driver_app/features/auth/presentation/controllers/driver_profile_controller.dart';
import 'package:driver_app/features/trips/data/trip_native_bridge.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import 'package:driver_app/features/trips/presentation/controllers/current_trip_provider.dart';
import 'package:driver_app/features/trips/presentation/controllers/trip_mini_overlay_controller.dart';
import 'package:driver_app/features/trips/presentation/trip_details_screen.dart';
import 'package:driver_app/features/trips/presentation/widgets/go_online_dialog.dart';

class _FakeBridge implements TripNativeBridge {
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
  Future<bool> updateDriverCoordinates({required double lat, required double lng}) async => true;
  @override
  Future<Map<String, dynamic>> checkPendingOpenTrip() async => {'should_open': false, 'trip_id': null};
  @override
  void dispose() {}
}

class FakeOfflineDriverNotifier extends StateNotifier<AsyncValue<DriverModel?>>
    implements DriverProfileController {
  FakeOfflineDriverNotifier({bool isOnline = false})
      : super(AsyncValue.data(DriverModel(
          id: 1,
          name: 'Arjun Test',
          phone: '+919876543210',
          email: 'arjun@test.com',
          status: 'ACTIVE',
          isOnline: isOnline,
        )));

  @override
  Future<void> setOnline(bool isOnline) async {
    final cur = state.value;
    if (cur != null) {
      state = AsyncValue.data(cur.copyWith(isOnline: isOnline));
    }
  }

  @override
  Future<bool> toggleDuty({bool force = false}) async {
    final cur = state.value;
    if (cur != null) {
      final next = !cur.isOnline;
      state = AsyncValue.data(cur.copyWith(isOnline: next));
      return true;
    }
    return false;
  }

  @override
  Future<void> initProfile() async {}

  @override
  Future<void> refresh() async {}

  @override
  Future<void> logout() async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
  });

  final sampleAssignedTrip = TripModel(
    tripId: 'TRIP-101',
    orderId: 101,
    status: 'ASSIGNED',
    pickupSpot: 'Kochi Hub',
    dropoffSpot: 'Infopark',
    pickupTime: DateTime.now().add(const Duration(minutes: 30)),
    pickupLat: 9.9312,
    pickupLng: 76.2673,
    dropoffLat: 10.0158,
    dropoffLng: 76.4019,
  );

  group('GoOnlineDialog Widget Tests', () {
    testWidgets('GoOnlineDialog renders offline notice and buttons', (tester) async {
      final notifier = FakeOfflineDriverNotifier(isOnline: false);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            driverProfileProvider.overrideWith((ref) => notifier),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: GoOnlineDialog(),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Go Online to Start Trip'), findsOneWidget);
      expect(find.text('CURRENTLY OFFLINE'), findsOneWidget);
      expect(find.byKey(const Key('go_online_dialog_confirm_button')), findsOneWidget);
      expect(find.byKey(const Key('go_online_dialog_cancel_button')), findsOneWidget);
    });

    testWidgets('Tapping Go Online in GoOnlineDialog updates driver duty to online', (tester) async {
      final notifier = FakeOfflineDriverNotifier(isOnline: false);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            driverProfileProvider.overrideWith((ref) => notifier),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => ElevatedButton(
                  onPressed: () => GoOnlineDialog.show(context),
                  child: const Text('Show Dialog'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Show Dialog'));
      await tester.pumpAndSettle();

      expect(find.byType(GoOnlineDialog), findsOneWidget);
      expect(notifier.state.value?.isOnline, isFalse);

      await tester.tap(find.byKey(const Key('go_online_dialog_confirm_button')));
      await tester.pumpAndSettle();

      expect(find.byType(GoOnlineDialog), findsNothing);
      expect(notifier.state.value?.isOnline, isTrue);
    });
  });

  group('TripDetailsScreen Online Check Tests', () {
    testWidgets('When driver is offline, tapping Start Trip displays GoOnlineDialog', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      final notifier = FakeOfflineDriverNotifier(isOnline: false);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            tripNativeBridgeProvider.overrideWithValue(_FakeBridge()),
            driverProfileProvider.overrideWith((ref) => notifier),
            allTripsProvider.overrideWith((ref) => Stream.value([sampleAssignedTrip])),
          ],
          child: const MaterialApp(
            home: TripDetailsScreen(tripId: 'TRIP-101'),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final startTripButton = find.widgetWithText(ElevatedButton, 'Start Trip');
      expect(startTripButton, findsOneWidget);

      await tester.ensureVisible(startTripButton);
      await tester.pump();

      // Tap Start Trip while offline
      await tester.tap(startTripButton);
      await tester.pumpAndSettle();

      // Verify GoOnlineDialog is displayed
      expect(find.byType(GoOnlineDialog), findsOneWidget);
      expect(find.text('Go Online to Start Trip'), findsOneWidget);
      expect(find.text('CURRENTLY OFFLINE'), findsOneWidget);

      // Tap Stay Offline
      await tester.tap(find.byKey(const Key('go_online_dialog_cancel_button')));
      await tester.pumpAndSettle();

      // Dialog closes and driver stays offline
      expect(find.byType(GoOnlineDialog), findsNothing);
      expect(notifier.state.value?.isOnline, isFalse);
    });

    testWidgets('When driver goes online via GoOnlineDialog, pre-trip verification modal opens', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      final notifier = FakeOfflineDriverNotifier(isOnline: false);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            tripNativeBridgeProvider.overrideWithValue(_FakeBridge()),
            driverProfileProvider.overrideWith((ref) => notifier),
            allTripsProvider.overrideWith((ref) => Stream.value([sampleAssignedTrip])),
          ],
          child: const MaterialApp(
            home: TripDetailsScreen(tripId: 'TRIP-101'),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final startTripButton = find.widgetWithText(ElevatedButton, 'Start Trip');
      await tester.ensureVisible(startTripButton);
      await tester.pump();

      // Tap Start Trip while offline
      await tester.tap(startTripButton);
      await tester.pumpAndSettle();

      expect(find.byType(GoOnlineDialog), findsOneWidget);

      // Tap Go Online
      await tester.tap(find.byKey(const Key('go_online_dialog_confirm_button')));
      await tester.pumpAndSettle();

      // Driver is now online and Pre-Trip verification modal is displayed
      expect(notifier.state.value?.isOnline, isTrue);
      expect(find.byType(GoOnlineDialog), findsNothing);
      expect(find.text('Pre-Trip Driver Verification'), findsOneWidget);
    });
  });
}
