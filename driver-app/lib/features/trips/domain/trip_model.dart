/// Model representing an assigned or ongoing trip for the driver.
class TripModel {
  final String tripId;
  final String status; // 'ASSIGNED', 'ONGOING', 'COMPLETED', etc.
  final String pickupSpot;
  final DateTime pickupTime; // Server UTC time
  final int estimatedReachMinutes; // Fixed mock value until backend/service is specified

  const TripModel({
    required this.tripId,
    required this.status,
    required this.pickupSpot,
    required this.pickupTime,
    this.estimatedReachMinutes = 18,
  });

  bool get isAssigned => status.toUpperCase() == 'ASSIGNED';
  bool get isOngoing => status.toUpperCase() == 'ONGOING';

  TripModel copyWith({
    String? tripId,
    String? status,
    String? pickupSpot,
    DateTime? pickupTime,
    int? estimatedReachMinutes,
  }) {
    return TripModel(
      tripId: tripId ?? this.tripId,
      status: status ?? this.status,
      pickupSpot: pickupSpot ?? this.pickupSpot,
      pickupTime: pickupTime ?? this.pickupTime,
      estimatedReachMinutes: estimatedReachMinutes ?? this.estimatedReachMinutes,
    );
  }
}
