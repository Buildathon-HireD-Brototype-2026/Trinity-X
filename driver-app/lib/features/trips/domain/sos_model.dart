/// Domain model for Trip Emergency SOS incident (PostgreSQL `trip_sos_alerts` table).
class TripSosAlertModel {
  final int alertId;
  final int tripId;
  final int driverId;
  final int orderId;
  final String reason; // 'VEHICLE_DAMAGE' or 'MEDICAL_EMERGENCY'
  final String? notes;
  final double latitude;
  final double longitude;
  final String status; // 'OPEN', 'IN_PROGRESS', 'RESOLVED'
  final int? primaryAdminId;
  final int? claimedByAdminId;
  final String? claimedByAdminName;
  final DateTime? claimedAt;
  final DateTime? resolvedAt;
  final String? resolutionNotes;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? driverName;
  final String? driverPhone;
  final String? companyName;

  const TripSosAlertModel({
    required this.alertId,
    required this.tripId,
    required this.driverId,
    required this.orderId,
    required this.reason,
    this.notes,
    required this.latitude,
    required this.longitude,
    required this.status,
    this.primaryAdminId,
    this.claimedByAdminId,
    this.claimedByAdminName,
    this.claimedAt,
    this.resolvedAt,
    this.resolutionNotes,
    this.createdAt,
    this.updatedAt,
    this.driverName,
    this.driverPhone,
    this.companyName,
  });

  bool get isOpen => status.toUpperCase() == 'OPEN';
  bool get isInProgress => status.toUpperCase() == 'IN_PROGRESS';
  bool get isResolved => status.toUpperCase() == 'RESOLVED';
  bool get isActive => isOpen || isInProgress;

  String get reasonDisplay {
    if (reason == 'VEHICLE_DAMAGE') return 'Vehicle Breakdown / Damage';
    if (reason == 'MEDICAL_EMERGENCY') return 'Medical / Personal Safety';
    return reason;
  }

  String get reasonEmoji {
    if (reason == 'VEHICLE_DAMAGE') return '🚗';
    if (reason == 'MEDICAL_EMERGENCY') return '🚨';
    return '⚠️';
  }

  factory TripSosAlertModel.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic val) {
      if (val == null) return 0.0;
      if (val is num) return val.toDouble();
      return double.tryParse(val.toString()) ?? 0.0;
    }

    int parseInt(dynamic val, [int fallback = 0]) {
      if (val == null) return fallback;
      if (val is num) return val.toInt();
      return int.tryParse(val.toString()) ?? fallback;
    }

    DateTime? parseDate(dynamic val) {
      if (val == null) return null;
      if (val is DateTime) return val;
      return DateTime.tryParse(val.toString());
    }

    return TripSosAlertModel(
      alertId: parseInt(json['alertId'] ?? json['alert_id']),
      tripId: parseInt(json['tripId'] ?? json['trip_id']),
      driverId: parseInt(json['driverId'] ?? json['driver_id']),
      orderId: parseInt(json['orderId'] ?? json['order_id']),
      reason: json['reason'] as String? ?? 'VEHICLE_DAMAGE',
      notes: json['notes'] as String?,
      latitude: parseDouble(json['latitude']),
      longitude: parseDouble(json['longitude']),
      status: json['status'] as String? ?? 'OPEN',
      primaryAdminId: json['primaryAdminId'] != null ? parseInt(json['primaryAdminId']) : null,
      claimedByAdminId: json['claimedByAdminId'] != null ? parseInt(json['claimedByAdminId']) : null,
      claimedByAdminName: json['claimedByAdminName'] as String?,
      claimedAt: parseDate(json['claimedAt']),
      resolvedAt: parseDate(json['resolvedAt']),
      resolutionNotes: json['resolutionNotes'] as String?,
      createdAt: parseDate(json['createdAt']),
      updatedAt: parseDate(json['updatedAt']),
      driverName: json['driverName'] as String?,
      driverPhone: json['driverPhone'] as String?,
      companyName: json['companyName'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'alertId': alertId,
    'tripId': tripId,
    'driverId': driverId,
    'orderId': orderId,
    'reason': reason,
    'notes': notes,
    'latitude': latitude,
    'longitude': longitude,
    'status': status,
    'primaryAdminId': primaryAdminId,
    'claimedByAdminId': claimedByAdminId,
    'claimedByAdminName': claimedByAdminName,
    'claimedAt': claimedAt?.toIso8601String(),
    'resolvedAt': resolvedAt?.toIso8601String(),
    'resolutionNotes': resolutionNotes,
    'createdAt': createdAt?.toIso8601String(),
    'updatedAt': updatedAt?.toIso8601String(),
    'driverName': driverName,
    'driverPhone': driverPhone,
    'companyName': companyName,
  };

  TripSosAlertModel copyWith({
    int? alertId,
    int? tripId,
    int? driverId,
    int? orderId,
    String? reason,
    String? notes,
    double? latitude,
    double? longitude,
    String? status,
    int? primaryAdminId,
    int? claimedByAdminId,
    String? claimedByAdminName,
    DateTime? claimedAt,
    DateTime? resolvedAt,
    String? resolutionNotes,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? driverName,
    String? driverPhone,
    String? companyName,
  }) {
    return TripSosAlertModel(
      alertId: alertId ?? this.alertId,
      tripId: tripId ?? this.tripId,
      driverId: driverId ?? this.driverId,
      orderId: orderId ?? this.orderId,
      reason: reason ?? this.reason,
      notes: notes ?? this.notes,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      status: status ?? this.status,
      primaryAdminId: primaryAdminId ?? this.primaryAdminId,
      claimedByAdminId: claimedByAdminId ?? this.claimedByAdminId,
      claimedByAdminName: claimedByAdminName ?? this.claimedByAdminName,
      claimedAt: claimedAt ?? this.claimedAt,
      resolvedAt: resolvedAt ?? this.resolvedAt,
      resolutionNotes: resolutionNotes ?? this.resolutionNotes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      driverName: driverName ?? this.driverName,
      driverPhone: driverPhone ?? this.driverPhone,
      companyName: companyName ?? this.companyName,
    );
  }
}
