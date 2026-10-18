import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/features/trips/application/navigation_launcher_service.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import 'package:driver_app/features/trips/presentation/controllers/trip_mini_overlay_controller.dart';
import 'package:driver_app/features/trips/presentation/widgets/route_card_map_preview.dart';
import 'package:driver_app/features/trips/presentation/widgets/trip_navigate_button.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
  });

  final assignedTrip = TripModel(
    tripId: 'TRIP-NAV-1',
    orderId: 9001,
    status: 'ASSIGNED',
    companyName: 'Infosys Limited',
    pickupSpot: 'Electronic City Gate 1',
    dropoffSpot: 'Koramangala 5th Block',
    pickupTime: DateTime.now().toUtc(),
    estimatedReachMinutes: 25,
    contactName: 'Aarav Sharma',
    contactPhone: '+91 98765 00001',
    amount: 550.0,
    driverShare: 165.0,
    otp: '123456',
    otpAttempts: 0,
    expensesConfirmed: false,
    expenses: const [],
    pickupLat: 12.8452,
    pickupLng: 77.6602,
    dropoffLat: 12.9352,
    dropoffLng: 77.6245,
  );

  final ongoingTrip = assignedTrip.copyWith(status: 'ONGOING');
  final completedTrip = assignedTrip.copyWith(status: 'COMPLETED');
  final noCoordsTrip = assignedTrip.copyWith(pickupLat: 0.0, pickupLng: 0.0);

  group('Trip Navigation & Map Preview Tests', () {
    testWidgets('1. Shows "Navigate to Pickup" before trip starts', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: TripNavigateButton(trip: assignedTrip),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Navigate to Pickup'), findsOneWidget);
      expect(find.byIcon(Icons.navigation_rounded), findsOneWidget);
    });

    testWidgets('2. Shows "Navigate to Destination" when trip is ongoing', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: TripNavigateButton(trip: ongoingTrip),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Navigate to Destination'), findsOneWidget);
    });

    testWidgets('3. Hides Navigate button after trip is completed or cancelled', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: TripNavigateButton(trip: completedTrip),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Navigate to Pickup'), findsNothing);
      expect(find.text('Navigate to Destination'), findsNothing);
    });

    testWidgets('4. Disables Navigate button when coordinates are missing', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: TripNavigateButton(trip: noCoordsTrip),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();
      final buttonFinder = find.byType(ElevatedButton);
      expect(buttonFinder, findsOneWidget);
      final elevatedButton = tester.widget<ElevatedButton>(buttonFinder);
      expect(elevatedButton.onPressed, isNull);
    });

    testWidgets('5. RouteCardMapPreview displays map banner and "Open map" pill', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: RouteCardMapPreview(trip: assignedTrip),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Open map'), findsOneWidget);
    });

    testWidgets('6. Auto-open navigation flag prevents repeated auto-opens per trip', (tester) async {
      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
        ],
      );

      final navService = container.read(navigationLauncherServiceProvider);

      expect(navService.hasAutoOpenedForTrip(assignedTrip.tripId), isFalse);

      // Mark auto opened
      await navService.markAutoOpenedForTrip(assignedTrip.tripId);
      expect(navService.hasAutoOpenedForTrip(assignedTrip.tripId), isTrue);

      // Verify persistent in shared prefs
      expect(prefs.getBool('nav_auto_opened_${assignedTrip.tripId}'), isTrue);
    });

    testWidgets('7. Auto-open setting toggle works and persists', (tester) async {
      final container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
        ],
      );

      // Default is ON (true)
      expect(container.read(autoOpenNavSettingProvider), isTrue);

      // Toggle off
      await container.read(autoOpenNavSettingProvider.notifier).toggle(false);
      expect(container.read(autoOpenNavSettingProvider), isFalse);
      expect(prefs.getBool('auto_open_navigation_setting'), isFalse);

      // Toggle back on
      await container.read(autoOpenNavSettingProvider.notifier).toggle(true);
      expect(container.read(autoOpenNavSettingProvider), isTrue);
      expect(prefs.getBool('auto_open_navigation_setting'), isTrue);
    });
  });
}
