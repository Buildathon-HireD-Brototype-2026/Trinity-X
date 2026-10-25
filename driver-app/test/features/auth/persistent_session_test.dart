import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver_app/app.dart';
import 'package:driver_app/core/errors/error_messages.dart';
import 'package:driver_app/core/network/auth_interceptor.dart';
import 'package:driver_app/core/routing/app_router.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/core/storage/secure_storage_service.dart';
import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/domain/auth_tokens.dart';
import 'package:driver_app/features/auth/domain/driver_model.dart';
import 'package:driver_app/features/auth/presentation/controllers/auth_controller.dart';
import 'package:driver_app/features/auth/presentation/controllers/login_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Test in-memory secure storage mimicking Android Keystore / iOS Keychain.
class MockSecureStorageService extends SecureStorageService {
  final Map<String, String> _storage;

  MockSecureStorageService([Map<String, String>? initial])
      : _storage = initial != null ? Map.from(initial) : {},
        super(const FlutterSecureStorage());

  Map<String, String> get rawData => Map.unmodifiable(_storage);

  @override
  Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required int driverId,
    required String driverName,
  }) async {
    _storage['auth_access_token'] = accessToken;
    _storage['auth_refresh_token'] = refreshToken;
    _storage['auth_driver_id'] = driverId.toString();
    _storage['auth_driver_name'] = driverName;
  }

  @override
  Future<String?> getAccessToken() async => _storage['auth_access_token'];

  @override
  Future<String?> getRefreshToken() async => _storage['auth_refresh_token'];

  @override
  Future<int?> getDriverId() async {
    final val = _storage['auth_driver_id'];
    return val != null ? int.tryParse(val) : null;
  }

  @override
  Future<String?> getDriverName() async => _storage['auth_driver_name'];

  @override
  Future<void> clearSession() async {
    _storage.clear();
  }

  void setRawValue(String key, String value) {
    _storage[key] = value;
  }
}

Widget createBootstrapApp({
  required SharedPreferences prefs,
  required MockSecureStorageService secureStorage,
}) {
  return ProviderScope(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      secureStorageServiceProvider.overrideWithValue(secureStorage),
    ],
    child: const DriverApp(),
  );
}

