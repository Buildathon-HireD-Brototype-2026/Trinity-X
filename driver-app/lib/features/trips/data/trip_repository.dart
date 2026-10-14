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

  static DateTime _calcKolkataUtc(int daysOffset, int hour, int minute) {
    final nowKolkata = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
    final targetDate = nowKolkata.add(Duration(days: daysOffset));
    final kolkataDateTime = DateTime.utc(targetDate.year, targetDate.month, targetDate.day, hour, minute);
    return kolkataDateTime.subtract(const Duration(hours: 5, minutes: 30));
  }

  // Mock trips ordered chronologically: today 9 AM first, 1 PM second, another day below
  static final List<TripModel> _initialTrips = [
    TripModel(
      tripId: '8420',
      orderId: 1041,
      status: 'ONGOING',
      companyName: 'Apex Logistics Ltd.',
      pickupSpot: 'Indiranagar Metro Station, 100 Feet Rd, Bengaluru',
      dropoffSpot: 'Embassy GolfLinks Business Park, Domlur, Bengaluru',
      pickupTime: _calcKolkataUtc(0, 9, 0), // Today 9:00 AM IST
      estimatedReachMinutes: 12,
      contactName: 'Rohan Mehra',
      contactPhone: '+91 98765 43210',
      notes: 'Morning corporate commute. Client meeting at 9:45 AM.',
      amount: 1200.00,
      driverShare: 360.00,
      otp: '389102',
      otpAttempts: 0,
      expensesConfirmed: false,
      expenses: const [
        TripExpenseModel(
          expenseId: 500,
          description: 'Parking Ticket - Metro Station',
          amount: 50.00,
        ),
      ],
      assignedAt: _calcKolkataUtc(0, 8, 15),
      startedAt: _calcKolkataUtc(0, 9, 5),
    ),
    TripModel(
      tripId: '8421',
      orderId: 1042,
      status: 'ASSIGNED',
      companyName: 'Wipro Enterprises',
      pickupSpot: 'Tech Park Gate 2, Electronic City, Bengaluru',
      dropoffSpot: 'Kempegowda International Airport (BLR), Terminal 2',
      pickupTime: _calcKolkataUtc(0, 13, 0), // Today 1:00 PM IST
      estimatedReachMinutes: 25,
      contactName: 'Ananya Sharma',
      contactPhone: '+91 98765 12345',
      notes: 'Executive airport drop. Assistance with luggage required.',
      amount: 1850.00,
      driverShare: 555.00,
      otp: '482910',
      otpAttempts: 0,
      expensesConfirmed: false,
      expenses: const [
        TripExpenseModel(
          expenseId: 501,
          description: 'Airport Elevated Expressway Toll',
          amount: 110.00,
        ),
      ],
      assignedAt: _calcKolkataUtc(0, 10, 0),
    ),
    TripModel(
      tripId: '8422',
      orderId: 1043,
      status: 'ASSIGNED',
      companyName: 'Infosys Technologies',
      pickupSpot: 'Prestige Tech Cloud, Devanahalli, Bengaluru',
      dropoffSpot: 'UB City Mall, Vittal Mallya Road, Bengaluru',
      pickupTime: _calcKolkataUtc(1, 10, 30), // Tomorrow 10:30 AM IST
      estimatedReachMinutes: 35,
      contactName: 'Karthik Raman',
      contactPhone: '+91 98450 67890',
      notes: 'Corporate client transport. Please ensure vehicle AC is set to 22°C.',
      amount: 2400.00,
      driverShare: 720.00,
      otp: '739104',
      otpAttempts: 0,
      expensesConfirmed: false,
      expenses: const [],
      assignedAt: _calcKolkataUtc(0, 16, 0),
    ),
    TripModel(
      tripId: '8423',
      orderId: 1044,
      status: 'ASSIGNED',
      companyName: 'Tata Consultancy Services',
      pickupSpot: 'TCS Think Campus, Electronic City Phase 2',
      dropoffSpot: 'ITC Gardenia, Residency Road, Bengaluru',
      pickupTime: _calcKolkataUtc(2, 16, 0), // Upcoming 4:00 PM IST
      estimatedReachMinutes: 40,
      contactName: 'Priya Nair',
      contactPhone: '+91 98123 45678',
      notes: 'Delegation transport from gate 1.',
      amount: 1650.00,
      driverShare: 495.00,
      otp: '518294',
      otpAttempts: 0,
      expensesConfirmed: false,
      expenses: const [],
      assignedAt: _calcKolkataUtc(0, 17, 30),
    ),
  ];

  late List<TripModel> _mockTrips = List.from(_initialTrips);

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
