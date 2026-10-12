import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be initialized in main()');
});

final localCacheServiceProvider = Provider<LocalCacheService>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return LocalCacheService(prefs);
});

/// Local offline cache layer for trips, wallet, and profile data.
class LocalCacheService {
  final SharedPreferences _prefs;

  LocalCacheService(this._prefs);

  static const _keyCachedTrips = 'cache_driver_trips';
  static const _keyCachedWallet = 'cache_driver_wallet';
  static const _keyCachedProfile = 'cache_driver_profile';
  static const _keyLastCacheTime = 'cache_last_updated_at';

  // Trips Cache
  Future<void> cacheTrips(List<Map<String, dynamic>> trips) async {
    await _prefs.setString(_keyCachedTrips, jsonEncode(trips));
    await _updateCacheTimestamp();
  }

  List<Map<String, dynamic>>? getCachedTrips() {
    final raw = _prefs.getString(_keyCachedTrips);
    if (raw == null) return null;
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {
      return null;
    }
  }

  // Wallet Cache
  Future<void> cacheWallet(Map<String, dynamic> walletData) async {
    await _prefs.setString(_keyCachedWallet, jsonEncode(walletData));
    await _updateCacheTimestamp();
  }

  Map<String, dynamic>? getCachedWallet() {
    final raw = _prefs.getString(_keyCachedWallet);
    if (raw == null) return null;
    try {
      return Map<String, dynamic>.from(jsonDecode(raw) as Map);
    } catch (_) {
      return null;
    }
  }

  // Profile Cache
  Future<void> cacheProfile(Map<String, dynamic> profileData) async {
    await _prefs.setString(_keyCachedProfile, jsonEncode(profileData));
    await _updateCacheTimestamp();
  }

  Map<String, dynamic>? getCachedProfile() {
    final raw = _prefs.getString(_keyCachedProfile);
    if (raw == null) return null;
    try {
      return Map<String, dynamic>.from(jsonDecode(raw) as Map);
    } catch (_) {
      return null;
    }
  }

  String? getLastCacheTime() => _prefs.getString(_keyLastCacheTime);

  // Duty Status Cache (persists Online/Offline across app kills)
  Future<void> saveDutyStatus(int driverId, bool isOnline) async {
    await _prefs.setBool('driver_duty_status_$driverId', isOnline);
  }

  bool? getDutyStatus(int driverId) {
    return _prefs.getBool('driver_duty_status_$driverId');
  }

  SharedPreferences get prefs => _prefs;

  Future<void> _updateCacheTimestamp() async {
    await _prefs.setString(_keyLastCacheTime, DateTime.now().toIso8601String());
  }

  /// Wipes all cached driver data (invoked upon logout).
  Future<void> clearAllCache() async {
    await Future.wait([
      _prefs.remove(_keyCachedTrips),
      _prefs.remove(_keyCachedWallet),
      _prefs.remove(_keyCachedProfile),
      _prefs.remove(_keyLastCacheTime),
    ]);
  }
}
