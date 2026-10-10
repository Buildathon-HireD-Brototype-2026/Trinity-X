import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/local_cache_service.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../domain/auth_tokens.dart';
import '../domain/driver_model.dart';

abstract class AuthRepository {
  Future<({AuthTokens tokens, DriverModel driver})> login({
    required String phone,
    required String password,
  });

  Future<DriverModel?> getCachedDriver();
  Future<DriverModel> fetchRemoteDriver(int driverId);
  Stream<DriverModel> watchDriver(int driverId);
  Future<DriverModel> toggleDuty(int driverId, bool isOnline);
  Future<void> logout();
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final secureStorage = ref.watch(secureStorageServiceProvider);
  final localCache = ref.watch(localCacheServiceProvider);
  return MockAuthRepository(
    secureStorage: secureStorage,
    localCache: localCache,
  );
});

/// Mock Auth Repository for Offline-First Development with reactive auto-refresh.
class MockAuthRepository implements AuthRepository {
  final SecureStorageService secureStorage;
  final LocalCacheService localCache;

  // StreamController for live database updates
  final _driverStreamController = StreamController<DriverModel>.broadcast();

  // In-memory mock database of drivers (HireD professional drivers)
  final Map<String, ({String password, DriverModel driver})> _mockDb = {
    '9876543210': (
      password: 'Driver@123',
      driver: const DriverModel(
        id: 101,
        name: 'Rajesh Kumar',
        phone: '9876543210',
        email: 'rajesh.driver@hired.in',
        status: 'ACTIVE',
        isOnline: true,
        rating: 4.88,
        totalTrips: 142,
      ),
    ),
    '9876543211': (
      password: 'Driver@123',
      driver: const DriverModel(
        id: 102,
        name: 'Suresh Patel',
        phone: '9876543211',
        email: 'suresh.driver@hired.in',
        status: 'PENDING',
        isOnline: false,
        rating: 4.5,
        totalTrips: 0,
      ),
    ),
    '9876543212': (
      password: 'Driver@123',
      driver: const DriverModel(
        id: 103,
        name: 'Vikram Singh',
        phone: '9876543212',
        email: 'vikram.driver@hired.in',
        status: 'INACTIVE',
        isOnline: false,
        rating: 4.2,
        totalTrips: 15,
      ),
    ),
  };

  MockAuthRepository({
    required this.secureStorage,
    required this.localCache,
  });

  @override
  Future<({AuthTokens tokens, DriverModel driver})> login({
    required String phone,
    required String password,
  }) async {
    // Artificial small latency to simulate network call
    await Future.delayed(const Duration(milliseconds: 600));

    final cleanPhone = phone.replaceAll(RegExp(r'\D'), '');
    final entry = _mockDb[cleanPhone];

    if (entry == null) {
      throw const AuthException('Driver account not found. Please contact fleet manager.');
    }

    if (entry.password != password) {
      throw const AuthException('Invalid password.');
    }

    final driver = entry.driver;

    final tokens = AuthTokens(
      accessToken: 'mock_jwt_access_${driver.id}_${DateTime.now().millisecondsSinceEpoch}',
      refreshToken: 'mock_jwt_refresh_${driver.id}',
    );

    // Save tokens and session
    await secureStorage.saveSession(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      driverId: driver.id,
      driverName: driver.name,
    );

    // Cache driver profile locally for instant Zomato-like hydration on reopen
    await localCache.cacheProfile(driver.toJson());
    _driverStreamController.add(driver);

    return (tokens: tokens, driver: driver);
  }

  @override
  Future<DriverModel?> getCachedDriver() async {
    final cached = localCache.getCachedProfile();
    if (cached != null) {
      return DriverModel.fromJson(cached);
    }
    return null;
  }

  @override
  Future<DriverModel> fetchRemoteDriver(int driverId) async {
    await Future.delayed(const Duration(milliseconds: 300));
    // Find driver from mock database
    for (final record in _mockDb.values) {
      if (record.driver.id == driverId) {
        // Update local cache
        await localCache.cacheProfile(record.driver.toJson());
        _driverStreamController.add(record.driver);
        return record.driver;
      }
    }
    throw const AuthException('Driver not found');
  }

  @override
  Stream<DriverModel> watchDriver(int driverId) async* {
    // 1. Immediately yield cached driver if present (instant, no loading blank screen)
    final cached = await getCachedDriver();
    if (cached != null && cached.id == driverId) {
      yield cached;
    }

    // 2. Fetch fresh from remote DB & yield
    try {
      final fresh = await fetchRemoteDriver(driverId);
      yield fresh;
    } catch (_) {
      // Offline fallback: keep cached
    }

    // 3. Listen to reactive updates
    yield* _driverStreamController.stream.where((d) => d.id == driverId);
  }

  @override
  Future<DriverModel> toggleDuty(int driverId, bool isOnline) async {
    for (final key in _mockDb.keys) {
      final record = _mockDb[key]!;
      if (record.driver.id == driverId) {
        final updated = record.driver.copyWith(isOnline: isOnline);
        _mockDb[key] = (password: record.password, driver: updated);
        await localCache.cacheProfile(updated.toJson());
        _driverStreamController.add(updated);
        return updated;
      }
    }
    throw const AuthException('Driver not found');
  }

  @override
  Future<void> logout() async {
    await secureStorage.clearSession();
    await localCache.clearAllCache();
  }
}

class AuthException implements Exception {
  final String message;
  const AuthException(this.message);

  @override
  String toString() => message;
}
