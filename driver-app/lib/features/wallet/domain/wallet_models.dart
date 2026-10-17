import 'package:intl/intl.dart';
import '../../trips/domain/trip_model.dart';

/// Settlement status for past closed months (PRD D-12 / Payroll)
enum SettlementStatus {
  paid,
  pending;

  String get label => this == SettlementStatus.paid ? 'Paid' : 'Pending';
}

/// Date filter selection for the trips list in Main Wallet Screen
enum WalletDateFilter {
  today,
  thisWeek,
  thisMonth,
  custom;

  String get label {
    switch (this) {
      case WalletDateFilter.today:
        return 'Today';
      case WalletDateFilter.thisWeek:
        return 'This Week';
      case WalletDateFilter.thisMonth:
        return 'This Month';
      case WalletDateFilter.custom:
        return 'Custom';
    }
  }
}

/// Timezone utility to ensure month rollover and filters operate strictly in IST (UTC+05:30).
class IstDateTimeHelper {
  IstDateTimeHelper._();

  static const Duration istOffset = Duration(hours: 5, minutes: 30);

  /// Converts any UTC or local DateTime to IST
  static DateTime toIST(DateTime dateTime) {
    final utc = dateTime.isUtc ? dateTime : dateTime.toUtc();
    return utc.add(istOffset);
  }

  /// Returns current DateTime in IST
  static DateTime nowIST() {
    return DateTime.now().toUtc().add(istOffset);
  }

  /// Formats month label for top card (e.g., "October 2026")
  static String formatMonthYear(DateTime dateTime) {
    final ist = toIST(dateTime);
    return DateFormat('MMMM yyyy').format(ist);
  }

  /// Formats currency in Indian Rupee format (e.g., "₹1,850.00" or "₹555.00")
  static String formatCurrency(double amount) {
    final formatter = NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
      decimalDigits: 2,
    );
    return formatter.format(amount);
  }

  /// Formats date and time cleanly (e.g. "18 Oct 2026, 09:30 AM")
  static String formatDateTime(DateTime dateTime) {
    final ist = toIST(dateTime);
    return DateFormat('d MMM yyyy, hh:mm a').format(ist);
  }

  /// Formats time only (e.g. "09:30 AM")
  static String formatTime(DateTime dateTime) {
    final ist = toIST(dateTime);
    return DateFormat('hh:mm a').format(ist);
  }

  /// Formats date only (e.g. "18 Oct 2026")
  static String formatDate(DateTime dateTime) {
    final ist = toIST(dateTime);
    return DateFormat('d MMM yyyy').format(ist);
  }

  /// Checks if a given timestamp falls in the current IST month
  static bool isCurrentMonth(DateTime dateTime, [DateTime? referenceNow]) {
    final now = referenceNow != null ? toIST(referenceNow) : nowIST();
    final ist = toIST(dateTime);
    return ist.year == now.year && ist.month == now.month;
  }
}

/// Itemized expense logged for a trip (PRD D-12, D-08).
class WalletExpenseItem {
  final int id;
  final String name; // Name or type (e.g., "Toll", "Parking", "Fuel")
  final double amount;
  final String addedFor; // Who or what it was added for (reason / category)
  final DateTime addedAt;

  const WalletExpenseItem({
    required this.id,
    required this.name,
    required this.amount,
    required this.addedFor,
    required this.addedAt,
  });