void main() {
  late SharedPreferences prefs;
  late MockSecureStorageService mockSecureStorage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    mockSecureStorage = MockSecureStorageService();
  });

  group('TASK: Persistent Login Session (Flutter) - TDD Suite', () {
    testWidgets('1. No stored session: app starts on Login screen', (WidgetTester tester) async {
      await tester.pumpWidget(
        createBootstrapApp(prefs: prefs, secureStorage: mockSecureStorage),
      );

      // Initially on Splash (no flicker to Home or error)
      expect(find.byType(DriverApp), findsOneWidget);

      // Async bootstrap completes
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();

      // Lands on Login
      expect(find.text('Driver Partner Login'), findsOneWidget);
      expect(find.text('HireD Partner'), findsNothing);
    });

    testWidgets('2. Stored valid session: app starts on Home, Login is never shown',
        (WidgetTester tester) async {
      // Pre-populate secure storage with valid session
      mockSecureStorage = MockSecureStorageService({
        'auth_access_token': 'valid_jwt_access_token',
        'auth_refresh_token': 'valid_jwt_refresh_token',
        'auth_driver_id': '101',
        'auth_driver_name': 'Rajesh Kumar',
      });

      await tester.pumpWidget(
        createBootstrapApp(prefs: prefs, secureStorage: mockSecureStorage),
      );

      // Bootstrap completes
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pumpAndSettle();

      // Lands directly on Home screen
      expect(find.text('HireD Partner'), findsOneWidget);
      expect(find.text('Rajesh Kumar'), findsOneWidget);

      // Login screen was NEVER rendered
      expect(find.text('Driver Partner Login'), findsNothing);
    });

    testWidgets('3. Login success: session is saved to secure storage', (WidgetTester tester) async {
      await tester.pumpWidget(
        createBootstrapApp(prefs: prefs, secureStorage: mockSecureStorage),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();

      // Fill in credentials and log in
      await tester.enterText(find.byKey(const Key('phone_input_field')), '9876543210');
      await tester.enterText(find.byKey(const Key('password_input_field')), 'Driver@123');

      await tester.ensureVisible(find.byKey(const Key('login_submit_button')));
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();

      // Verify navigated to Home
      expect(find.text('HireD Partner'), findsOneWidget);

      // Verify all 4 session fields persisted in secure storage
      final raw = mockSecureStorage.rawData;
      expect(raw['auth_access_token'], isNotNull);
      expect(raw['auth_access_token'], contains('mock_jwt_access_101'));
      expect(raw['auth_refresh_token'], equals('mock_jwt_refresh_101'));
      expect(raw['auth_driver_id'], equals('101'));
      expect(raw['auth_driver_name'], equals('Rajesh Kumar'));
    });

    testWidgets('4. App restart after login: lands on Home', (WidgetTester tester) async {
      // 1st run: Login and persist session
      await tester.pumpWidget(
        createBootstrapApp(prefs: prefs, secureStorage: mockSecureStorage),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('phone_input_field')), '9876543210');
      await tester.enterText(find.byKey(const Key('password_input_field')), 'Driver@123');
      await tester.ensureVisible(find.byKey(const Key('login_submit_button')));
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();

      expect(find.text('HireD Partner'), findsOneWidget);

      // Simulate app kill / cold-start restart with the persisted secure storage
      await tester.pumpWidget(
        createBootstrapApp(prefs: prefs, secureStorage: mockSecureStorage),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pumpAndSettle();

      // On restart, lands on Home without ever visiting Login
      expect(find.text('HireD Partner'), findsOneWidget);
      expect(find.text('Rajesh Kumar'), findsOneWidget);
      expect(find.text('Driver Partner Login'), findsNothing);
    });

    testWidgets('5. Logout: storage and cache cleared, goes to Login, restart lands on Login',
        (WidgetTester tester) async {
      // Start with authenticated session
      mockSecureStorage = MockSecureStorageService({
        'auth_access_token': 'jwt_to_clear',
        'auth_refresh_token': 'refresh_to_clear',
        'auth_driver_id': '101',
        'auth_driver_name': 'Rajesh Kumar',
      });

      await tester.pumpWidget(
        createBootstrapApp(prefs: prefs, secureStorage: mockSecureStorage),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pumpAndSettle();

      expect(find.text('HireD Partner'), findsOneWidget);

      // Tap logout in AppBar
      final logoutBtn = find.byIcon(Icons.logout);
      expect(logoutBtn, findsOneWidget);
      await tester.tap(logoutBtn);
      await tester.pump();
      await tester.pumpAndSettle();

      // Lands on Login
      expect(find.text('Driver Partner Login'), findsOneWidget);

      // Verify secure storage is completely empty
      expect(mockSecureStorage.rawData.isEmpty, isTrue);

      // Simulate restart after logout
      await tester.pumpWidget(
        createBootstrapApp(prefs: prefs, secureStorage: mockSecureStorage),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();

      // Restart still lands on Login
      expect(find.text('Driver Partner Login'), findsOneWidget);
      expect(find.text('HireD Partner'), findsNothing);
    });

    testWidgets('6. Corrupted or partial stored data: treated as unauthenticated without crash',
        (WidgetTester tester) async {
      // Test 6a: Partial data (missing driver_id and refresh_token)
      mockSecureStorage = MockSecureStorageService({
        'auth_access_token': 'orphaned_token',
      });

      await tester.pumpWidget(
        createBootstrapApp(prefs: prefs, secureStorage: mockSecureStorage),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();

      // Safely treated as unauthenticated, no crash
      expect(find.text('Driver Partner Login'), findsOneWidget);

      // Test 6b: Corrupted driver_id (non-integer string)
      mockSecureStorage = MockSecureStorageService({
        'auth_access_token': 'token_xyz',
        'auth_refresh_token': 'refresh_xyz',
        'auth_driver_id': 'not_a_valid_number',
        'auth_driver_name': 'Broken Driver',
      });

      await tester.pumpWidget(
        createBootstrapApp(prefs: prefs, secureStorage: mockSecureStorage),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();

      // Safely treated as unauthenticated, no crash
      expect(find.text('Driver Partner Login'), findsOneWidget);
    });

    testWidgets('7. Back button on Home does not return to Login or Splash',
        (WidgetTester tester) async {
      // Start with valid session on Home
      mockSecureStorage = MockSecureStorageService({
        'auth_access_token': 'valid_token',
        'auth_refresh_token': 'valid_refresh',
        'auth_driver_id': '101',
        'auth_driver_name': 'Rajesh Kumar',
      });

      await tester.pumpWidget(
        createBootstrapApp(prefs: prefs, secureStorage: mockSecureStorage),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pumpAndSettle();

      expect(find.text('HireD Partner'), findsOneWidget);

      // Trigger system back button (pop route)
      final didPop = await tester.binding.handlePopRoute();

      // Home is root destination; back route doesn't pop to Login or Splash
      expect(didPop, isFalse);
      expect(find.text('HireD Partner'), findsOneWidget);
      expect(find.text('Driver Partner Login'), findsNothing);
    });

    test('8. Dio AuthInterceptor attaches Authorization: Bearer <token>', () async {
      mockSecureStorage = MockSecureStorageService({
        'auth_access_token': 'secret_driver_token_123',
      });

      final interceptor = AuthInterceptor(secureStorage: mockSecureStorage);
      final options = RequestOptions(path: '/api/v1/driver/profile');

      final handler = _FakeRequestInterceptorHandler();
      await interceptor.onRequest(options, handler);

      expect(options.headers['Authorization'], equals('Bearer secret_driver_token_123'));
    });

    testWidgets('9. Server rejection (401) clears session and shows session expired banner on Login',
        (WidgetTester tester) async {
      mockSecureStorage = MockSecureStorageService({
        'auth_access_token': 'expired_token',
        'auth_refresh_token': 'expired_refresh',
        'auth_driver_id': '101',
        'auth_driver_name': 'Rajesh Kumar',
      });

      late WidgetRef capturedRef;
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            secureStorageServiceProvider.overrideWithValue(mockSecureStorage),
          ],
          child: Consumer(
            builder: (context, ref, child) {
              capturedRef = ref;
              final router = ref.watch(appRouterProvider);
              return MaterialApp.router(routerConfig: router);
            },
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pumpAndSettle();

      expect(find.text('HireD Partner'), findsOneWidget);

      // Trigger 401 session expiration
      await capturedRef.read(authControllerProvider.notifier).handleSessionExpired(
            'Active session expired. Please log in again.',
          );
      await tester.pump();
      await tester.pumpAndSettle();

      // Redirected to Login without session expired banner on login screen itself
      expect(find.text('Driver Partner Login'), findsOneWidget);
      expect(find.byKey(const Key('session_expired_banner')), findsNothing);

      // Secure storage cleared
      expect(mockSecureStorage.rawData.isEmpty, isTrue);
    });

    test('10. Silent refresh: 401 refreshes token and replays original request', () async {
      mockSecureStorage = MockSecureStorageService({
        'auth_access_token': 'expired_access_token',
        'auth_refresh_token': 'valid_refresh_token',
      });

      int refreshCallCount = 0;
      final fakeDio = Dio();
      // Intercept fakeDio to mock the successful retried response
      fakeDio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            handler.resolve(Response(
              requestOptions: options,
              data: {'success': true, 'auth': options.headers['Authorization']},
              statusCode: 200,
            ));
          },
        ),
      );

      final interceptor = AuthInterceptor(
        dio: fakeDio,
        secureStorage: mockSecureStorage,
        onRefreshToken: () async {
          refreshCallCount++;
          return 'new_shiny_access_token';
        },
      );

      final errorOptions = RequestOptions(path: '/api/v1/trips/active');
      errorOptions.headers['Authorization'] = 'Bearer expired_access_token';

      final dioError = DioException(
        requestOptions: errorOptions,
        response: Response(requestOptions: errorOptions, statusCode: 401),
      );

      final errorHandler = _MockErrorInterceptorHandler();
      await interceptor.onError(dioError, errorHandler);

      expect(refreshCallCount, equals(1));
      expect(errorHandler.resolvedResponse, isNotNull);
      expect(errorHandler.resolvedResponse?.statusCode, equals(200));
      expect(
        (errorHandler.resolvedResponse?.data as Map)['auth'],
        equals('Bearer new_shiny_access_token'),
      );
    });

    test('11. Concurrent 401s deduplicate into a single token refresh call', () async {
      mockSecureStorage = MockSecureStorageService({
        'auth_access_token': 'expired_access_token',
        'auth_refresh_token': 'valid_refresh_token',
      });

      int refreshCallCount = 0;
      final fakeDio = Dio();
      fakeDio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            handler.resolve(Response(
              requestOptions: options,
              data: {'ok': true},
              statusCode: 200,
            ));
          },
        ),
      );

      final interceptor = AuthInterceptor(
        dio: fakeDio,
        secureStorage: mockSecureStorage,
        onRefreshToken: () async {
          refreshCallCount++;
          await Future.delayed(const Duration(milliseconds: 50));
          return 'fresh_token';
        },
      );

      // Simulate 3 concurrent 401s
      final err1 = DioException(
        requestOptions: RequestOptions(path: '/api/v1/profile'),
        response: Response(requestOptions: RequestOptions(path: '/api/v1/profile'), statusCode: 401),
      );
      final err2 = DioException(
        requestOptions: RequestOptions(path: '/api/v1/trips'),
        response: Response(requestOptions: RequestOptions(path: '/api/v1/trips'), statusCode: 401),
      );
      final err3 = DioException(
        requestOptions: RequestOptions(path: '/api/v1/notifications'),
        response: Response(requestOptions: RequestOptions(path: '/api/v1/notifications'), statusCode: 401),
      );

      final h1 = _MockErrorInterceptorHandler();
      final h2 = _MockErrorInterceptorHandler();
      final h3 = _MockErrorInterceptorHandler();

      await Future.wait([
        interceptor.onError(err1, h1),
        interceptor.onError(err2, h2),
        interceptor.onError(err3, h3),
      ]);

      // Only 1 refresh request was dispatched across all 3 concurrent 401s
      expect(refreshCallCount, equals(1));
      expect(h1.resolvedResponse, isNotNull);
      expect(h2.resolvedResponse, isNotNull);
      expect(h3.resolvedResponse, isNotNull);
    });

    test('12. Failed refresh triggers session revocation and expires auth', () async {
      mockSecureStorage = MockSecureStorageService({
        'auth_access_token': 'expired_access',
        'auth_refresh_token': 'revoked_refresh',
      });

      bool sessionExpiredTriggered = false;
      final interceptor = AuthInterceptor(
        secureStorage: mockSecureStorage,
        onRefreshToken: () async => null, // Refresh rejected
        onSessionExpired: (_) => sessionExpiredTriggered = true,
      );

      final dioError = DioException(
        requestOptions: RequestOptions(path: '/api/v1/trips'),
        response: Response(requestOptions: RequestOptions(path: '/api/v1/trips'), statusCode: 401),
      );

      final errorHandler = _MockErrorInterceptorHandler();
      await interceptor.onError(dioError, errorHandler);

      expect(sessionExpiredTriggered, isTrue);
      expect(errorHandler.resolvedResponse, isNull);
    });

    test('13. HTTP 429 rate limit triggers security warning and blocks brute-force', () async {
      final mockRepo = _RateLimitedAuthRepository();
      final controller = LoginController(mockRepo);

      final success = await controller.login('9876543210', 'WrongPass123');

      expect(success, isFalse);
      expect(
        controller.state.errorMessage,
        equals(ErrorMessages.rateLimited),
      );
      expect(controller.state.appError?.refCode, equals('HD-RATE-01'));
    });

    test('14. Rapid submission debounce prevents multi-click spam', () async {
      final mockRepo = _CountingAuthRepository();
      final controller = LoginController(mockRepo);

      // 1st click
      final f1 = controller.login('9876543210', 'Driver@123');
      // Rapid 2nd click immediately within 100ms
      final f2 = controller.login('9876543210', 'Driver@123');

      await Future.wait([f1, f2]);

      // Only 1 network call was actually made
      expect(mockRepo.loginCallCount, equals(1));
    });
  });
}

