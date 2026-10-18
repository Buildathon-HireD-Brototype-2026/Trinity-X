import 'dart:async';
import '../domain/trip_model.dart';

abstract class TripRepository {
  Future<List<TripModel>> getTrips();
  Stream<List<TripModel>> watchTrips();
  Future<void> startTrip(String tripId);
  Future<void> markSpotReached(String tripId, {double? lat, double? lng});
  Future<void> markDestinationReached(String tripId, {double? lat, double? lng});
  Future<void> completeTrip(String tripId);
  Future<void> cancelTrip(String tripId);
  Future<void> addExpense(String tripId, String description, double amount);
  Future<void> deleteExpense(String tripId, int expenseId);
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
      pickupLat: 12.9784,
      pickupLng: 77.6408,
      dropoffLat: 12.9492,
      dropoffLng: 77.6489,
    ),
    TripModel(
      tripId: '8421',
      orderId: 1042,
      status: 'ASSIGNED',
      companyName: 'Apex Logistics Ltd.',
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
      pickupLat: 12.8452,
      pickupLng: 77.6602,
      dropoffLat: 13.2007,
      dropoffLng: 77.7088,
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
      pickupLat: 13.2185,
      pickupLng: 77.7126,
      dropoffLat: 12.9719,
      dropoffLng: 77.5958,
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
      pickupLat: 12.8398,
      pickupLng: 77.6770,
      dropoffLat: 12.9678,
      dropoffLng: 77.5989,
    ),
    TripModel(
      tripId: '8419',
      orderId: 1040,
      status: 'CLOSED',
      companyName: 'Wipro Technologies',
      pickupSpot: 'Sarjapur Main Road, Bellandur, Bengaluru',
      dropoffSpot: 'Kempegowda International Airport (BLR), Terminal 1',
      pickupTime: _calcKolkataUtc(-1, 14, 0), // Yesterday 2:00 PM IST
      estimatedReachMinutes: 50,
      contactName: 'Vikram Seth',
      contactPhone: '+91 98440 11223',
      notes: 'Direct airport drop.',
      amount: 2500.00,
      driverShare: 850.00,
      otp: '654321',
      otpAttempts: 1,
      expensesConfirmed: true,
      expenses: const [
        TripExpenseModel(
          expenseId: 495,
          description: 'Airport Expressway Toll',
          amount: 110.00,
        ),
      ],
      assignedAt: _calcKolkataUtc(-1, 13, 0),
      startedAt: _calcKolkataUtc(-1, 14, 5),
      closedAt: _calcKolkataUtc(-1, 15, 20),
    ),
    TripModel(
      tripId: '8418',
      orderId: 1039,
      status: 'CLOSED',
      companyName: 'Flipkart Internet Pvt Ltd',
      pickupSpot: 'Ozone Manay Tech Park, Kudlu Gate, Bengaluru',
      dropoffSpot: 'Taj West End, Race Course Rd, Bengaluru',
      pickupTime: _calcKolkataUtc(-2, 10, 0), // 2 days ago 10:00 AM IST
      estimatedReachMinutes: 35,
      contactName: 'Sneha Roy',
      contactPhone: '+91 98220 33445',
      notes: 'Corporate client delegation.',
      amount: 1800.00,
      driverShare: 620.00,
      otp: '789123',
      otpAttempts: 1,
      expensesConfirmed: true,
      expenses: const [
        TripExpenseModel(
          expenseId: 490,
          description: 'Hotel Valet & Parking Receipt',
          amount: 60.00,
        ),
      ],
      assignedAt: _calcKolkataUtc(-2, 9, 0),
      startedAt: _calcKolkataUtc(-2, 10, 5),
      closedAt: _calcKolkataUtc(-2, 11, 10),
    ),
    TripModel(
      tripId: '8417',
      orderId: 1038,
      status: 'CLOSED',
      companyName: 'Apex Logistics Ltd.',
      pickupSpot: 'Koramangala 4th Block, 80 Feet Road, Bengaluru',
      dropoffSpot: 'Brigade Gateway, Rajajinagar, Bengaluru',
      pickupTime: _calcKolkataUtc(-4, 11, 30), // 4 days ago 11:30 AM IST
      estimatedReachMinutes: 30,
      contactName: 'Deepak Rao',
      contactPhone: '+91 98770 55667',
      notes: 'No luggage. Standard drop.',
      amount: 1400.00,
      driverShare: 450.00,
      otp: '321987',
      otpAttempts: 1,
      expensesConfirmed: false,
      expenses: const [],
      assignedAt: _calcKolkataUtc(-4, 10, 30),
      startedAt: _calcKolkataUtc(-4, 11, 35),
      closedAt: _calcKolkataUtc(-4, 12, 30),
    ),
    TripModel(
      tripId: '8416',
      orderId: 1037,
      status: 'CANCELLED',
      companyName: 'Swiggy HQ',
      pickupSpot: 'Embassy TechVillage, Outer Ring Road, Bengaluru',
      dropoffSpot: 'MG Road Metro, Bengaluru',
      pickupTime: _calcKolkataUtc(-5, 15, 0), // 5 days ago 3:00 PM IST
      estimatedReachMinutes: 25,
      contactName: 'Manish Verma',
      contactPhone: '+91 98110 99887',
      notes: 'Client cancelled due to meeting reschedule.',
      amount: 0.00,
      driverShare: 0.00,
      otp: '000000',
      otpAttempts: 0,
      expensesConfirmed: false,
      expenses: const [],
      assignedAt: _calcKolkataUtc(-5, 14, 0),
      startedAt: null,
      closedAt: _calcKolkataUtc(-5, 14, 30),
    ),
    // September 2026 Completed Trips (PRD D-10 & D-12)
    TripModel(
      tripId: '8390',
      orderId: 1022,
      status: 'CLOSED',
      companyName: 'Wipro Technologies',
      pickupSpot: 'Koramangala Sony World Signal, Bengaluru',
      dropoffSpot: 'Electronic City Phase 1, Bengaluru',
      pickupTime: DateTime.utc(2026, 9, 29, 4, 0),
      assignedAt: DateTime.utc(2026, 9, 29, 3, 30),
      startedAt: DateTime.utc(2026, 9, 29, 4, 5),
      closedAt: DateTime.utc(2026, 9, 29, 5, 45), // 11:15 AM IST
      amount: 2200.00,
      driverShare: 750.00,
      otp: '892014',
      otpAttempts: 1,
      expensesConfirmed: true,
      expenses: const [
        TripExpenseModel(
          expenseId: 480,
          description: 'Electronic City Flyover Toll',
          amount: 140.00,
        ),
      ],
    ),
    TripModel(
      tripId: '8385',
      orderId: 1018,
      status: 'CLOSED',
      companyName: 'Infosys Technologies',
      pickupSpot: 'Indiranagar 12th Main, Bengaluru',
      dropoffSpot: 'Phoenix Marketcity, Whitefield, Bengaluru',
      pickupTime: DateTime.utc(2026, 9, 25, 8, 30),
      assignedAt: DateTime.utc(2026, 9, 25, 8, 0),
      startedAt: DateTime.utc(2026, 9, 25, 8, 35),
      closedAt: DateTime.utc(2026, 9, 25, 10, 15), // 3:45 PM IST
      amount: 2800.00,
      driverShare: 920.00,
      otp: '671239',
      otpAttempts: 1,
      expensesConfirmed: true,
      expenses: const [
        TripExpenseModel(
          expenseId: 475,
          description: 'Mall Parking Gate 3',
          amount: 60.00,
        ),
      ],
    ),
    TripModel(
      tripId: '8380',
      orderId: 1015,
      status: 'CLOSED',
      companyName: 'Apex Logistics Ltd.',
      pickupSpot: 'Jayanagar 4th Block, Bengaluru',
      dropoffSpot: 'Manyata Tech Park, Nagavara, Bengaluru',
      pickupTime: DateTime.utc(2026, 9, 20, 2, 30),
      assignedAt: DateTime.utc(2026, 9, 20, 2, 0),
      startedAt: DateTime.utc(2026, 9, 20, 2, 35),
      closedAt: DateTime.utc(2026, 9, 20, 3, 50), // 9:20 AM IST
      amount: 1750.00,
      driverShare: 580.00,
      otp: '451290',
      otpAttempts: 1,
      expensesConfirmed: false,
      expenses: const [],
    ),
    // August 2026 Completed Trips (PRD D-10 & D-12)
    TripModel(
      tripId: '8340',
      orderId: 980,
      status: 'CLOSED',
      companyName: 'Tata Consultancy Services',
      pickupSpot: 'MG Road Metro Station, Bengaluru',
      dropoffSpot: 'Kempegowda International Airport (BLR), Terminal 1',
      pickupTime: DateTime.utc(2026, 8, 28, 5, 30),
      assignedAt: DateTime.utc(2026, 8, 28, 5, 0),
      startedAt: DateTime.utc(2026, 8, 28, 5, 35),
      closedAt: DateTime.utc(2026, 8, 28, 7, 10), // 12:40 PM IST
      amount: 2100.00,
      driverShare: 680.00,
      otp: '189234',
      otpAttempts: 1,
      expensesConfirmed: true,
      expenses: const [
        TripExpenseModel(
          expenseId: 450,
          description: 'Airport Expressway Toll',
          amount: 90.00,
        ),
      ],
    ),
    TripModel(
      tripId: '8332',
      orderId: 975,
      status: 'CLOSED',
      companyName: 'Flipkart Internet Pvt Ltd',
      pickupSpot: 'HSR Layout Sector 2, Bengaluru',
      dropoffSpot: 'RMZ Ecospace, Outer Ring Road, Bengaluru',
      pickupTime: DateTime.utc(2026, 8, 21, 11, 0),
      assignedAt: DateTime.utc(2026, 8, 21, 10, 30),
      startedAt: DateTime.utc(2026, 8, 21, 11, 5),
      closedAt: DateTime.utc(2026, 8, 21, 12, 30), // 6:00 PM IST
      amount: 2500.00,
      driverShare: 840.00,
      otp: '912834',
      otpAttempts: 1,
      expensesConfirmed: false,
      expenses: const [],
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
  Future<void> markSpotReached(String tripId, {double? lat, double? lng}) async {
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        return t.copyWith(
          spotReachedAt: DateTime.now().toUtc(),
        );
      }
      return t;
    }).toList();
    _controller.add(List.unmodifiable(_mockTrips));
  }

  @override
  Future<void> markDestinationReached(String tripId, {double? lat, double? lng}) async {
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        return t.copyWith(
          destinationReachedAt: DateTime.now().toUtc(),
        );
      }
      return t;
    }).toList();
    _controller.add(List.unmodifiable(_mockTrips));
  }

  @override
  Future<void> startTrip(String tripId) async {
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        final now = DateTime.now().toUtc();
        return t.copyWith(
          status: 'ONGOING',
          startedAt: now,
          spotReachedAt: t.spotReachedAt ?? now,
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
        final now = DateTime.now().toUtc();
        return t.copyWith(
          status: 'CLOSED',
          closedAt: now,
          destinationReachedAt: t.destinationReachedAt ?? now,
          spotReachedAt: t.spotReachedAt ?? now,
          startedAt: t.startedAt ?? now,
        );
      }
      return t;
    }).toList();
    _controller.add(List.unmodifiable(_mockTrips));
  }

  @override
  Future<void> cancelTrip(String tripId) async {
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        return t.copyWith(
          status: 'CANCELLED',
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
  Future<void> deleteExpense(String tripId, int expenseId) async {
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        final remaining = t.expenses.where((e) => e.expenseId != expenseId).toList();
        return t.copyWith(
          expenses: remaining,
          expensesConfirmed: remaining.isNotEmpty,
        );
      }
      return t;
    }).toList();
    _controller.add(List.unmodifiable(_mockTrips));
  }

  @override
  Future<bool> closeTripWithOtp(String tripId, String enteredOtp) async {
    final trip = _mockTrips.firstWhere((t) => t.tripId == tripId);
    // Security lockout: Block verification if maximum attempts (3) exceeded
    if (trip.otpAttempts >= 3) {
      return false;
    }
    if (trip.otp == enteredOtp.trim()) {
      await completeTrip(tripId);
      return true;
    }
    // Increment OTP attempts on failure
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
