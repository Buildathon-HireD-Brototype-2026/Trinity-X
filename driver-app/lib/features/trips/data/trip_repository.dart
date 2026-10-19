import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/network/api_exception.dart';
import '../domain/trip_model.dart';

abstract class TripRepository {
  Future<List<TripModel>> getTrips();
  Stream<List<TripModel>> watchTrips();
  Future<TripModel> getTripDetails(String tripId);
  Future<void> startTrip(String tripId, {String? selfiePath});
  Future<void> markSpotReached(String tripId, {double? lat, double? lng});
  Future<void> markDestinationReached(String tripId, {double? lat, double? lng});
  Future<void> completeTrip(String tripId, {String? otp});
  Future<void> cancelTrip(String tripId);
  Future<void> addExpense(String tripId, String description, double amount);
  Future<void> deleteExpense(String tripId, int expenseId);
  Future<bool> closeTripWithOtp(String tripId, String enteredOtp);
  Future<TripModel> confirmExpenses(String tripId);
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
      assignedAt: _calcKolkataUtc(0, 8, 30),
      spotReachedAt: _calcKolkataUtc(0, 8, 52),
      startedAt: _calcKolkataUtc(0, 8, 58),
      pickupLat: 12.9784,
      pickupLng: 77.6408,
      dropoffLat: 12.9496,
      dropoffLng: 77.6482,
      routePolyline: 'e~l_A_x`sM...',
      expenses: const [
        TripExpenseModel(
          expenseId: 101,
          description: 'Airport Expressway Toll Plaza',
          amount: 110.00,
        ),
      ],
    ),
    TripModel(
      tripId: '8421',
      orderId: 1042,
      status: 'ASSIGNED',
      companyName: 'Infosys BPM Limited',
      pickupSpot: 'Electronic City Phase 1, Hosur Road, Bengaluru',
      dropoffSpot: 'Kempegowda International Airport (BLR), Terminal 1',
      pickupTime: _calcKolkataUtc(0, 13, 0), // Today 1:00 PM IST
      estimatedReachMinutes: 28,
      contactName: 'Ananya Sharma',
      contactPhone: '+91 98765 12345',
      notes: 'Executive airport transfer. Assistance with luggage required.',
      amount: 1850.00,
      driverShare: 555.00,
      otp: '482910',
      otpAttempts: 0,
      expensesConfirmed: false,
      assignedAt: _calcKolkataUtc(0, 11, 45),
      pickupLat: 12.8452,
      pickupLng: 77.6602,
      dropoffLat: 13.1986,
      dropoffLng: 77.7066,
      routePolyline: 'g~m_A_y`sM...',
      expenses: const [],
    ),
    TripModel(
      tripId: '8422',
      orderId: 1043,
      status: 'ASSIGNED',
      companyName: 'Prestige Group Holdings',
      pickupSpot: 'Prestige Tech Cloud, Devanahalli, Bengaluru',
      dropoffSpot: 'MG Road Metro Station, Bengaluru',
      pickupTime: _calcKolkataUtc(1, 15, 30), // Tomorrow 3:30 PM IST
      estimatedReachMinutes: 45,
      contactName: 'Vikram Malhotra',
      contactPhone: '+91 91234 56789',
      notes: 'Site inspection delegates. Vehicle interior must be pristine.',
      amount: 2400.00,
      driverShare: 720.00,
      otp: '729104',
      otpAttempts: 0,
      expensesConfirmed: false,
      assignedAt: _calcKolkataUtc(0, 16, 0),
      pickupLat: 13.2435,
      pickupLng: 77.7123,
      dropoffLat: 12.9756,
      dropoffLng: 77.6066,
      expenses: const [],
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
    _controller.add(List.unmodifiable(_mockTrips));
  }

  @override
  Future<List<TripModel>> getTrips() async => List.unmodifiable(_mockTrips);

  @override
  Stream<List<TripModel>> watchTrips() async* {
    yield List.unmodifiable(_mockTrips);
    yield* _controller.stream;
  }

  @override
  Future<TripModel> getTripDetails(String tripId) async {
    return _mockTrips.firstWhere(
      (t) => t.tripId == tripId,
      orElse: () => _mockTrips.first,
    );
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
  Future<void> startTrip(String tripId, {String? selfiePath}) async {
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
  Future<void> completeTrip(String tripId, {String? otp}) async {
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

  @override
  Future<TripModel> confirmExpenses(String tripId) async {
    TripModel? updated;
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        updated = t.copyWith(expensesConfirmed: true);
        return updated!;
      }
      return t;
    }).toList();
    _controller.add(List.unmodifiable(_mockTrips));
    return updated ?? _mockTrips.first;
  }

  void updateTrips(List<TripModel> trips) {
    _mockTrips = trips;
    _controller.add(List.unmodifiable(_mockTrips));
  }
}

