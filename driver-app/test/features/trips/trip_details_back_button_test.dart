import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:driver_app/core/routing/app_router.dart';
import 'package:driver_app/core/routing/route_names.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/features/trips/data/trip_native_bridge.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import 'package:driver_app/features/trips/presentation/controllers/current_trip_provider.dart';
import 'package:driver_app/features/trips/presentation/controllers/trip_mini_overlay_controller.dart';
import 'package:driver_app/features/trips/presentation/trip_details_screen.dart';
import 'package:driver_app/features/trips/presentation/widgets/trip_mini_overlay_host.dart';

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

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final testTrip = TripModel(
    tripId: 'TRIP-101',
    orderId: 5001,
    status: 'ONGOING',
    companyName: 'Company Alpha',
    pickupSpot: 'Alpha Gate 1',
    dropoffSpot: 'Alpha Tower',
    pickupTime: DateTime.now().toUtc(),
    startedAt: DateTime.now().toUtc().subtract(const Duration(minutes: 5)),
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

  testWidgets('TripDetailsScreen back button when launched directly at /trip-details (no previous route) navigates to home', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    final router = GoRouter(
      navigatorKey: rootNavigatorKey,
      initialLocation: RouteNames.tripDetails,
      routes: [
        GoRoute(
          path: RouteNames.home,
          builder: (context, state) => const Scaffold(body: Text('HOME_SCREEN')),
        ),
        GoRoute(
          path: RouteNames.tripDetails,
          name: RouteNames.tripDetails,
          builder: (context, state) => const TripDetailsScreen(tripId: 'TRIP-101'),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tripNativeBridgeProvider.overrideWithValue(_FakeBridge()),
          allTripsProvider.overrideWith((ref) => Stream.value([testTrip])),
        ],
        child: MaterialApp.router(
          routerConfig: router,
          builder: (context, child) => TripMiniOverlayHost(child: child ?? const SizedBox.shrink()),
        ),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.text('Trip Details'), findsOneWidget);

    final backBtn = find.byTooltip('Back');
    expect(backBtn, findsOneWidget);

    await tester.tap(backBtn);
    await tester.pumpAndSettle();

    expect(find.text('HOME_SCREEN'), findsOneWidget);
  });
}
