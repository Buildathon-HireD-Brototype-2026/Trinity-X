import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final secureStorageServiceProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService(
    const FlutterSecureStorage(
      webOptions: WebOptions(
        dbName: 'hired_driver_auth',
        publicKey: 'hired_driver_auth_key',
      ),
    ),
  );
});

/// Manages secure token and credential persistence on device.
class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService(this._storage);

  static const _keyAccessToken = 'auth_access_token';
  static const _keyRefreshToken = 'auth_refresh_token';
  static const _keyDriverId = 'auth_driver_id';
  static const _keyDriverName = 'auth_driver_name';

  Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required int driverId,
    required String driverName,
  }) async {
    try {
      await Future.wait([
        _storage.write(key: _keyAccessToken, value: accessToken),
        _storage.write(key: _keyRefreshToken, value: refreshToken),
        _storage.write(key: _keyDriverId, value: driverId.toString()),
        _storage.write(key: _keyDriverName, value: driverName),
      ]);
    } catch (_) {}
  }

  Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: _keyAccessToken);
    } catch (_) {
      return null;
    }
  }

  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: _keyRefreshToken);
    } catch (_) {
      return null;
    }
  }

  Future<int?> getDriverId() async {
    try {
      final val = await _storage.read(key: _keyDriverId);
      return val != null ? int.tryParse(val) : null;
    } catch (_) {
      return null;
    }
  }

  Future<String?> getDriverName() async {
    try {
      return await _storage.read(key: _keyDriverName);
    } catch (_) {
      return null;
    }
  }

  /// Reads and strictly validates all 4 session tokens and driver credentials.
  /// Returns null if any field is missing or corrupted (e.g. invalid integer driver_id).
  Future<({String accessToken, String refreshToken, int driverId, String driverName})?> getStoredSession() async {
    try {
      final accessToken = await getAccessToken();
      final refreshToken = await getRefreshToken();
      final driverId = await getDriverId();
      final driverName = await getDriverName();

      if (accessToken == null || accessToken.trim().isEmpty ||
          refreshToken == null || refreshToken.trim().isEmpty ||
          driverId == null ||
          driverName == null || driverName.trim().isEmpty) {
        return null;
      }

      return (
        accessToken: accessToken,
        refreshToken: refreshToken,
        driverId: driverId,
        driverName: driverName,
      );
    } catch (_) {
      return null;
    }
  }

  Future<bool> hasValidSession() async {
    final session = await getStoredSession();
    return session != null;
  }

  Future<void> clearSession() async {
    try {
      await Future.wait([
        _storage.delete(key: _keyAccessToken),
        _storage.delete(key: _keyRefreshToken),
        _storage.delete(key: _keyDriverId),
        _storage.delete(key: _keyDriverName),
      ]);
    } catch (_) {}
  }
}
