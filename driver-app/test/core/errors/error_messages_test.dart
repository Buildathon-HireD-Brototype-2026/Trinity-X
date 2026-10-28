import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver_app/core/errors/app_error.dart';
import 'package:driver_app/core/errors/error_mapper.dart';
import 'package:driver_app/core/errors/error_messages.dart';
import 'package:driver_app/core/widgets/app_error_view.dart';

void main() {
  group('Safe Driver Error Handling Tests', () {
    test('Automated security leak check: no error message contains internal technical strings', () {
      final forbiddenSubstrings = [
        'http',
        'localhost',
        '10.0.2.2',
        ':5000',
        'exception',
        'dio',
        'sql',
        'prisma',
        'stack',
        '{',
        '}',
        '401',
        '403',
        '404',
        '409',
        '422',
        '429',
        '500',
        '502',
        '503',
      ];

      final allMessages = [
        ErrorMessages.authInvalidCredentials,
        ErrorMessages.authAccountLocked,
        ErrorMessages.authAccountInactive,
        ErrorMessages.sessionExpired,
        ErrorMessages.forbidden,
        ErrorMessages.noInternet,
        ErrorMessages.serverUnreachable,
        ErrorMessages.timeout,
        ErrorMessages.serverProblem,
        ErrorMessages.rateLimited,
        ErrorMessages.notFound,
        ErrorMessages.conflictDefault,
        ErrorMessages.conflictExpenseNotOngoing,
        ErrorMessages.conflictTripAlreadyStarted,
        ErrorMessages.conflictTripAlreadyClosed,
        ErrorMessages.validationDefault,
        ErrorMessages.validationPhone,
        ErrorMessages.validationPassword,
        ErrorMessages.validationLeaveDates,
        ErrorMessages.validationFile,
        ErrorMessages.otpInvalid,
        ErrorMessages.otpLocked,
        ErrorMessages.fileUploadFailed,
        ErrorMessages.gpsPermissionDenied,
        ErrorMessages.gpsDisabled,
        ErrorMessages.locationQueuedOffline,
        ErrorMessages.unknown,
      ];

      for (final msg in allMessages) {
        final lower = msg.toLowerCase();
        for (final forbidden in forbiddenSubstrings) {
          expect(
            lower.contains(forbidden),
            isFalse,
            reason: 'Message "$msg" contains forbidden technical term "$forbidden"',
          );
        }
      }
    });

    test('ErrorMapper maps DioException connection error to HD-NET-01 or HD-NET-02', () {
      final dioConnErr = DioException(
        requestOptions: RequestOptions(path: '/auth/driver/login'),
        type: DioExceptionType.connectionError,
        error: const SocketException('Connection refused to localhost:5000'),
      );

      final mapped = ErrorMapper.map(dioConnErr);
      expect(mapped.refCode, equals(ErrorMessages.refServerUnreachable));
      expect(mapped.userMessage, equals(ErrorMessages.serverUnreachable));
      expect(mapped.formattedRef, equals('Ref: HD-NET-02'));
    });

    test('ErrorMapper maps 401 on login route to HD-AUTH-01', () {
      final dio401 = DioException(
        requestOptions: RequestOptions(path: '/api/v1/auth/driver/login'),
        response: Response(
          requestOptions: RequestOptions(path: '/api/v1/auth/driver/login'),
          statusCode: 401,
          data: {'success': false, 'error': {'code': 'INVALID_CREDENTIALS', 'message': 'Invalid credentials'}},
        ),
      );

      final mapped = ErrorMapper.map(dio401, context: 'login');
      expect(mapped.refCode, equals(ErrorMessages.refAuthInvalid));
      expect(mapped.userMessage, equals(ErrorMessages.authInvalidCredentials));
      expect(mapped.formattedRef, equals('Ref: HD-AUTH-01'));
    });

    test('ErrorMapper maps 403 ACCOUNT_LOCKED to HD-AUTH-02', () {
      final dio403 = DioException(
        requestOptions: RequestOptions(path: '/api/v1/auth/driver/login'),
        response: Response(
          requestOptions: RequestOptions(path: '/api/v1/auth/driver/login'),
          statusCode: 403,
          data: {'success': false, 'error': {'code': 'ACCOUNT_LOCKED', 'message': 'Account locked'}},
        ),
      );

      final mapped = ErrorMapper.map(dio403, context: 'login');
      expect(mapped.refCode, equals(ErrorMessages.refAuthLocked));
      expect(mapped.userMessage, equals(ErrorMessages.authAccountLocked));
      expect(mapped.formattedRef, equals('Ref: HD-AUTH-02'));
    });

    test('ErrorMapper maps 403 DRIVER_NOT_ACTIVE to HD-AUTH-03', () {
      final dio403 = DioException(
        requestOptions: RequestOptions(path: '/api/v1/auth/driver/login'),
        response: Response(
          requestOptions: RequestOptions(path: '/api/v1/auth/driver/login'),
          statusCode: 403,
          data: {'success': false, 'error': {'code': 'DRIVER_NOT_ACTIVE', 'message': 'Inactive'}},
        ),
      );

      final mapped = ErrorMapper.map(dio403, context: 'login');
      expect(mapped.refCode, equals(ErrorMessages.refAuthInactive));
      expect(mapped.userMessage, equals(ErrorMessages.authAccountInactive));
      expect(mapped.formattedRef, equals('Ref: HD-AUTH-03'));
    });

    test('ErrorMapper masks phone numbers in debug logs properly', () {
      expect(ErrorMapper.maskPhone('+919000000001'), equals('**********001'));
      expect(ErrorMapper.maskPhone('9000000002'), equals('*******002'));
      expect(ErrorMapper.maskPhone('123'), equals('***'));
    });

    testWidgets('AppErrorView renders userMessage, ref code, and conditional retry button', (tester) async {
      bool retried = false;
      final retryableError = AppError.serverUnreachable();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppErrorView(
              error: retryableError,
              onRetry: () => retried = true,
            ),
          ),
        ),
      );

      expect(find.text(ErrorMessages.serverUnreachable), findsOneWidget);
      expect(find.text('Ref: HD-NET-02'), findsOneWidget);
      expect(find.byKey(const Key('app_error_retry_button')), findsOneWidget);

      await tester.tap(find.byKey(const Key('app_error_retry_button')));
      expect(retried, isTrue);

      // Non-retryable error hides retry button
      final nonRetryable = AppError.authAccountLocked();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppErrorView(
              error: nonRetryable,
              onRetry: () {},
            ),
          ),
        ),
      );

      expect(find.text(ErrorMessages.authAccountLocked), findsOneWidget);
      expect(find.text('Ref: HD-AUTH-02'), findsOneWidget);
      expect(find.byKey(const Key('app_error_retry_button')), findsNothing);
    });
  });
}
