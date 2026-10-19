/// Represents a scheduled driver leave / unavailability record (database.md driver_leaves table).
class DriverLeaveModel {
  final int leaveId;
  final int driverId;
  final DateTime startDate;
  final DateTime endDate;
  final DateTime createdAt;

  const DriverLeaveModel({
    required this.leaveId,
    required this.driverId,
    required this.startDate,
    required this.endDate,
    required this.createdAt,
  });

  /// Total days of the leave (inclusive)
  int get daysCount {
    final startOnly = DateTime(startDate.year, startDate.month, startDate.day);
    final endOnly = DateTime(endDate.year, endDate.month, endDate.day);
    return endOnly.difference(startOnly).inDays + 1;
  }

  /// Calculates how many days of this leave fall into the specified calendar month
  int daysInMonth(int year, int month) {
    int count = 0;
    var current = DateTime(startDate.year, startDate.month, startDate.day);
    final endOnly = DateTime(endDate.year, endDate.month, endDate.day);

    while (!current.isAfter(endOnly)) {
      if (current.year == year && current.month == month) {
        count++;
      }
      current = current.add(const Duration(days: 1));
    }
    return count;
  }

  /// Returns true if the given calendar date falls inside [startDate, endDate] (inclusive)
  bool containsDate(DateTime date) {
    final target = DateTime(date.year, date.month, date.day);
    final start = DateTime(startDate.year, startDate.month, startDate.day);
    final end = DateTime(endDate.year, endDate.month, endDate.day);
    return (target.isAtSameMomentAs(start) || target.isAfter(start)) &&
        (target.isAtSameMomentAs(end) || target.isBefore(end));
  }

  /// Check whether the leave is strictly in the future (can be cancelled)
  bool isFuture(DateTime todayDateOnly) {
    final start = DateTime(startDate.year, startDate.month, startDate.day);
    return start.isAfter(todayDateOnly);
  }

  /// Factory from JSON
  factory DriverLeaveModel.fromJson(Map<String, dynamic> json) {
    return DriverLeaveModel(
      leaveId: json['leave_id'] as int,
      driverId: json['driver_id'] as int,
      startDate: DateTime.parse(json['start_date'] as String),
      endDate: DateTime.parse(json['end_date'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
    'leave_id': leaveId,
    'driver_id': driverId,
    'start_date': '${startDate.year}-${startDate.month.toString().padLeft(2, '0')}-${startDate.day.toString().padLeft(2, '0')}',
    'end_date': '${endDate.year}-${endDate.month.toString().padLeft(2, '0')}-${endDate.day.toString().padLeft(2, '0')}',
    'created_at': createdAt.toIso8601String(),
  };
}
