import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Application configuration and environment values.
class AppConfig {
  AppConfig._();

  static const String _dartDefineBaseUrl = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl {
    if (_dartDefineBaseUrl.isNotEmpty) {
      if (kReleaseMode && !_dartDefineBaseUrl.startsWith('https://')) {
        throw StateError('In release mode, API_BASE_URL must use HTTPS.');
      }
      return _dartDefineBaseUrl;
    }
    if (dotenv.isInitialized) {
      final envVal = dotenv.env['API_BASE_URL'];
      if (envVal != null && envVal.isNotEmpty) {
        if (kReleaseMode && !envVal.startsWith('https://')) {
          throw StateError('In release mode, API_BASE_URL must use HTTPS.');
        }
        return envVal;
      }
    }
    if (kReleaseMode) {
      throw StateError('API_BASE_URL must be configured with HTTPS for release builds.');
    }
    return 'http://10.0.2.2:5000/api/v1';
  }

  static const String appName = 'HireD Partner';
}
