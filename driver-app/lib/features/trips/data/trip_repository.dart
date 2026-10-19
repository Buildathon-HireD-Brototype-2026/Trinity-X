import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/network/api_exception.dart';
import '../domain/trip_model.dart';

abstract class TripRepository {
  Future<List<TripModel>> getTrips();
  Stream<List<TripModel>> watchTrips();
  Future<TripModel> getTripDetails(String tripId);
  Future<TripModel> startTrip(String tripId, {String? selfiePath});
  Future<List<TripExpenseModel>> getExpenses(String tripId);
  Future<TripExpenseModel> addExpense(String tripId, {required String description, required String amount});
  Future<TripModel> confirmExpenses(String tripId);
  Future<void> completeTrip(String tripId, {String? otp});
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
  Future<TripModel> startTrip(String tripId, {String? selfiePath}) async {
    try {
      dynamic data;
      if (selfiePath != null && selfiePath.isNotEmpty) {
        data = FormData.fromMap({
          'selfie': await MultipartFile.fromFile(selfiePath),
        });
      }
      final response = await _dio.post(
        '/driver/trips/$tripId/start',
        data: data,
      );
      final tripData = response.data['data'] as Map<String, dynamic>;
      final updatedTrip = TripModel.fromJson(tripData);
      await getTrips(); // Refresh local trips cache
      return updatedTrip;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<List<TripExpenseModel>> getExpenses(String tripId) async {
    try {
      final response = await _dio.get('/driver/trips/$tripId/expenses');
      final raw = response.data['data'] is Map ? response.data['data']['items'] : response.data['data'];
      final items = <TripExpenseModel>[];
      if (raw is List) {
        for (final item in raw) {
          if (item is Map<String, dynamic>) {
            items.add(TripExpenseModel.fromJson(item));
          }
        }
      }
      return items;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<TripExpenseModel> addExpense(String tripId, {required String description, required String amount}) async {
    try {
      final response = await _dio.post(
        '/driver/trips/$tripId/expenses',
        data: {
          'description': description,
          'amount': amount,
        },
      );
      final data = response.data['data'] as Map<String, dynamic>;
      return TripExpenseModel.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
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
}

/// Mock initial trips retained for standalone offline / unit tests
class MockTripRepository implements TripRepository {
  final _controller = StreamController<List<TripModel>>.broadcast();

  List<TripModel> _mockTrips = [
    TripModel(
      tripId: '8421',
      status: 'ASSIGNED',
      pickupSpot: 'Tech Park Gate 2, Electronic City',
      dropoffSpot: 'Prestige Cloud Hub, Terminal 1',
      pickupTime: DateTime.utc(2026, 10, 11, 5, 0),
      estimatedReachMinutes: 18,
    ),
    TripModel(
      tripId: '8422',
      status: 'ASSIGNED',
      pickupSpot: 'Prestige Tech Cloud, Devanahalli',
      dropoffSpot: 'MG Road Metro Station',
      pickupTime: DateTime.utc(2026, 10, 11, 6, 15),
      estimatedReachMinutes: 35,
    ),
  ];

  MockTripRepository() {
    _controller.add(_mockTrips);
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
  Future<TripModel> startTrip(String tripId, {String? selfiePath}) async {
    TripModel? updated;
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        updated = t.copyWith(status: 'ONGOING');
        return updated!;
      }
      return t;
    }).toList();
    _controller.add(List.unmodifiable(_mockTrips));
    return updated ?? _mockTrips.first;
  }

  @override
  Future<List<TripExpenseModel>> getExpenses(String tripId) async => [];

  @override
  Future<TripExpenseModel> addExpense(String tripId, {required String description, required String amount}) async {
    return TripExpenseModel(
      expenseId: 1,
      tripId: int.tryParse(tripId) ?? 1,
      driverId: 1,
      description: description,
      amount: amount,
      createdAt: DateTime.now(),
    );
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

  @override
  Future<void> completeTrip(String tripId, {String? otp}) async {
    _mockTrips = _mockTrips.map((t) {
      if (t.tripId == tripId) {
        return t.copyWith(status: 'CLOSED');
      }
      return t;
    }).toList();
    _controller.add(List.unmodifiable(_mockTrips));
  }

  void updateTrips(List<TripModel> trips) {
    _mockTrips = trips;
    _controller.add(List.unmodifiable(_mockTrips));
  }
}
