import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../network/api_exception.dart';
import 'app_error.dart';
import 'error_messages.dart';

/// Centralized Error Mapper for the HireD Driver application.
///
/// Rules:
/// - Determines the user-facing message from error KIND and backend error CODE only.
/// - Never leaks raw exception strings, URLs, ports, IP addresses, HTTP numbers, JSON, or stack traces.
/// - Logs technical details to debugPrint only in debug mode, masking phone numbers and redacting credentials.
class ErrorMapper {
  ErrorMapper._();

  /// Maps any caught error into a strongly-typed, driver-safe [AppError].
  static AppError map(dynamic error, {String? context}) {
    if (error is AppError) {
      return error;
    }

    if (error is DioException) {
      return _fromDioException(error, context: context);
    }

    if (error is ApiException) {
      return _fromApiException(error, context: context);
    }

    if (error is SocketException) {
      return _fromSocketException(error);
    }

    final errStr = error?.toString().toLowerCase() ?? '';
    if (errStr.contains('429') || errStr.contains('too many') || errStr.contains('rate limit')) {
      return AppError.rateLimited(technicalDebug: error?.toString());
    }
    if (errStr.contains('timeout')) {
      return AppError.timeout(technicalDebug: error?.toString());
    }
    if (errStr.contains('refused') || errStr.contains('failed to connect')) {
      return AppError.serverUnreachable(technicalDebug: error?.toString());
    }
    if (errStr.contains('socket') || errStr.contains('network') || errStr.contains('offline')) {
      return AppError.noInternet(technicalDebug: error?.toString());
    }
    if (errStr.contains('locked')) {
      return AppError.authAccountLocked(technicalDebug: error?.toString());
    }
    if (errStr.contains('inactive') || errStr.contains('pending')) {
      return AppError.authAccountInactive(technicalDebug: error?.toString());
    }
    if (context == 'login' ||
        errStr.contains('credential') ||
        errStr.contains('invalid phone') ||
        errStr.contains('wrong password') ||
        errStr.contains('not correct')) {
      return AppError.authInvalidCredentials(technicalDebug: error?.toString());
    }

    _logDebug('Unhandled error type: ${error.runtimeType}');
    return AppError.unknown(technicalDebug: error?.toString());
  }

  /// Convenience method returning the user-facing message.
  static String getMessage(dynamic error, {String? context}) {
    return map(error, context: context).userMessage;
  }

  /// Convenience method returning the formatted reference code.
  static String getRef(dynamic error, {String? context}) {
    return map(error, context: context).formattedRef;
  }

  /// Masks phone numbers for secure debug logging: all but the last 3 digits are masked.
  /// Example: "+919000000001" -> "*********001"
  static String maskPhone(String phone) {
    final clean = phone.trim();
    if (clean.length <= 3) return '***';
    final visiblePart = clean.substring(clean.length - 3);
    final maskedPart = '*' * (clean.length - 3);
    return '$maskedPart$visiblePart';
  }

  // ---------------------------------------------------------------------------
  // Internal Mapping
  // ---------------------------------------------------------------------------

  static AppError _fromDioException(DioException err, {String? context}) {
    _logDebug('DioException [${err.type}]: status=${err.response?.statusCode}, path=${err.requestOptions.path}');

    // 1. Timeouts
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout) {
      return AppError.timeout(technicalDebug: 'DioTimeout: ${err.type}');
    }

    // 2. Connection errors & refused connections
    if (err.type == DioExceptionType.connectionError) {
      final inner = (err.error?.toString() ?? err.message ?? '').toLowerCase();
      if (inner.contains('refused') ||
          inner.contains('111') ||
          inner.contains('failed to connect') ||
          inner.contains('connection refused')) {
        return AppError.serverUnreachable(technicalDebug: 'ConnectionRefused');
      }
      return AppError.noInternet(technicalDebug: 'NoInternet/Unreachable');
    }

