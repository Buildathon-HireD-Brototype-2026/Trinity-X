import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Application configuration and environment values.
class AppConfig {
  AppConfig._();

  static const String _dartDefineBaseUrl = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl {
    if (_dartDefineBaseUrl.isNotEmpty) {
      return _dartDefineBaseUrl;
    }
    if (dotenv.isInitialized) {
      final envVal = dotenv.env['API_BASE_URL'];
      if (envVal != null && envVal.isNotEmpty) return envVal;
    }
    return 'http://10.0.2.2:5000/api/v1';
  }

  static const String appName = 'HireD Partner';
}
