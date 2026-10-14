import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Application configuration and environment values.
class AppConfig {
  AppConfig._();

  static String get apiBaseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    return dotenv.env['API_BASE_URL'] ?? 'https://api.hired.in/api/v1';
  }

  static const String appName = 'HireD Partner';
}