/// Real API implementation of TripRepository communicating with Express/Node.js backend.
class ApiTripRepository implements TripRepository {
  final Dio _dio;
  final _tripsController = StreamController<List<TripModel>>.broadcast();
  List<TripModel> _cachedTrips = [];

  ApiTripRepository(this._dio);

  @override
  Future<List<TripModel>> getTrips() async {
    try {
      final response = await _dio.get('/driver/trips');
      final data = response.data;
      final rawItems = data['data'] is Map ? data['data']['items'] : data['data'];

      final trips = <TripModel>[];
      if (rawItems is List) {
        for (final item in rawItems) {
          if (item is Map<String, dynamic>) {
            trips.add(TripModel.fromJson(item));
          }
        }
      }
      _cachedTrips = trips;
      _tripsController.add(trips);
      return trips;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    } catch (e) {
      debugPrint('[ApiTripRepository] getTrips error: $e');
      return _cachedTrips;
    }
  }

  @override
  Stream<List<TripModel>> watchTrips() async* {
    if (_cachedTrips.isNotEmpty) {
      yield _cachedTrips;
    }
    try {
      final fresh = await getTrips();
      yield fresh;
    } catch (_) {
      if (_cachedTrips.isNotEmpty) yield _cachedTrips;
    }
    yield* _tripsController.stream;
  }

  @override
  Future<TripModel> getTripDetails(String tripId) async {
    try {
      final response = await _dio.get('/driver/trips/$tripId');
      final data = response.data['data'] as Map<String, dynamic>;
      final trip = TripModel.fromJson(data);
      return trip;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<void> startTrip(String tripId, {String? selfiePath}) async {
    try {
      dynamic data;
      if (selfiePath != null && selfiePath.isNotEmpty) {
        data = FormData.fromMap({
          'selfie': await MultipartFile.fromFile(selfiePath),
        });
      }
      await _dio.post(
        '/driver/trips/$tripId/start',
        data: data,
      );
      await getTrips();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<void> markSpotReached(String tripId, {double? lat, double? lng}) async {
    // Spot reached updates local view state
  }

  @override
  Future<void> markDestinationReached(String tripId, {double? lat, double? lng}) async {
    // Destination reached updates local view state
  }

  @override
  Future<void> completeTrip(String tripId, {String? otp}) async {
    try {
      await _dio.post(
        '/driver/trips/$tripId/close',
        data: {'otp': otp ?? '123456'},
      );
      await getTrips();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<void> cancelTrip(String tripId) async {
    // Handled administratively or via backend order management
  }

  @override
  Future<void> addExpense(String tripId, String description, double amount) async {
    try {
      await _dio.post(
        '/driver/trips/$tripId/expenses',
        data: {
          'description': description,
          'amount': amount.toStringAsFixed(2),
        },
      );
      await getTrips();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<void> deleteExpense(String tripId, int expenseId) async {
    try {
      await _dio.delete('/driver/trips/$tripId/expenses/$expenseId');
      await getTrips();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<bool> closeTripWithOtp(String tripId, String enteredOtp) async {
    try {
      await completeTrip(tripId, otp: enteredOtp);
      return true;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<TripModel> confirmExpenses(String tripId) async {
    try {
      final response = await _dio.post('/driver/trips/$tripId/confirm-expenses');
      final data = response.data['data'] as Map<String, dynamic>;
      final updated = TripModel.fromJson(data);
      await getTrips();
      return updated;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
