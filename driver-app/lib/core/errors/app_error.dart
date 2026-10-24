import 'error_messages.dart';

/// Categorized kinds of application errors.
enum AppErrorKind {
  authInvalidCredentials,
  authAccountLocked,
  authAccountInactive,
  sessionExpired,
  forbidden,
  noInternet,
  serverUnreachable,
  timeout,
  serverProblem,
  rateLimited,
  notFound,
  conflict,
  validation,
  otpInvalid,
  otpLocked,
  fileError,
  gpsPermissionDenied,
  gpsDisabled,
  locationQueuedOffline,
  unknown,
}

/// Strongly-typed error object carrying a driver-friendly message, a support reference code,
/// retry capability, and optional validation field errors.
///
/// Guaranteed NEVER to contain URLs, ports, IP addresses, status codes, JSON, or stack traces.
class AppError implements Exception {
  final AppErrorKind kind;
  final String userMessage;
  final String refCode;
  final bool canRetry;
  final Map<String, String> fieldErrors;
  final String? technicalDebug; // Available in debug logs only, never in UI

  const AppError({
    required this.kind,
    required this.userMessage,
    required this.refCode,
    this.canRetry = true,
    this.fieldErrors = const {},
    this.technicalDebug,
  });

  /// The formatted reference code string (e.g. "Ref: HD-NET-01").
  String get formattedRef => ErrorMessages.formatRef(refCode);

  /// Combined message with reference code for text display.
  String get displayWithRef => '$userMessage\n$formattedRef';

  @override
  String toString() => userMessage;

  // ---------------------------------------------------------------------------
  // Factory Constructors for Explicit Scenarios
  // ---------------------------------------------------------------------------

  factory AppError.authInvalidCredentials({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.authInvalidCredentials,
        userMessage: ErrorMessages.authInvalidCredentials,
        refCode: ErrorMessages.refAuthInvalid,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.authAccountLocked({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.authAccountLocked,
        userMessage: ErrorMessages.authAccountLocked,
        refCode: ErrorMessages.refAuthLocked,
        canRetry: false,
        technicalDebug: technicalDebug,
      );

  factory AppError.authAccountInactive({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.authAccountInactive,
        userMessage: ErrorMessages.authAccountInactive,
        refCode: ErrorMessages.refAuthInactive,
        canRetry: false,
        technicalDebug: technicalDebug,
      );

  factory AppError.sessionExpired({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.sessionExpired,
        userMessage: ErrorMessages.sessionExpired,
        refCode: ErrorMessages.refSessionExpired,
        canRetry: false,
        technicalDebug: technicalDebug,
      );

  factory AppError.forbidden({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.forbidden,
        userMessage: ErrorMessages.forbidden,
        refCode: ErrorMessages.refPermission,
        canRetry: false,
        technicalDebug: technicalDebug,
      );

  factory AppError.noInternet({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.noInternet,
        userMessage: ErrorMessages.noInternet,
        refCode: ErrorMessages.refNoInternet,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.serverUnreachable({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.serverUnreachable,
        userMessage: ErrorMessages.serverUnreachable,
        refCode: ErrorMessages.refServerUnreachable,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.timeout({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.timeout,
        userMessage: ErrorMessages.timeout,
        refCode: ErrorMessages.refTimeout,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.serverProblem({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.serverProblem,
        userMessage: ErrorMessages.serverProblem,
        refCode: ErrorMessages.refServerProblem,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.rateLimited({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.rateLimited,
        userMessage: ErrorMessages.rateLimited,
        refCode: ErrorMessages.refRateLimit,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.notFound({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.notFound,
        userMessage: ErrorMessages.notFound,
        refCode: ErrorMessages.refNotFound,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.conflict({
    String? customMessage,
    String? technicalDebug,
  }) =>
      AppError(
        kind: AppErrorKind.conflict,
        userMessage: customMessage ?? ErrorMessages.conflictDefault,
        refCode: ErrorMessages.refConflict,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.validation({
    String? customMessage,
    Map<String, String> fieldErrors = const {},
    String? technicalDebug,
  }) =>
      AppError(
        kind: AppErrorKind.validation,
        userMessage: customMessage ?? ErrorMessages.validationDefault,
        refCode: ErrorMessages.refValidation,
        canRetry: true,
        fieldErrors: fieldErrors,
        technicalDebug: technicalDebug,
      );

  factory AppError.otpInvalid({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.otpInvalid,
        userMessage: ErrorMessages.otpInvalid,
        refCode: ErrorMessages.refOtpInvalid,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.otpLocked({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.otpLocked,
        userMessage: ErrorMessages.otpLocked,
        refCode: ErrorMessages.refOtpLocked,
        canRetry: false,
        technicalDebug: technicalDebug,
      );

  factory AppError.fileError({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.fileError,
        userMessage: ErrorMessages.fileUploadFailed,
        refCode: ErrorMessages.refFileError,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.gpsPermissionDenied({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.gpsPermissionDenied,
        userMessage: ErrorMessages.gpsPermissionDenied,
        refCode: ErrorMessages.refGpsPermission,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.gpsDisabled({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.gpsDisabled,
        userMessage: ErrorMessages.gpsDisabled,
        refCode: ErrorMessages.refGpsDisabled,
        canRetry: true,
        technicalDebug: technicalDebug,
      );

  factory AppError.locationQueuedOffline({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.locationQueuedOffline,
        userMessage: ErrorMessages.locationQueuedOffline,
        refCode: ErrorMessages.refLocationOffline,
        canRetry: false,
        technicalDebug: technicalDebug,
      );

  factory AppError.unknown({String? technicalDebug}) =>
      AppError(
        kind: AppErrorKind.unknown,
        userMessage: ErrorMessages.unknown,
        refCode: ErrorMessages.refUnknown,
        canRetry: true,
        technicalDebug: technicalDebug,
      );
}
