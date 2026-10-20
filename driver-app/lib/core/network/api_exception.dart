import 'package:dio/dio.dart';

/// Standardized API exception model with clear user-facing messages.
class ApiException implements Exception {
  final int? statusCode;
  final String message;
  final String? errorCode;
  final dynamic details;

  const ApiException({
    this.statusCode,
    required this.message,
    this.errorCode,
    this.details,
  });

  factory ApiException.fromDioError(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return const ApiException(
        statusCode: 0,
        errorCode: 'TIMEOUT',
        message: 'This is taking longer than usual. Please try again.',
      );
    }

    if (error.type == DioExceptionType.connectionError) {
      final inner = (error.error?.toString() ?? error.message ?? '').toLowerCase();
      if (inner.contains('refused') || inner.contains('111')) {
        return const ApiException(
          statusCode: 0,
          errorCode: 'CONNECTION_REFUSED',
          message: 'We could not connect right now. Please try again in a moment.',
        );
      }
      return const ApiException(
        statusCode: 0,
        errorCode: 'NETWORK_ERROR',
        message: 'No internet connection. Please check your network and try again.',
      );
    }

    final response = error.response;
    final statusCode = response?.statusCode;
    final data = response?.data;

    String? serverMsg;
    String? errCode;
    dynamic details;

    if (data is Map<String, dynamic>) {
      serverMsg = data['message'] as String? ??
          (data['error'] is Map ? data['error']['message'] as String? : null);
      errCode = data['code'] as String? ??
          (data['error'] is Map ? data['error']['code'] as String? : null);
      details = data['details'] ?? (data['error'] is Map ? data['error']['details'] : null);
    }

    switch (statusCode) {
      case 401:
        return ApiException(
          statusCode: 401,
          errorCode: errCode ?? 'UNAUTHORIZED',
          message: serverMsg ?? 'Phone number or password is not correct.',
          details: details,
        );
      case 403:
        return ApiException(
          statusCode: 403,
          errorCode: errCode ?? 'FORBIDDEN',
          message: serverMsg ?? 'This account cannot be used right now. Please contact the HireD office.',
          details: details,
        );
      case 404:
        return ApiException(
          statusCode: 404,
          errorCode: errCode ?? 'NOT_FOUND',
          message: serverMsg ?? 'We could not find this. Please refresh and try again.',
          details: details,
        );
      case 409:
        return ApiException(
          statusCode: 409,
          errorCode: errCode ?? 'CONFLICT',
          message: serverMsg ?? 'This action is not possible right now.',
          details: details,
        );
      case 422:
        return ApiException(
          statusCode: 422,
          errorCode: errCode ?? 'VALIDATION_ERROR',
          message: serverMsg ?? 'Please check the details and try again.',
          details: details,
        );
      case 429:
        return ApiException(
          statusCode: 429,
          errorCode: errCode ?? 'RATE_LIMITED',
          message: serverMsg ?? 'Please wait a few seconds and try again.',
          details: details,
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return ApiException(
          statusCode: statusCode,
          errorCode: errCode ?? 'SERVER_ERROR',
          message: serverMsg ?? 'Something went wrong on our side. Please try again later.',
          details: details,
        );
      default:
        return ApiException(
          statusCode: statusCode,
          errorCode: errCode ?? 'UNKNOWN_ERROR',
          message: serverMsg ?? 'Something went wrong. Please try again.',
          details: details,
        );
    }
  }

  @override
  String toString() => message;
}
