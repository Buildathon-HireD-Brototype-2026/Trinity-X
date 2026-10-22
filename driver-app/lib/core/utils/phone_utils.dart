/// Standard phone number normalization and validation utilities for the HireD driver application.
///
/// Converts any valid Indian mobile number format (+91, 91, 10-digit, spaces, dashes)
/// to the canonical database format: `+91XXXXXXXXXX`.
class PhoneUtils {
  PhoneUtils._();

  /// Normalizes an Indian phone number string into `+91XXXXXXXXXX`.
  ///
  /// Supported inputs:
  /// - 10 digits: `9000000001` -> `+919000000001`
  /// - 12 digits (starting with 91): `919000000001` -> `+919000000001`
  /// - With plus: `+919000000001` -> `+919000000001`
  /// - With spaces/dashes/brackets: `+91 90000 00001`, `90000-00001` -> `+919000000001`
  /// - With leading 0: `09000000001` -> `+919000000001`
  ///
  /// Returns empty string if input is blank. If the input cannot be parsed
  /// to 10 digits, returns the trimmed cleaned string.
  static String normalizePhone(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) return '';

    // Strip spaces, dashes, parentheses, dots
    final clean = trimmed.replaceAll(RegExp(r'[\s\-\(\)\.]'), '');
    final digits = clean.replaceAll(RegExp(r'\D'), '');

    if (digits.length == 10) {
      return '+91$digits';
    } else if (digits.length == 11 && digits.startsWith('0')) {
      return '+91${digits.substring(1)}';
    } else if (digits.length == 12 && digits.startsWith('91')) {
      return '+91${digits.substring(2)}';
    } else if (clean.startsWith('+91') && digits.length >= 10) {
      return '+91${digits.substring(digits.length - 10)}';
    }

    return clean.isEmpty ? trimmed : clean;
  }

  /// Validates whether the given string represents a valid 10-digit Indian mobile number.
  /// Indian mobile numbers start with digits 6, 7, 8, or 9.
  static bool isValidIndianPhone(String? input) {
    if (input == null || input.trim().isEmpty) return false;
    final normalized = normalizePhone(input);
    final digits = normalized.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 12 && digits.startsWith('91')) {
      final firstSubscriberDigit = digits[2];
      return RegExp(r'[6-9]').hasMatch(firstSubscriberDigit);
    }
    return false;
  }
}

/// Convenience top-level function for [PhoneUtils.normalizePhone].
String normalizePhone(String input) => PhoneUtils.normalizePhone(input);

/// Convenience top-level function for [PhoneUtils.isValidIndianPhone].
bool isValidIndianPhone(String? input) => PhoneUtils.isValidIndianPhone(input);
