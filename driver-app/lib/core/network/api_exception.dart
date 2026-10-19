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
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
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
      details = data['details'];
    }

    switch (statusCode) {
      case 401:
        return ApiException(
          statusCode: 401,
          errorCode: errCode ?? 'UNAUTHORIZED',
          message: serverMsg ?? 'Session expired. Please log in again.',
          details: details,
        );
      case 403:
        return ApiException(
          statusCode: 403,
          errorCode: errCode ?? 'FORBIDDEN',
          message: serverMsg ?? 'You do not have permission to perform this action.',
          details: details,
        );
      case 404:
        return ApiException(
          statusCode: 404,
          errorCode: errCode ?? 'NOT_FOUND',
          message: serverMsg ?? 'The requested item was not found.',
          details: details,
        );
      case 422:
        return ApiException(
          statusCode: 422,
          errorCode: errCode ?? 'VALIDATION_ERROR',
          message: serverMsg ?? 'Invalid data submitted. Please check your inputs.',
          details: details,
        );
      case 429:
        return ApiException(
          statusCode: 429,
          errorCode: errCode ?? 'RATE_LIMITED',
          message: serverMsg ?? 'Too many requests. Please wait a moment.',
          details: details,
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return ApiException(
          statusCode: statusCode,
          errorCode: errCode ?? 'SERVER_ERROR',
          message: serverMsg ?? 'Server encountered an error. Please try again later.',
          details: details,
        );
      default:
        return ApiException(
          statusCode: statusCode,
          errorCode: errCode ?? 'UNKNOWN_ERROR',
          message: serverMsg ?? (error.message ?? 'An unexpected error occurred.'),
          details: details,
        );
    }
  }

  @override
  String toString() => message;
}
