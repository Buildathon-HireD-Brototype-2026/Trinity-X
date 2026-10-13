import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';
import '../../features/auth/presentation/controllers/auth_controller.dart';

/// Interceptor that attaches the `Authorization: Bearer <token>` header to all requests,
/// seamlessly handles token expiration via silent refresh and request replay,
/// and revokes the session if refresh token is expired or revoked.
class AuthInterceptor extends Interceptor {
  final SecureStorageService secureStorage;
  final Future<String?> Function()? onRefreshToken;
  final void Function(String message)? onSessionExpired;
  final Dio? dio;

  // Single future lock to deduplicate concurrent 401 refresh calls
  Future<String?>? _refreshFuture;

  AuthInterceptor({
    required this.secureStorage,
    this.onRefreshToken,
    this.onSessionExpired,
    this.dio,
  });

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await secureStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    super.onRequest(options, handler);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final isAuthPath = err.requestOptions.path.contains('/auth/login') ||
                         err.requestOptions.path.contains('/auth/refresh');

      if (!isAuthPath && onRefreshToken != null) {
        try {
          // If a refresh is already in progress, await the existing one; otherwise initiate.
          _refreshFuture ??= onRefreshToken!();
          final newToken = await _refreshFuture;
          _refreshFuture = null;

          if (newToken != null && newToken.isNotEmpty) {
            // Update request header with the refreshed token and replay the original request
            final options = err.requestOptions;
            options.headers['Authorization'] = 'Bearer $newToken';
            final client = dio ?? Dio();
            final response = await client.fetch(options);
            return handler.resolve(response);
          }
        } catch (_) {
          _refreshFuture = null;
        }
      }

      // Refresh failed or not available: revoke session per user specification
      onSessionExpired?.call('Active session expired. Please log in again.');
    }
    super.onError(err, handler);
  }
}

/// Provides configured Dio client instance with AuthInterceptor.
final dioProvider = Provider<Dio>((ref) {
  final secureStorage = ref.watch(secureStorageServiceProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
    ),
  );

  dio.interceptors.add(
    AuthInterceptor(
      dio: dio,
      secureStorage: secureStorage,
      onRefreshToken: () {
        return ref.read(authControllerProvider.notifier).refreshSession();
      },
      onSessionExpired: (message) {
        ref.read(authControllerProvider.notifier).handleSessionExpired(message);
      },
    ),
  );

  return dio;
});
