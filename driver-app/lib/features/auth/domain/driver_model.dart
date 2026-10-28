class DriverModel {
  final int id;
  final String name;
  final String phone;
  final String? email;
  final String status; // 'ACTIVE', 'PENDING', 'INACTIVE'
  final bool isOnline;
  final double rating;
  final int totalTrips;
  final String? photoPath;
  final String? currentLocation;

  const DriverModel({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    required this.status,
    this.isOnline = false,
    this.rating = 4.8,
    this.totalTrips = 0,
    this.photoPath,
    this.currentLocation,
  });

  bool get isActive => status.toUpperCase() == 'ACTIVE';
  bool get isPending => status.toUpperCase() == 'PENDING';
  bool get isInactive => status.toUpperCase() == 'INACTIVE';

  DriverModel copyWith({
    int? id,
    String? name,
    String? phone,
    String? email,
    String? status,
    bool? isOnline,
    double? rating,
    int? totalTrips,
    String? photoPath,
    String? currentLocation,
  }) {
    return DriverModel(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      status: status ?? this.status,
      isOnline: isOnline ?? this.isOnline,
      rating: rating ?? this.rating,
      totalTrips: totalTrips ?? this.totalTrips,
      photoPath: photoPath ?? this.photoPath,
      currentLocation: currentLocation ?? this.currentLocation,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'status': status,
      'isOnline': isOnline,
      'rating': rating,
      'totalTrips': totalTrips,
      'photoPath': photoPath,
      'currentLocation': currentLocation,
    };
  }

  factory DriverModel.fromJson(Map<String, dynamic> json) {
    return DriverModel(
      id: (json['id'] ?? json['driverId'] ?? json['user_id'] ?? json['driver_id'] ?? 0) as int,
      name: json['name'] as String? ?? 'Driver',
      phone: json['phone'] as String? ?? json['phone_no'] as String? ?? json['phoneNo'] as String? ?? '',
      email: json['email'] as String?,
      status: json['status'] as String? ?? 'ACTIVE',
      isOnline: json['isOnline'] as bool? ?? json['is_online'] as bool? ?? false,
      rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
      totalTrips: json['totalTrips'] as int? ?? 0,
      photoPath: json['photoPath'] as String? ?? json['photo_path'] as String? ?? json['photoURL'] as String?,
      currentLocation: json['currentLocation'] as String? ?? json['current_location'] as String?,
    );
  }
}