  factory WalletExpenseItem.fromTripExpense(TripExpenseModel exp) {
    // If description contains category or reason delimiter, parse it, otherwise use description
    final desc = exp.description.trim();
    String name = 'Other';
    String addedFor = desc.isEmpty ? 'Trip expense' : desc;

    if (desc.toLowerCase().contains('toll')) {
      name = 'Toll';
    } else if (desc.toLowerCase().contains('parking')) {
      name = 'Parking';
    } else if (desc.toLowerCase().contains('fuel') || desc.toLowerCase().contains('gas')) {
      name = 'Fuel';
    } else if (desc.toLowerCase().contains('cleaning') || desc.toLowerCase().contains('wash')) {
      name = 'Vehicle Cleaning';
    }

    return WalletExpenseItem(
      id: exp.expenseId ?? DateTime.now().millisecondsSinceEpoch % 100000,
      name: name,
      amount: exp.amount,
      addedFor: addedFor,
      addedAt: exp.createdAt ?? DateTime.now().toUtc(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'amount': amount,
    'added_for': addedFor,
    'added_at': addedAt.toIso8601String(),
  };

  factory WalletExpenseItem.fromJson(Map<String, dynamic> json) => WalletExpenseItem(
    id: (json['id'] as num?)?.toInt() ?? 0,
    name: json['name']?.toString() ?? 'Expense',
    amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
    addedFor: json['added_for']?.toString() ?? '',
    addedAt: json['added_at'] != null
        ? DateTime.tryParse(json['added_at'].toString()) ?? DateTime.now().toUtc()
        : DateTime.now().toUtc(),
  );
}

/// Trip record tailored for wallet view and ledger (PRD D-12).
class WalletTripRecord {
  final String tripId;
  final int orderId;
  final DateTime tripStartTime;
  final DateTime? tripEndTime;
  final double driverEarning; // Read-only driver split result
  final String status; // 'COMPLETED', 'CLOSED', 'CANCELLED', 'ASSIGNED', 'ONGOING'
  final List<WalletExpenseItem> expenses;
  final double totalExpense;

  const WalletTripRecord({
    required this.tripId,
    required this.orderId,
    required this.tripStartTime,
    this.tripEndTime,
    required this.driverEarning,
    required this.status,
    this.expenses = const [],
    required this.totalExpense,
  });

  bool get isCompleted =>
      status.toUpperCase() == 'COMPLETED' || status.toUpperCase() == 'CLOSED';

  bool get isCancelled => status.toUpperCase() == 'CANCELLED';

  bool get hasExpenses => expenses.isNotEmpty && totalExpense > 0;

  /// Determines if this trip counts towards the live wallet balance.
  /// Edge case: trips that are cancelled or have no driver earning are excluded.
  bool get countsTowardBalance => isCompleted && !isCancelled && driverEarning > 0;

  factory WalletTripRecord.fromTripModel(TripModel trip) {
    final expList = trip.expenses.map((e) => WalletExpenseItem.fromTripExpense(e)).toList();
    final totalExp = expList.fold<double>(0.0, (sum, item) => sum + item.amount);

    return WalletTripRecord(
      tripId: trip.tripId,
      orderId: trip.orderId,
      tripStartTime: trip.startedAt ?? trip.pickupTime,
      tripEndTime: trip.closedAt,
      driverEarning: trip.driverShare,
      status: trip.status,
      expenses: expList,
      totalExpense: totalExp,
    );
  }

  Map<String, dynamic> toJson() => {
    'trip_id': tripId,
    'order_id': orderId,
    'trip_start_time': tripStartTime.toIso8601String(),
    if (tripEndTime != null) 'trip_end_time': tripEndTime!.toIso8601String(),
    'driver_earning': driverEarning,
    'status': status,
    'expenses': expenses.map((e) => e.toJson()).toList(),
    'total_expense': totalExpense,
  };
}

/// Monthly summary record for closed past months (PRD D-12 / rows 63-64).
class MonthlySettlementRecord {
  final String month; // e.g. "September 2026"
  final DateTime monthDate; // Reference month start in IST (e.g. DateTime(2026, 9, 1))
  final double totalDriverEarning; // Fixed once month closes
  final SettlementStatus status; // Paid or Pending (set by admin, read-only to driver)
  final double? paidAmount;
  final DateTime? paidDate;
  final double? pendingAmount;
  final List<WalletTripRecord> trips;

  const MonthlySettlementRecord({
    required this.month,
    required this.monthDate,
    required this.totalDriverEarning,
    required this.status,
    this.paidAmount,
    this.paidDate,
    this.pendingAmount,
    this.trips = const [],
  });

  bool get isPaid => status == SettlementStatus.paid;
  bool get isPending => status == SettlementStatus.pending;
}
