import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver_app/app.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/core/storage/secure_storage_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeSecureStorageService extends SecureStorageService {
  final Map<String, String> _data;

  FakeSecureStorageService([Map<String, String>? initialData])
      : _data = initialData ?? {},
        super(const FlutterSecureStorage());

  @override
  Future<String?> getAccessToken() async => _data['auth_access_token'];

  @override
  Future<int?> getDriverId() async {
    final val = _data['auth_driver_id'];
    return val != null ? int.tryParse(val) : null;
  }

  @override
  Future<String?> getDriverName() async => _data['auth_driver_name'];

  @override
  Future<bool> hasValidSession() async => _data['auth_access_token'] != null;
}

void main() {
  testWidgets('App renders splash and navigates to login when no session', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          secureStorageServiceProvider.overrideWithValue(FakeSecureStorageService()),
        ],
        child: const DriverApp(),
      ),
    );

    // Initial frame displays DriverApp
    expect(find.byType(DriverApp), findsOneWidget);

    // Advance past splash delay
    await tester.pump(const Duration(milliseconds: 1300));
    await tester.pump();

    // Verify navigation to login screen
    expect(find.text('Driver Partner Login'), findsOneWidget);
  });

  testWidgets('App renders splash and navigates to home when valid session exists', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          secureStorageServiceProvider.overrideWithValue(
            FakeSecureStorageService({'auth_access_token': 'mock_jwt_token', 'auth_driver_id': '101'}),
          ),
        ],
        child: const DriverApp(),
      ),
    );

    // Initial frame displays DriverApp
    expect(find.byType(DriverApp), findsOneWidget);

    // Advance past splash delay and session hydration
    await tester.pump(const Duration(milliseconds: 1300));
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump();

    // Verify auto-navigation to home screen
    expect(find.text('HireD Partner'), findsOneWidget);
  });
}
