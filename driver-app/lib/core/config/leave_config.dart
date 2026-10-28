/// Centralized Leave Configuration (PRD D-03).
/// All leave rules, calendar constraints, validation messages, and UI labels
/// must read strictly from these constants.
class LeaveConfig {
  LeaveConfig._();

  /// Maximum allowed leave days per calendar month per driver
  static const int maxLeaveDaysPerMonth = 5;

  /// Minimum advance notice period (in days) required to apply for leave
  static const int minNoticeDays = 7;
}