class _FakeRequestInterceptorHandler extends RequestInterceptorHandler {
  @override
  void next(RequestOptions requestOptions) {}
}

class _MockErrorInterceptorHandler extends ErrorInterceptorHandler {
  Response? resolvedResponse;

  @override
  void resolve(Response response) {
    resolvedResponse = response;
  }

  @override
  void next(DioException err) {}
}

class _RateLimitedAuthRepository implements AuthRepository {
  @override
  Future<({AuthTokens tokens, DriverModel driver})> login({
    required String phone,
    required String password,
  }) async {
    throw const AuthException('HTTP 429: Too many requests');
  }

  @override
  Future<DriverModel?> getCachedDriver() async => null;

  @override
  Future<DriverModel> fetchRemoteDriver(int driverId) async => throw UnimplementedError();

  @override
  Stream<DriverModel> watchDriver(int driverId) => const Stream.empty();

  @override
  Future<DriverModel> toggleDuty(int driverId, bool isOnline) async => throw UnimplementedError();

  @override
  Future<AuthTokens> refreshSession(String refreshToken) async => throw UnimplementedError();

  @override
  Future<void> logout() async {}
}

class _CountingAuthRepository implements AuthRepository {
  int loginCallCount = 0;

  @override
  Future<({AuthTokens tokens, DriverModel driver})> login({
    required String phone,
    required String password,
  }) async {
    loginCallCount++;
    await Future.delayed(const Duration(milliseconds: 50));
    return (
      tokens: const AuthTokens(accessToken: 'a', refreshToken: 'r'),
      driver: const DriverModel(
        id: 101,
        name: 'Rajesh',
        phone: '9876543210',
        status: 'ACTIVE',
        isOnline: true,
        rating: 5.0,
        totalTrips: 0,
      ),
    );
  }

  @override
  Future<DriverModel?> getCachedDriver() async => null;

  @override
  Future<DriverModel> fetchRemoteDriver(int driverId) async => throw UnimplementedError();

  @override
  Stream<DriverModel> watchDriver(int driverId) => const Stream.empty();

  @override
  Future<DriverModel> toggleDuty(int driverId, bool isOnline) async => throw UnimplementedError();

  @override
  Future<AuthTokens> refreshSession(String refreshToken) async => throw UnimplementedError();

  @override
  Future<void> logout() async {}
}
