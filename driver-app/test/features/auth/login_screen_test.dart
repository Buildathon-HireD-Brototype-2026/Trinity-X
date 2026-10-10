import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver_app/core/routing/app_router.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/core/storage/secure_storage_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeSecureStorageService extends SecureStorageService {
  final Map<String, String> data = {};

  FakeSecureStorageService() : super(const FlutterSecureStorage());

  @override
  Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required int driverId,
    required String driverName,
  }) async {
    data['auth_access_token'] = accessToken;
    data['auth_refresh_token'] = refreshToken;
    data['auth_driver_id'] = driverId.toString();
    data['auth_driver_name'] = driverName;
  }

  @override
  Future<String?> getAccessToken() async => data['auth_access_token'];

  @override
  Future<int?> getDriverId() async {
    final val = data['auth_driver_id'];
    return val != null ? int.tryParse(val) : null;
  }

  @override
  Future<String?> getDriverName() async => data['auth_driver_name'];

  @override
  Future<bool> hasValidSession() async => data['auth_access_token'] != null;

  @override
  Future<void> clearSession() async {
    data.clear();
  }
}

Widget createTestApp({
  required SharedPreferences prefs,
  required FakeSecureStorageService secureStorage,
}) {
  return ProviderScope(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      secureStorageServiceProvider.overrideWithValue(secureStorage),
    ],
    child: Consumer(
      builder: (context, ref, child) {
        final router = ref.watch(appRouterProvider);
        return MaterialApp.router(
          routerConfig: router,
        );
      },
    ),
  );
}

void main() {
  late SharedPreferences prefs;
  late FakeSecureStorageService fakeSecureStorage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    fakeSecureStorage = FakeSecureStorageService();
  });

  group('Page 1: Login Screen Tests (TDD Scenarios)', () {
    testWidgets('TC-P01-07: Password visibility toggles plain text & obscured text',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestApp(prefs: prefs, secureStorage: fakeSecureStorage),
      );

      // Advance splash screen
      await tester.pump(const Duration(milliseconds: 1300));
      await tester.pumpAndSettle();

      final passwordField = find.byKey(const Key('password_input_field'));
      expect(passwordField, findsOneWidget);

      final toggleButton = find.byKey(const Key('toggle_password_visibility_button'));
      expect(toggleButton, findsOneWidget);

      // Initially obscured
      final editableTextInitial = tester.widget<EditableText>(
        find.descendant(of: passwordField, matching: find.byType(EditableText)),
      );
      expect(editableTextInitial.obscureText, isTrue);

      // Tap toggle button
      await tester.tap(toggleButton);
      await tester.pump();

      // Now visible
      final editableTextToggled = tester.widget<EditableText>(
        find.descendant(of: passwordField, matching: find.byType(EditableText)),
      );
      expect(editableTextToggled.obscureText, isFalse);
    });

    testWidgets('TC-P01-03: Phone validation blocks invalid numbers',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestApp(prefs: prefs, secureStorage: fakeSecureStorage),
      );

      await tester.pump(const Duration(milliseconds: 1300));
      await tester.pumpAndSettle();

      // Enter incomplete 5-digit number
      await tester.enterText(find.byKey(const Key('phone_input_field')), '12345');
      await tester.enterText(find.byKey(const Key('password_input_field')), 'Driver@123');

      // Tap submit
      await tester.ensureVisible(find.byKey(const Key('login_submit_button')));
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pumpAndSettle();

      // Verify validation message
      expect(find.text('Enter a valid 10-digit phone number'), findsOneWidget);
    });

    testWidgets('TC-P01-04: Invalid password shows attempt warning',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestApp(prefs: prefs, secureStorage: fakeSecureStorage),
      );

      await tester.pump(const Duration(milliseconds: 1300));
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('phone_input_field')), '9876543210');
      await tester.enterText(find.byKey(const Key('password_input_field')), 'WrongPass123');

      await tester.ensureVisible(find.byKey(const Key('login_submit_button')));
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pump(); // Start request
      await tester.pump(const Duration(milliseconds: 700)); // Complete mock latency
      await tester.pumpAndSettle();

      expect(find.textContaining('Attempt 1 of 5 before lockout'), findsOneWidget);
    });

    testWidgets('TC-P01-02: Happy path login saves session and displays driver details',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestApp(prefs: prefs, secureStorage: fakeSecureStorage),
      );

      await tester.pump(const Duration(milliseconds: 1300));
      await tester.pumpAndSettle();

      // Enter valid driver credentials
      await tester.enterText(find.byKey(const Key('phone_input_field')), '9876543210');
      await tester.enterText(find.byKey(const Key('password_input_field')), 'Driver@123');

      await tester.ensureVisible(find.byKey(const Key('login_submit_button')));
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();

      // Navigated to Home Dashboard
      expect(find.text('HireD Partner'), findsOneWidget);
      // Driver details visible immediately
      expect(find.text('Rajesh Kumar'), findsOneWidget);
      expect(find.text('HireD Professional Driver'), findsOneWidget);
      expect(find.text('ONLINE'), findsOneWidget);

      // Verify tokens persisted in secure storage
      expect(await fakeSecureStorage.getAccessToken(), isNotNull);
      expect(await fakeSecureStorage.getDriverId(), equals(101));
    });

    testWidgets('TC-P01-06: Inactive/Pending driver displays supportive banner',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestApp(prefs: prefs, secureStorage: fakeSecureStorage),
      );

      await tester.pump(const Duration(milliseconds: 1300));
      await tester.pumpAndSettle();

      // Enter pending driver credentials
      await tester.enterText(find.byKey(const Key('phone_input_field')), '9876543211');
      await tester.enterText(find.byKey(const Key('password_input_field')), 'Driver@123');

      await tester.ensureVisible(find.byKey(const Key('login_submit_button')));
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();

      // Should show supportive banner and then allow viewing status
      expect(find.text('HireD Partner'), findsOneWidget);
      expect(find.text('Suresh Patel'), findsOneWidget);
      expect(find.text('PENDING'), findsWidgets);
    });

    testWidgets('TC-P01-05: 5 failed attempts trigger lockout banner and disable submit',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestApp(prefs: prefs, secureStorage: fakeSecureStorage),
      );

      await tester.pump(const Duration(milliseconds: 1300));
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('phone_input_field')), '9876543210');
      await tester.enterText(find.byKey(const Key('password_input_field')), 'WrongPass');

      // Attempt 1 to 5
      for (int i = 1; i <= 5; i++) {
        await tester.ensureVisible(find.byKey(const Key('login_submit_button')));
        await tester.tap(find.byKey(const Key('login_submit_button')));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 700));
        await tester.pumpAndSettle();
      }

      // 5th attempt triggers lockout
      expect(find.byKey(const Key('lockout_banner')), findsOneWidget);
      expect(find.textContaining('Account Temporarily Locked'), findsOneWidget);

      // Verify submit button is disabled
      final submitButton = tester.widget<ElevatedButton>(
        find.byKey(const Key('login_submit_button')),
      );
      expect(submitButton.onPressed, isNull);
    });
  });
}
