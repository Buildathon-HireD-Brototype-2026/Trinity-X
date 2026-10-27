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

  factory TripExpenseModel.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic val) {
      if (val == null) return 0.0;
      if (val is num) return val.toDouble();
      return double.tryParse(val.toString()) ?? 0.0;
    }
    int? parseInt(dynamic val) {
      if (val == null) return null;
      if (val is num) return val.toInt();
      return int.tryParse(val.toString());
    }

    return TripExpenseModel(
      expenseId: parseInt(json['expense_id']),
      description: json['description'] as String? ?? '',
      amount: parseDouble(json['amount']),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }

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
  final DateTime? spotReachedAt;
  final DateTime? startedAt;
  final DateTime? destinationReachedAt;
  final DateTime? closedAt;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;
  final String? routePolyline;
  final String? startSelfieUrl;
  final bool hasSelfie;
  final DateTime? startSelfieUploadedAt;
  final DateTime? startSelfieExpiresAt;
  final DateTime? startSelfieDeletedAt;

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
    this.spotReachedAt,
    this.startedAt,
    this.destinationReachedAt,
    this.closedAt,
    this.pickupLat = 12.9716,
    this.pickupLng = 77.5946,
    this.dropoffLat = 13.1986,
    this.dropoffLng = 77.7066,
    this.routePolyline,
    this.startSelfieUrl,
    this.hasSelfie = false,
    this.startSelfieUploadedAt,
    this.startSelfieExpiresAt,
    this.startSelfieDeletedAt,
  });

  bool get isAssigned => status.toUpperCase() == 'ASSIGNED';
  bool get isOngoing => status.toUpperCase() == 'ONGOING';
  bool get isInProgress => status.toUpperCase() == 'IN_PROGRESS' || status.toUpperCase() == 'ONGOING';
  bool get isClosed => status.toUpperCase() == 'CLOSED' || status.toUpperCase() == 'COMPLETED';
  bool get isCancelled => status.toUpperCase() == 'CANCELLED';

  /// Roster step completion states
  bool get isStepAssigned => true;
  bool get isStepSpotReached => spotReachedAt != null || isOngoing || isClosed;
  bool get isStepInJourney => isOngoing || startedAt != null || isClosed;
  bool get isStepReachedPlace => destinationReachedAt != null || isClosed;

  bool get hasValidCoordinates =>
      pickupLat != null &&
      pickupLng != null &&
      dropoffLat != null &&
      dropoffLng != null &&
      pickupLat != 0.0 &&
      pickupLng != 0.0 &&
      dropoffLat != 0.0 &&
      dropoffLng != 0.0;

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
    DateTime? spotReachedAt,
    DateTime? startedAt,
    DateTime? destinationReachedAt,
    DateTime? closedAt,
    double? pickupLat,
    double? pickupLng,
    double? dropoffLat,
    double? dropoffLng,
    String? routePolyline,
    String? startSelfieUrl,
    bool? hasSelfie,
    DateTime? startSelfieUploadedAt,
    DateTime? startSelfieExpiresAt,
    DateTime? startSelfieDeletedAt,
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
      spotReachedAt: spotReachedAt ?? this.spotReachedAt,
      startedAt: startedAt ?? this.startedAt,
      destinationReachedAt: destinationReachedAt ?? this.destinationReachedAt,
      closedAt: closedAt ?? this.closedAt,
      pickupLat: pickupLat ?? this.pickupLat,
      pickupLng: pickupLng ?? this.pickupLng,
      dropoffLat: dropoffLat ?? this.dropoffLat,
      dropoffLng: dropoffLng ?? this.dropoffLng,
      routePolyline: routePolyline ?? this.routePolyline,
      startSelfieUrl: startSelfieUrl ?? this.startSelfieUrl,
      hasSelfie: hasSelfie ?? this.hasSelfie,
      startSelfieUploadedAt: startSelfieUploadedAt ?? this.startSelfieUploadedAt,
      startSelfieExpiresAt: startSelfieExpiresAt ?? this.startSelfieExpiresAt,
      startSelfieDeletedAt: startSelfieDeletedAt ?? this.startSelfieDeletedAt,
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
    if (spotReachedAt != null) 'spot_reached_at': spotReachedAt!.toIso8601String(),
    if (startedAt != null) 'started_at': startedAt!.toIso8601String(),
    if (destinationReachedAt != null) 'destination_reached_at': destinationReachedAt!.toIso8601String(),
    if (closedAt != null) 'closed_at': closedAt!.toIso8601String(),
    if (pickupLat != null) 'pickup_lat': pickupLat,
    if (pickupLng != null) 'pickup_lng': pickupLng,
    if (dropoffLat != null) 'dropoff_lat': dropoffLat,
    if (dropoffLng != null) 'dropoff_lng': dropoffLng,
    if (routePolyline != null) 'route_polyline': routePolyline,
    if (startSelfieUrl != null) 'start_selfie_url': startSelfieUrl,
    'has_selfie': hasSelfie,
    if (startSelfieUploadedAt != null) 'start_selfie_uploaded_at': startSelfieUploadedAt!.toIso8601String(),
    if (startSelfieExpiresAt != null) 'start_selfie_expires_at': startSelfieExpiresAt!.toIso8601String(),
    if (startSelfieDeletedAt != null) 'start_selfie_deleted_at': startSelfieDeletedAt!.toIso8601String(),
  };

  factory TripModel.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic val, [double fallback = 0.0]) {
      if (val == null) return fallback;
      if (val is num) return val.toDouble();
      return double.tryParse(val.toString()) ?? fallback;
    }

    int parseInt(dynamic val, [int fallback = 0]) {
      if (val == null) return fallback;
      if (val is num) return val.toInt();
      return int.tryParse(val.toString()) ?? fallback;
    }

    final resolvedSelfieUrl = json['start_selfie_url']?.toString() ??
        json['startSelfieUrl']?.toString() ??
        json['selfie_url']?.toString() ??
        json['selfieURL']?.toString();
    final hasSelfieVal = json['has_selfie'] == true ||
        json['hasSelfie'] == true ||
        (resolvedSelfieUrl != null && resolvedSelfieUrl.isNotEmpty);

    return TripModel(
      tripId: json['trip_id']?.toString() ?? '',
      orderId: parseInt(json['order_id']),
      status: json['status']?.toString() ?? 'ASSIGNED',
      companyName: json['company_name']?.toString() ?? 'HireD B2B Partner',
      pickupSpot: json['pickup_spot']?.toString() ?? '',
      dropoffSpot: json['dropoff_spot']?.toString() ?? '',
      pickupTime: json['pickup_time'] != null
          ? DateTime.parse(json['pickup_time'].toString())
          : DateTime.now().toUtc(),
      estimatedReachMinutes: parseInt(json['estimated_reach_minutes'], 18),
      contactName: json['contact_name']?.toString() ?? '',
      contactPhone: json['contact_phone']?.toString() ?? '',
      notes: json['notes']?.toString(),
      amount: parseDouble(json['amount']),
      driverShare: parseDouble(json['driver_share']) > 0
          ? parseDouble(json['driver_share'])
          : (parseDouble(json['amount']) * 0.35),
      otp: json['otp']?.toString() ?? '',
      otpAttempts: parseInt(json['otp_attempts']),
      expensesConfirmed: json['expenses_confirmed'] == true,
      expenses: (json['expenses'] as List<dynamic>?)
              ?.map((e) => TripExpenseModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      assignedAt: json['assigned_at'] != null ? DateTime.tryParse(json['assigned_at'].toString()) : null,
      spotReachedAt: json['spot_reached_at'] != null ? DateTime.tryParse(json['spot_reached_at'].toString()) : null,
      startedAt: json['started_at'] != null ? DateTime.tryParse(json['started_at'].toString()) : null,
      destinationReachedAt: json['destination_reached_at'] != null ? DateTime.tryParse(json['destination_reached_at'].toString()) : null,
      closedAt: json['closed_at'] != null ? DateTime.tryParse(json['closed_at'].toString()) : null,
      pickupLat: parseDouble(json['pickup_lat'], 12.9716),
      pickupLng: parseDouble(json['pickup_lng'], 77.5946),
      dropoffLat: parseDouble(json['dropoff_lat'], 13.1986),
      dropoffLng: parseDouble(json['dropoff_lng'], 77.7066),
      routePolyline: json['route_polyline']?.toString(),
      startSelfieUrl: resolvedSelfieUrl,
      hasSelfie: hasSelfieVal,
      startSelfieUploadedAt: json['start_selfie_uploaded_at'] != null
          ? DateTime.tryParse(json['start_selfie_uploaded_at'].toString())
          : (json['startSelfieUploadedAt'] != null
              ? DateTime.tryParse(json['startSelfieUploadedAt'].toString())
              : null),
      startSelfieExpiresAt: json['start_selfie_expires_at'] != null
          ? DateTime.tryParse(json['start_selfie_expires_at'].toString())
          : (json['startSelfieExpiresAt'] != null
              ? DateTime.tryParse(json['startSelfieExpiresAt'].toString())
              : null),
      startSelfieDeletedAt: json['start_selfie_deleted_at'] != null
          ? DateTime.tryParse(json['start_selfie_deleted_at'].toString())
          : (json['startSelfieDeletedAt'] != null
              ? DateTime.tryParse(json['startSelfieDeletedAt'].toString())
              : null),
    );
  }
}
