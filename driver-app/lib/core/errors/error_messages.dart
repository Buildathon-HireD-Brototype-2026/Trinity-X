/// Centralized, translation-ready user-facing error strings for the HireD Driver application.
///
/// Rules:
/// - Every user-facing message is defined here in plain English.
/// - One short sentence per message, no technical words, no blame, clear next steps.
/// - Never includes URLs, IP addresses, ports, HTTP codes, JSON, or raw exception text.
/// - Accompanied by standard support reference codes (e.g. Ref: HD-NET-01).
class ErrorMessages {
  ErrorMessages._();

  // ---------------------------------------------------------------------------
  // Reference Codes
  // ---------------------------------------------------------------------------
  static const String refAuthInvalid = 'HD-AUTH-01';
  static const String refAuthLocked = 'HD-AUTH-02';
  static const String refAuthInactive = 'HD-AUTH-03';
  static const String refSessionExpired = 'HD-AUTH-04';
  static const String refPermission = 'HD-PERM-01';
  static const String refNoInternet = 'HD-NET-01';
  static const String refServerUnreachable = 'HD-NET-02';
  static const String refTimeout = 'HD-NET-03';
  static const String refServerProblem = 'HD-SRV-01';
  static const String refRateLimit = 'HD-RATE-01';
  static const String refNotFound = 'HD-NF-01';
  static const String refConflict = 'HD-CON-01';
  static const String refValidation = 'HD-VAL-01';
  static const String refOtpInvalid = 'HD-OTP-01';
  static const String refOtpLocked = 'HD-OTP-02';
  static const String refFileError = 'HD-FILE-01';
  static const String refGpsPermission = 'HD-GPS-01';
  static const String refGpsDisabled = 'HD-GPS-02';
  static const String refLocationOffline = 'HD-LOC-01';
  static const String refUnknown = 'HD-UNK-01';

  // ---------------------------------------------------------------------------
  // Messages (Exact Specifications)
  // ---------------------------------------------------------------------------

  /// Wrong phone or password, and unknown phone (HD-AUTH-01)
  static const String authInvalidCredentials =
      'Phone number or password is not correct.';

  /// Account locked after wrong attempts (HD-AUTH-02)
  static const String authAccountLocked =
      'Too many wrong attempts. Please try again after some time.';

  /// Account inactive or pending (HD-AUTH-03)
  static const String authAccountInactive =
      'This account cannot be used right now. Please contact the HireD office.';

  /// Session expired after login (HD-AUTH-04)
  static const String sessionExpired =
      'Your session has ended. Please log in again.';

  /// No permission / 403 Forbidden (HD-PERM-01)
  static const String forbidden =
      'You do not have permission to do this.';

  /// No internet connection (HD-NET-01)
  static const String noInternet =
      'No internet connection. Please check your network and try again.';

  /// Server cannot be reached / connection refused (HD-NET-02)
  static const String serverUnreachable =
      'We could not connect right now. Please try again in a moment.';

  /// Timeout (HD-NET-03)
  static const String timeout =
      'This is taking longer than usual. Please try again.';

  /// Server problem / 500, 502, 503 (HD-SRV-01)
  static const String serverProblem =
      'Something went wrong on our side. Please try again later.';

  /// Too many requests / 429 (HD-RATE-01)
  static const String rateLimited =
      'Please wait a few seconds and try again.';

  /// Not found / 404 (HD-NF-01)
  static const String notFound =
      'We could not find this. Please refresh and try again.';

  /// Conflict - Default (HD-CON-01)
  static const String conflictDefault =
      'This action is not possible right now.';

  /// Conflict - Expense on closed/non-ongoing trip (HD-CON-01)
  static const String conflictExpenseNotOngoing =
      'Expenses can only be added while the trip is ongoing.';

  /// Conflict - Trip already started (HD-CON-01)
  static const String conflictTripAlreadyStarted =
      'This trip has already started.';

  /// Conflict - Trip already completed (HD-CON-01)
  static const String conflictTripAlreadyClosed =
      'This trip has already been completed.';

  /// Validation - General (HD-VAL-01)
  static const String validationDefault =
      'Please check the details and try again.';

  /// Validation - Phone number (HD-VAL-01)
  static const String validationPhone =
      'Enter a valid 10-digit phone number.';

  /// Validation - Password length (HD-VAL-01)
  static const String validationPassword =
      'Password must be at least 6 characters.';

  /// Validation - Leave date order (HD-VAL-01)
  static const String validationLeaveDates =
      'Choose an end date after the start date.';

  /// Validation - File format & size (HD-VAL-01 / HD-FILE-01)
  static const String validationFile =
      'File must be a JPG, PNG or PDF under 5 MB.';

  /// Wrong trip OTP (HD-OTP-01)
  static const String otpInvalid =
      'The OTP is not correct. Please ask the passenger again.';

  /// Too many wrong OTP attempts (HD-OTP-02)
  static const String otpLocked =
      'Too many wrong attempts. Please contact the HireD office.';

  /// File upload failed or oversized (HD-FILE-01)
  static const String fileUploadFailed =
      'Could not upload the file. Use a JPG, PNG or PDF under 5 MB.';

  /// Location permission denied (HD-GPS-01)
  static const String gpsPermissionDenied =
      'Location permission is needed to show your position. You can turn it on in Settings.';

  /// GPS turned off (HD-GPS-02)
  static const String gpsDisabled =
      'Please turn on your phone\'s location (GPS).';

  /// Location queued offline (HD-LOC-01 - Informational)
  static const String locationQueuedOffline =
      'Your location will be sent when you are back online.';

  /// Unknown fallback (HD-UNK-01)
  static const String unknown =
      'Something went wrong. Please try again.';

  /// Formats a reference code for display (e.g. "Ref: HD-NET-01")
  static String formatRef(String code) => 'Ref: $code';
}
