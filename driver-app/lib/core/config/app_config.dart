import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Application configuration and environment values.
class AppConfig {
  AppConfig._();

  static String get apiBaseUrl {
    return dotenv.env['API_BASE_URL'] ?? 'http://10.0.2.2:8000/api/v1';
  }

  static const String appName = 'HireD Partner';
}