    // 3. HTTP Responses
    final response = err.response;
    if (response != null) {
      final statusCode = response.statusCode ?? 500;
      final data = response.data;

      String? errCode;
      dynamic details;

      if (data is Map<String, dynamic>) {
        errCode = data['code'] as String? ??
            (data['error'] is Map ? data['error']['code'] as String? : null);
        details = data['details'] ?? (data['error'] is Map ? data['error']['details'] : null);
      }

      final isLoginContext = context == 'login' ||
          err.requestOptions.path.contains('/auth/driver/login') ||
          err.requestOptions.path.contains('/auth/login');

      return _fromHttpStatus(
        statusCode: statusCode,
        errorCode: errCode,
        details: details,
        isLoginContext: isLoginContext,
        path: err.requestOptions.path,
      );
    }

    return AppError.noInternet(technicalDebug: 'DioGenericNetwork');
  }

  static AppError _fromApiException(ApiException apiEx, {String? context}) {
    final isLoginContext = context == 'login' || apiEx.errorCode == 'INVALID_CREDENTIALS';

    // Handle explicit client error codes
    if (apiEx.errorCode == 'CONNECTION_REFUSED') {
      return AppError.serverUnreachable(technicalDebug: 'ApiException.CONNECTION_REFUSED');
    }
    if (apiEx.errorCode == 'NETWORK_ERROR' || apiEx.errorCode == 'NO_INTERNET') {
      return AppError.noInternet(technicalDebug: 'ApiException.NO_INTERNET');
    }
    if (apiEx.errorCode == 'TIMEOUT') {
      return AppError.timeout(technicalDebug: 'ApiException.TIMEOUT');
    }
    if (apiEx.errorCode == 'RATE_LIMITED' ||
        (apiEx.statusCode == 429) ||
        apiEx.message.contains('429') ||
        apiEx.message.toLowerCase().contains('too many')) {
      return AppError.rateLimited(technicalDebug: 'ApiException.RATE_LIMITED');
    }

    return _fromHttpStatus(
      statusCode: apiEx.statusCode ?? 500,
      errorCode: apiEx.errorCode,
      details: apiEx.details,
      isLoginContext: isLoginContext,
      path: 'ApiException',
    );
  }

  static AppError _fromSocketException(SocketException sockEx) {
    final msg = sockEx.toString().toLowerCase();
    if (msg.contains('refused') || msg.contains('111')) {
      return AppError.serverUnreachable(technicalDebug: 'SocketException.Refused');
    }
    return AppError.noInternet(technicalDebug: 'SocketException.Unreachable');
  }

  static AppError _fromHttpStatus({
    required int statusCode,
    String? errorCode,
    dynamic details,
    required bool isLoginContext,
    required String path,
  }) {
    // 401 Unauthorized
    if (statusCode == 401) {
      if (isLoginContext) {
        return AppError.authInvalidCredentials(
          technicalDebug: '401 on login route ($path)',
        );
      }
      return AppError.sessionExpired(
        technicalDebug: '401 on protected route ($path)',
      );
    }

    // 403 Forbidden
    if (statusCode == 403) {
      if (errorCode == 'ACCOUNT_LOCKED') {
        return AppError.authAccountLocked(
          technicalDebug: '403 ACCOUNT_LOCKED ($path)',
        );
      }
      if (errorCode == 'DRIVER_NOT_ACTIVE' || isLoginContext) {
        return AppError.authAccountInactive(
          technicalDebug: '403 DRIVER_NOT_ACTIVE ($path)',
        );
      }
      return AppError.forbidden(
        technicalDebug: '403 FORBIDDEN ($path)',
      );
    }

    // 404 Not Found
    if (statusCode == 404) {
      return AppError.notFound(
        technicalDebug: '404 NOT_FOUND ($path)',
      );
    }

    // 409 Conflict
    if (statusCode == 409) {
      // Determine friendly message from backend error code
      if (errorCode == 'CONFLICT' && path.contains('expenses')) {
        return AppError.conflict(
          customMessage: ErrorMessages.conflictExpenseNotOngoing,
          technicalDebug: '409 Expense on non-ongoing trip',
        );
      }
      if (errorCode == 'CONFLICT' && path.contains('start')) {
        return AppError.conflict(
          customMessage: ErrorMessages.conflictTripAlreadyStarted,
          technicalDebug: '409 Trip already started',
        );
      }
      if (errorCode == 'CONFLICT' && path.contains('close')) {
        return AppError.conflict(
          customMessage: ErrorMessages.conflictTripAlreadyClosed,
          technicalDebug: '409 Trip already closed',
        );
      }
      return AppError.conflict(
        customMessage: ErrorMessages.conflictDefault,
        technicalDebug: '409 CONFLICT ($errorCode, $path)',
      );
    }

    // 422 Validation Error
    if (statusCode == 422) {
      if (errorCode == 'INVALID_FILE') {
        return AppError.fileError(
          technicalDebug: '422 INVALID_FILE ($path)',
        );
      }
      final fieldErrors = _extractFieldErrors(details);
      final friendlyFirst = fieldErrors.isNotEmpty ? fieldErrors.values.first : null;
      return AppError.validation(
        customMessage: friendlyFirst ?? ErrorMessages.validationDefault,
        fieldErrors: fieldErrors,
        technicalDebug: '422 VALIDATION ($errorCode, $path)',
      );
    }

    // 400 Bad Request / Invalid OTP
    if (statusCode == 400) {
      if (errorCode == 'INVALID_OTP') {
        return AppError.otpInvalid(
          technicalDebug: '400 INVALID_OTP ($path)',
        );
      }
      if (errorCode == 'OTP_LOCKED' || errorCode == 'TOO_MANY_ATTEMPTS') {
        return AppError.otpLocked(
          technicalDebug: '400 OTP_LOCKED ($path)',
        );
      }
    }

    // 429 Too Many Requests
    if (statusCode == 429) {
      return AppError.rateLimited(
        technicalDebug: '429 RATE_LIMITED ($path)',
      );
    }

    // 500, 502, 503, 504 Server Problem
    if (statusCode >= 500 && statusCode <= 599) {
      return AppError.serverProblem(
        technicalDebug: '$statusCode SERVER_PROBLEM ($path)',
      );
    }

    // Default unknown
    return AppError.unknown(
      technicalDebug: 'Unknown status: $statusCode ($errorCode, $path)',
    );
  }

  // ---------------------------------------------------------------------------
  // Validation Detail Parsing (Maps internal backend field names to friendly English)
  // ---------------------------------------------------------------------------

  static Map<String, String> _extractFieldErrors(dynamic details) {
    final result = <String, String>{};
    if (details is List) {
      for (final item in details) {
        if (item is Map) {
          final field = (item['field'] ?? item['path'] ?? item['param'])?.toString();
          if (field != null) {
            result[field] = _friendlyFieldMessage(field, item['message']?.toString());
          }
        }
      }
    } else if (details is Map) {
      details.forEach((k, v) {
        if (v != null) {
          result[k.toString()] = _friendlyFieldMessage(k.toString(), v.toString());
        }
      });
    }
    return result;
  }

  static String _friendlyFieldMessage(String field, String? rawMessage) {
    final f = field.toLowerCase();
    if (f.contains('phone')) {
      return ErrorMessages.validationPhone;
    }
    if (f.contains('password')) {
      return ErrorMessages.validationPassword;
    }
    if (f.contains('start_date') || f.contains('end_date') || f.contains('date')) {
      return ErrorMessages.validationLeaveDates;
    }
    if (f.contains('file') || f.contains('document') || f.contains('photo')) {
      return ErrorMessages.validationFile;
    }
    return ErrorMessages.validationDefault;
  }

  static void _logDebug(String message) {
    if (kDebugMode) {
      debugPrint('[ErrorMapper] $message');
    }
  }
}
