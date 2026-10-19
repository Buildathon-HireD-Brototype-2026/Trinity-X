/// Model representing an individual logged expense for a trip.
class TripExpenseModel {
  final int expenseId;
  final int tripId;
  final int driverId;
  final String description;
  final String amount;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const TripExpenseModel({
    required this.expenseId,
    required this.tripId,
    required this.driverId,
    required this.description,
    required this.amount,
    this.createdAt,
    this.updatedAt,
  });

  factory TripExpenseModel.fromJson(Map<String, dynamic> json) {
    return TripExpenseModel(
      expenseId: json['expense_id'] as int? ?? json['id'] as int? ?? 0,
      tripId: json['trip_id'] as int? ?? 0,
      driverId: json['driver_id'] as int? ?? 0,
      description: json['description'] as String? ?? '',
      amount: json['amount']?.toString() ?? '0.00',
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'] as String) : null,
      updatedAt: json['updated_at'] != null ? DateTime.tryParse(json['updated_at'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'expense_id': expenseId,
      'trip_id': tripId,
      'driver_id': driverId,
      'description': description,
      'amount': amount,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}

/// Model representing an assigned or ongoing trip for the driver.
class TripModel {
  final String tripId;
  final String status; // 'UNASSIGNED', 'ASSIGNED', 'ONGOING', 'CLOSED'
  final String pickupSpot;
  final String? dropoffSpot;
  final DateTime pickupTime; // Server UTC time
  final int estimatedReachMinutes;
  final String? amount;
  final DateTime? eta;
  final bool expensesConfirmed;
  final bool hasSelfie;
  final DateTime? assignedAt;
  final DateTime? startedAt;
  final DateTime? closedAt;
  final int version;
  final String? contactName;
  final String? contactPhone;
  final String? notes;
  final List<TripExpenseModel> expenses;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;

  const TripModel({
    required this.tripId,
    required this.status,
    required this.pickupSpot,
    this.dropoffSpot,
    required this.pickupTime,
    this.estimatedReachMinutes = 18,
    this.amount,
    this.eta,
    this.expensesConfirmed = false,
    this.hasSelfie = false,
    this.assignedAt,
    this.startedAt,
    this.closedAt,
    this.version = 0,
    this.contactName,
    this.contactPhone,
    this.notes,
    this.expenses = const [],
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
  });

  bool get isAssigned => status.toUpperCase() == 'ASSIGNED';
  bool get isOngoing => status.toUpperCase() == 'ONGOING';
  bool get isClosed => status.toUpperCase() == 'CLOSED';

  factory TripModel.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic val, [DateTime? fallback]) {
      if (val is String) {
        final parsed = DateTime.tryParse(val);
        if (parsed != null) return parsed;
      }
      return fallback ?? DateTime.now().toUtc();
    }

    final expensesList = <TripExpenseModel>[];
    if (json['expenses'] is List) {
      for (final item in json['expenses'] as List) {
        if (item is Map<String, dynamic>) {
          expensesList.add(TripExpenseModel.fromJson(item));
        }
      }
    }

    return TripModel(
      tripId: json['trip_id']?.toString() ?? json['id']?.toString() ?? '',
      status: json['status'] as String? ?? 'ASSIGNED',
      pickupSpot: json['pickup_spot'] as String? ?? json['pickupSpot'] as String? ?? 'Pickup Spot',
      dropoffSpot: json['dropoff_spot'] as String? ?? json['dropoffSpot'] as String?,
      pickupTime: parseDate(json['pickup_time'] ?? json['pickupTime']),
      estimatedReachMinutes: json['estimatedReachMinutes'] as int? ?? 18,
      amount: json['amount']?.toString(),
      eta: json['eta'] != null ? DateTime.tryParse(json['eta'] as String) : null,
      expensesConfirmed: json['expenses_confirmed'] as bool? ?? false,
      hasSelfie: json['has_selfie'] as bool? ?? false,
      assignedAt: json['assigned_at'] != null ? DateTime.tryParse(json['assigned_at'] as String) : null,
      startedAt: json['started_at'] != null ? DateTime.tryParse(json['started_at'] as String) : null,
      closedAt: json['closed_at'] != null ? DateTime.tryParse(json['closed_at'] as String) : null,
      version: json['version'] as int? ?? 0,
      contactName: json['contact_name'] as String?,
      contactPhone: json['contact_phone'] as String?,
      notes: json['notes'] as String?,
      expenses: expensesList,
      pickupLat: (json['pickup_lat'] as num?)?.toDouble() ?? (json['pickupLat'] as num?)?.toDouble(),
      pickupLng: (json['pickup_lng'] as num?)?.toDouble() ?? (json['pickupLng'] as num?)?.toDouble(),
      dropoffLat: (json['dropoff_lat'] as num?)?.toDouble() ?? (json['dropoffLat'] as num?)?.toDouble(),
      dropoffLng: (json['dropoff_lng'] as num?)?.toDouble() ?? (json['dropoffLng'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'trip_id': tripId,
      'status': status,
      'pickup_spot': pickupSpot,
      'dropoff_spot': dropoffSpot,
      'pickup_time': pickupTime.toIso8601String(),
      'amount': amount,
      'eta': eta?.toIso8601String(),
      'expenses_confirmed': expensesConfirmed,
      'has_selfie': hasSelfie,
      'assigned_at': assignedAt?.toIso8601String(),
      'started_at': startedAt?.toIso8601String(),
      'closed_at': closedAt?.toIso8601String(),
      'version': version,
      'contact_name': contactName,
      'contact_phone': contactPhone,
      'notes': notes,
      'expenses': expenses.map((e) => e.toJson()).toList(),
      'pickup_lat': pickupLat,
      'pickup_lng': pickupLng,
      'dropoff_lat': dropoffLat,
      'dropoff_lng': dropoffLng,
    };
  }

  TripModel copyWith({
    String? tripId,
    String? status,
    String? pickupSpot,
    String? dropoffSpot,
    DateTime? pickupTime,
    int? estimatedReachMinutes,
    String? amount,
    DateTime? eta,
    bool? expensesConfirmed,
    bool? hasSelfie,
    DateTime? assignedAt,
    DateTime? startedAt,
    DateTime? closedAt,
    int? version,
    String? contactName,
    String? contactPhone,
    String? notes,
    List<TripExpenseModel>? expenses,
    double? pickupLat,
    double? pickupLng,
    double? dropoffLat,
    double? dropoffLng,
  }) {
    return TripModel(
      tripId: tripId ?? this.tripId,
      status: status ?? this.status,
      pickupSpot: pickupSpot ?? this.pickupSpot,
      dropoffSpot: dropoffSpot ?? this.dropoffSpot,
      pickupTime: pickupTime ?? this.pickupTime,
      estimatedReachMinutes: estimatedReachMinutes ?? this.estimatedReachMinutes,
      amount: amount ?? this.amount,
      eta: eta ?? this.eta,
      expensesConfirmed: expensesConfirmed ?? this.expensesConfirmed,
      hasSelfie: hasSelfie ?? this.hasSelfie,
      assignedAt: assignedAt ?? this.assignedAt,
      startedAt: startedAt ?? this.startedAt,
      closedAt: closedAt ?? this.closedAt,
      version: version ?? this.version,
      contactName: contactName ?? this.contactName,
      contactPhone: contactPhone ?? this.contactPhone,
      notes: notes ?? this.notes,
      expenses: expenses ?? this.expenses,
      pickupLat: pickupLat ?? this.pickupLat,
      pickupLng: pickupLng ?? this.pickupLng,
      dropoffLat: dropoffLat ?? this.dropoffLat,
      dropoffLng: dropoffLng ?? this.dropoffLng,
    );
  }
}
