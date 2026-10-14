import 'dart:async';
import '../domain/trip_model.dart';

abstract class TripRepository {
  Future<List<TripModel>> getTrips();
  Stream<List<TripModel>> watchTrips();
  Future<void> startTrip(String tripId);
  Future<void> completeTrip(String tripId);
  Future<void> addExpense(String tripId, String description, double amount);
  Future<bool> closeTripWithOtp(String tripId, String enteredOtp);
}

/// Mock Trip Repository populated with realistic PostgreSQL data matching
/// `database.md` tables (`trips`, `orders`, `companies`, `expenses`).
class MockTripRepository implements TripRepository {
  final _controller = StreamController<List<TripModel>>.broadcast();

  // Mock initial trips matching database.md and PRD D-04 & D-05
  List<TripModel> _mockTrips = [
    TripModel(
      tripId: '8421',
      orderId: 1042,
      status: 'ASSIGNED',
      companyName: 'Apex Logistics Ltd.',
      pickupSpot: 'Tech Park Gate 2, Electronic City, Bengaluru',
      dropoffSpot: 'Kempegowda International Airport (BLR), Terminal 2',
      pickupTime: DateTime.utc(2026, 10, 14, 5, 0), // 10:30 AM IST
      estimatedReachMinutes: 18,
      contactName: 'Ananya Sharma',
      contactPhone: '+91 98765 12345',
      notes: 'VIP client airport drop. Executive Sedan requested. Assistance with 2 luggage bags required.',
      amount: 1850.00,
      driverShare: 555.00, // 30% driver_share_pct per database.md
      otp: '482910', // 6-digit trip close code generated per trip (PRD D-09)
      otpAttempts: 0,
      expensesConfirmed: false,
      expenses: const [
        TripExpenseModel(
          expenseId: 501,
          description: 'Airport Elevated Expressway Toll',
          amount: 110.00,
        ),
      ],
      assignedAt: DateTime.utc(2026, 10, 14, 4, 30),
    ),
    TripModel(
      tripId: '8422',
      orderId: 1043,
      status: 'ASSIGNED',
      companyName: 'Infosys Technologies',
      pickupSpot: 'Prestige Tech Cloud, Devanahalli, Bengaluru',
      dropoffSpot: 'UB City Mall, Vittal Mallya Road, Bengaluru',
      pickupTime: DateTime.utc(2026, 10, 14, 8, 15), // 1:45 PM IST
      estimatedReachMinutes: 35,
      contactName: 'Karthik Raman',
      contactPhone: '+91 98450 67890',
      notes: 'Corporate client executive transport. Ensure vehicle AC is set to 22°C before pickup.',
      amount: 2400.00,
      driverShare: 720.00, // 30% driver_share_pct
      otp: '739104',
      otpAttempts: 0,
      expensesConfirmed: false,
      expenses: const [],
      assignedAt: DateTime.utc(2026, 10, 14, 4, 45),
    ),
  ];

  MockTripRepository() {
    _controller.add(_mockTrips);
  }

  @override
  Future<List<TripModel>> getTrips() async {
    return List.unmodifiable(_mockTrips);
  }

  @override
  Stream<List<TripModel>> watchTrips() async* {
    yield List.unmodifiable(_mockTrips);
    yield* _controller.stream;
  }

  @override
  Future<void> startTrip(String tripId) async {
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        return t.copyWith(
          status: 'ONGOING',
          startedAt: DateTime.now().toUtc(),
        );
      }
      return t;
    }).toList();
    _controller.add(List.unmodifiable(_mockTrips));
  }

  @override
  Future<void> completeTrip(String tripId) async {
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        return t.copyWith(
          status: 'CLOSED',
          closedAt: DateTime.now().toUtc(),
        );
      }
      return t;
    }).toList();
    _controller.add(List.unmodifiable(_mockTrips));
  }

  @override
  Future<void> addExpense(String tripId, String description, double amount) async {
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        final newExpense = TripExpenseModel(
          expenseId: DateTime.now().millisecondsSinceEpoch % 10000,
          description: description,
          amount: amount,
          createdAt: DateTime.now().toUtc(),
        );
        return t.copyWith(
          expenses: [...t.expenses, newExpense],
          expensesConfirmed: true,
        );
      }
      return t;
    }).toList();
    _controller.add(List.unmodifiable(_mockTrips));
  }

  @override
  Future<bool> closeTripWithOtp(String tripId, String enteredOtp) async {
    final trip = _mockTrips.firstWhere((t) => t.tripId == tripId);
    if (trip.otp == enteredOtp.trim()) {
      await completeTrip(tripId);
      return true;
    }
    // Increment OTP attempts
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        return t.copyWith(otpAttempts: t.otpAttempts + 1);
      }
      return t;
    }).toList();
    _controller.add(List.unmodifiable(_mockTrips));
    return false;
  }

  /// Updates mock trips (for testing assignment, start, closure)
  void updateTrips(List<TripModel> trips) {
    _mockTrips = trips;
    _controller.add(List.unmodifiable(_mockTrips));
  }
}

/*
// =============================================================================
// BACKEND REAL HTTP INTEGRATION CODE (Commented per user instructions)
// =============================================================================
//
// Below is the production implementation of TripRepository that connects to
// the backend Express/Prisma API (`/api/v1/driver/trips/...`) once deployed.
// To activate, swap MockTripRepository with RemoteTripRepository in `current_trip_provider.dart`.
//
// import 'package:dio/dio.dart';
//
// class RemoteTripRepository implements TripRepository {
//   final Dio _dio;
//
//   RemoteTripRepository(this._dio);
//
//   @override
//   Future<List<TripModel>> getTrips() async {
//     // Calls GET /api/v1/driver/trips/assigned
//     // Returns trips joined with orders, companies, and expenses from database.md
//     final response = await _dio.get('/driver/trips/assigned');
//     final data = response.data['data'] as List<dynamic>;
//     return data.map((json) => TripModel.fromJson(json as Map<String, dynamic>)).toList();
//   }
//
//   @override
//   Stream<List<TripModel>> watchTrips() async* {
//     yield await getTrips();
//     // For real-time updates: can poll every 10 seconds or listen to WebSocket/SSE
//     final timer = Stream.periodic(const Duration(seconds: 15));
//     await for (final _ in timer) {
//       try {
//         yield await getTrips();
//       } catch (_) {}
//     }
//   }
//
//   @override
//   Future<void> startTrip(String tripId) async {
//     // Calls PATCH /api/v1/driver/trips/:tripId/start
//     await _dio.patch('/driver/trips/$tripId/start');
//   }
//
//   @override
//   Future<void> completeTrip(String tripId) async {
//     // Admin or system force-close
//     await _dio.patch('/driver/trips/$tripId/complete');
//   }
//
//   @override
//   Future<void> addExpense(String tripId, String description, double amount) async {
//     // Calls POST /api/v1/driver/trips/:tripId/expenses
//     await _dio.post('/driver/trips/$tripId/expenses', data: {
//       'description': description,
//       'amount': amount,
//     });
//   }
//
//   @override
//   Future<bool> closeTripWithOtp(String tripId, String enteredOtp) async {
//     // Calls POST /api/v1/driver/trips/:tripId/close
//     final response = await _dio.post('/driver/trips/$tripId/close', data: {
//       'otp': enteredOtp,
//     });
//     return response.data['success'] == true;
//   }
// }
// =============================================================================
*/
