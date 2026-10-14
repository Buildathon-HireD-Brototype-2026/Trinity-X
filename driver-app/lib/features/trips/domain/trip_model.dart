/// Model representing an expense logged by the driver for a trip (PRD D-08 / database.md `expenses` table).
class TripExpenseModel {
  final int? expenseId;
  final String description;
  final double amount;
  final DateTime? createdAt;

  const TripExpenseModel({
    this.expenseId,
    required this.description,
    required this.amount,
    this.createdAt,
  });

  Map<String, dynamic> toJson() => {
    if (expenseId != null) 'expense_id': expenseId,
    'description': description,
    'amount': amount,
    if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
  };

  factory TripExpenseModel.fromJson(Map<String, dynamic> json) => TripExpenseModel(
    expenseId: json['expense_id'] as int?,
    description: json['description'] as String? ?? '',
    amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
    createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'] as String) : null,
  );

  TripExpenseModel copyWith({
    int? expenseId,
    String? description,
    double? amount,
    DateTime? createdAt,
  }) {
    return TripExpenseModel(
      expenseId: expenseId ?? this.expenseId,
      description: description ?? this.description,
      amount: amount ?? this.amount,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

/// Model representing a Trip with associated Order & Partner Company information
/// exactly mirroring PostgreSQL 17 schema in `database.md` (`trips`, `orders`, `companies`).
class TripModel {
  final String tripId;
  final int orderId;
  final String status; // 'ASSIGNED', 'ONGOING', 'CLOSED'
  final String companyName;
  final String pickupSpot;
  final String dropoffSpot;
  final DateTime pickupTime; // Server UTC time
  final int estimatedReachMinutes;
  final String contactName;
  final String contactPhone;
  final String? notes;
  final double amount;
  final double driverShare;
  final String otp;
  final int otpAttempts;
  final bool expensesConfirmed;
  final List<TripExpenseModel> expenses;
  final DateTime? assignedAt;
  final DateTime? startedAt;
  final DateTime? closedAt;

  const TripModel({
    required this.tripId,
    this.orderId = 1042,
    required this.status,
    this.companyName = 'Apex Logistics Ltd.',
    required this.pickupSpot,
    this.dropoffSpot = 'Kempegowda International Airport (BLR), Terminal 2',
    required this.pickupTime,
    this.estimatedReachMinutes = 18,
    this.contactName = 'Ananya Sharma',
    this.contactPhone = '+91 98765 12345',
    this.notes = 'Executive client pickup. Assistance with luggage required.',
    this.amount = 1850.00,
    this.driverShare = 555.00,
    this.otp = '482910',
    this.otpAttempts = 0,
    this.expensesConfirmed = false,
    this.expenses = const [],
    this.assignedAt,
    this.startedAt,
    this.closedAt,
  });

  bool get isAssigned => status.toUpperCase() == 'ASSIGNED';
  bool get isOngoing => status.toUpperCase() == 'ONGOING';
  bool get isClosed => status.toUpperCase() == 'CLOSED' || status.toUpperCase() == 'COMPLETED';

  TripModel copyWith({
    String? tripId,
    int? orderId,
    String? status,
    String? companyName,
    String? pickupSpot,
    String? dropoffSpot,
    DateTime? pickupTime,
    int? estimatedReachMinutes,
    String? contactName,
    String? contactPhone,
    String? notes,
    double? amount,
    double? driverShare,
    String? otp,
    int? otpAttempts,
    bool? expensesConfirmed,
    List<TripExpenseModel>? expenses,
    DateTime? assignedAt,
    DateTime? startedAt,
    DateTime? closedAt,
  }) {
    return TripModel(
      tripId: tripId ?? this.tripId,
      orderId: orderId ?? this.orderId,
      status: status ?? this.status,
      companyName: companyName ?? this.companyName,
      pickupSpot: pickupSpot ?? this.pickupSpot,
      dropoffSpot: dropoffSpot ?? this.dropoffSpot,
      pickupTime: pickupTime ?? this.pickupTime,
      estimatedReachMinutes: estimatedReachMinutes ?? this.estimatedReachMinutes,
      contactName: contactName ?? this.contactName,
      contactPhone: contactPhone ?? this.contactPhone,
      notes: notes ?? this.notes,
      amount: amount ?? this.amount,
      driverShare: driverShare ?? this.driverShare,
      otp: otp ?? this.otp,
      otpAttempts: otpAttempts ?? this.otpAttempts,
      expensesConfirmed: expensesConfirmed ?? this.expensesConfirmed,
      expenses: expenses ?? this.expenses,
      assignedAt: assignedAt ?? this.assignedAt,
      startedAt: startedAt ?? this.startedAt,
      closedAt: closedAt ?? this.closedAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'trip_id': tripId,
    'order_id': orderId,
    'status': status,
    'company_name': companyName,
    'pickup_spot': pickupSpot,
    'dropoff_spot': dropoffSpot,
    'pickup_time': pickupTime.toIso8601String(),
    'estimated_reach_minutes': estimatedReachMinutes,
    'contact_name': contactName,
    'contact_phone': contactPhone,
    'notes': notes,
    'amount': amount,
    'driver_share': driverShare,
    'otp': otp,
    'otp_attempts': otpAttempts,
    'expenses_confirmed': expensesConfirmed,
    'expenses': expenses.map((e) => e.toJson()).toList(),
    if (assignedAt != null) 'assigned_at': assignedAt!.toIso8601String(),
    if (startedAt != null) 'started_at': startedAt!.toIso8601String(),
    if (closedAt != null) 'closed_at': closedAt!.toIso8601String(),
  };

  factory TripModel.fromJson(Map<String, dynamic> json) {
    return TripModel(
      tripId: json['trip_id']?.toString() ?? '',
      orderId: (json['order_id'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString() ?? 'ASSIGNED',
      companyName: json['company_name']?.toString() ?? 'HireD B2B Partner',
      pickupSpot: json['pickup_spot']?.toString() ?? '',
      dropoffSpot: json['dropoff_spot']?.toString() ?? '',
      pickupTime: json['pickup_time'] != null
          ? DateTime.parse(json['pickup_time'].toString())
          : DateTime.now().toUtc(),
      estimatedReachMinutes: (json['estimated_reach_minutes'] as num?)?.toInt() ?? 18,
      contactName: json['contact_name']?.toString() ?? '',
      contactPhone: json['contact_phone']?.toString() ?? '',
      notes: json['notes']?.toString(),
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      driverShare: (json['driver_share'] as num?)?.toDouble() ?? 0.0,
      otp: json['otp']?.toString() ?? '',
      otpAttempts: (json['otp_attempts'] as num?)?.toInt() ?? 0,
      expensesConfirmed: json['expenses_confirmed'] == true,
      expenses: (json['expenses'] as List<dynamic>?)
              ?.map((e) => TripExpenseModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      assignedAt: json['assigned_at'] != null ? DateTime.tryParse(json['assigned_at'].toString()) : null,
      startedAt: json['started_at'] != null ? DateTime.tryParse(json['started_at'].toString()) : null,
      closedAt: json['closed_at'] != null ? DateTime.tryParse(json['closed_at'].toString()) : null,
    );
  }
}
