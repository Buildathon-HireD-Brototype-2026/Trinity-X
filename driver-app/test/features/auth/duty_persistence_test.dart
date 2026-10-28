import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:driver_app/core/storage/local_cache_service.dart';
import 'package:driver_app/core/storage/secure_storage_service.dart';
import 'package:driver_app/features/auth/data/auth_repository.dart';

class _MockSecureStorage extends SecureStorageService {
  final Map<String, String> _storage = {};
  _MockSecureStorage() : super(const FlutterSecureStorage());

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
  Future<void> clearSession() async => _storage.clear();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;
  late LocalCacheService localCache;
  late _MockSecureStorage secureStorage;
  late MockAuthRepository authRepo;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    localCache = LocalCacheService(prefs);
    secureStorage = _MockSecureStorage();
    authRepo = MockAuthRepository(
      secureStorage: secureStorage,
      localCache: localCache,
    );
  });

  group('Driver Duty Persistence across App Kills & Restarts', () {
    test('Duty defaults to offline, can be toggled to online, and persists in SharedPreferences', () async {
      final loginResult = await authRepo.login(
        phone: '9876543210',
        password: 'Driver@123',
      );
      final driverId = loginResult.driver.id;

      // Toggle duty to online
      final updated = await authRepo.toggleDuty(driverId, true);
      expect(updated.isOnline, isTrue);

      // Verify stored in SharedPreferences
      expect(localCache.getDutyStatus(driverId), isTrue);

      // Simulate app kill: create brand new AuthRepository instance with same SharedPreferences
      final freshRepo = MockAuthRepository(
        secureStorage: secureStorage,
        localCache: localCache,
      );

      // Cached driver must immediately report isOnline: true
      final cachedDriver = await freshRepo.getCachedDriver();
      expect(cachedDriver, isNotNull);
      expect(cachedDriver!.isOnline, isTrue);

      // Remote fetch must also preserve isOnline: true
      final remoteDriver = await freshRepo.fetchRemoteDriver(driverId);
      expect(remoteDriver.isOnline, isTrue);
    });

    test('Duty toggled to offline persists across app restart', () async {
      final loginResult = await authRepo.login(
        phone: '9876543210',
        password: 'Driver@123',
      );
      final driverId = loginResult.driver.id;

      // Toggle to online then back to offline
      await authRepo.toggleDuty(driverId, true);
      await authRepo.toggleDuty(driverId, false);
      expect(localCache.getDutyStatus(driverId), isFalse);

      // Simulate app kill and restart
      final freshRepo = MockAuthRepository(
        secureStorage: secureStorage,
        localCache: localCache,
      );

      final cachedDriver = await freshRepo.getCachedDriver();
      expect(cachedDriver, isNotNull);
      expect(cachedDriver!.isOnline, isFalse);
    });
  });
}
