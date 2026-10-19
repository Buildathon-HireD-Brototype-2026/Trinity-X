/// Model representing an assigned or ongoing trip for the driver.
class TripModel {
  final String tripId;
  final String status; // 'ASSIGNED', 'ONGOING', 'COMPLETED', etc.
  final String pickupSpot;
  final String? dropoffSpot;
  final DateTime pickupTime; // Server UTC time
  final int estimatedReachMinutes; // Fixed mock value until backend/service is specified
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
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
  });

  bool get isAssigned => status.toUpperCase() == 'ASSIGNED';
  bool get isOngoing => status.toUpperCase() == 'ONGOING';

  TripModel copyWith({
    String? tripId,
    String? status,
    String? pickupSpot,
    String? dropoffSpot,
    DateTime? pickupTime,
    int? estimatedReachMinutes,
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
      pickupLat: pickupLat ?? this.pickupLat,
      pickupLng: pickupLng ?? this.pickupLng,
      dropoffLat: dropoffLat ?? this.dropoffLat,
      dropoffLng: dropoffLng ?? this.dropoffLng,
    );
  }
}
