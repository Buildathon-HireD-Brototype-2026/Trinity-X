import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/leave_config.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/auth_interceptor.dart';
import '../../trips/data/trip_repository.dart';
import '../../trips/presentation/controllers/current_trip_provider.dart';
import '../../wallet/domain/wallet_models.dart';
import '../domain/driver_leave_model.dart';

abstract class LeaveRepository {
  Future<List<DriverLeaveModel>> getLeaves();
  Stream<List<DriverLeaveModel>> watchLeaves();
  Future<DriverLeaveModel> applyLeave({
    required DateTime startDate,
    required DateTime endDate,
    String? reason,
    DateTime? referenceNow,
  });
  Future<void> cancelLeave(int leaveId, {DateTime? referenceNow});
  Future<void> deleteLeave(int leaveId);
  Future<DriverLeaveModel> requestLeave({
    required String startDate,
    required String endDate,
    String? reason,
  });
}

class MockLeaveRepository implements LeaveRepository {
  final TripRepository _tripRepository;
  final _controller = StreamController<List<DriverLeaveModel>>.broadcast();

  // Initial mock leaves (empty or realistic past/upcoming leaves)
  static final List<DriverLeaveModel> _initialLeaves = [];

  late List<DriverLeaveModel> _leaves = List.from(_initialLeaves);

  MockLeaveRepository(this._tripRepository) {
    _controller.add(List.unmodifiable(_leaves));
  }

  @override
  Future<List<DriverLeaveModel>> getLeaves() async {
    return List.unmodifiable(_leaves);
  }

  @override
  Stream<List<DriverLeaveModel>> watchLeaves() async* {
    yield List.unmodifiable(_leaves);
    yield* _controller.stream;
  }

  @override
  Future<DriverLeaveModel> applyLeave({
    required DateTime startDate,
    required DateTime endDate,
    String? reason,
    DateTime? referenceNow,
  }) async {
    final nowIST = referenceNow != null
        ? IstDateTimeHelper.toIST(referenceNow)
        : IstDateTimeHelper.nowIST();
    final todayDateOnly = DateTime(nowIST.year, nowIST.month, nowIST.day);

    final startOnly = DateTime(startDate.year, startDate.month, startDate.day);
    final endOnly = DateTime(endDate.year, endDate.month, endDate.day);

    // Rule 0: Order constraint
    if (endOnly.isBefore(startOnly)) {
      throw Exception('End date cannot be earlier than start date');
    }

    // Rule 1: Notice period
    final earliestAllowed = todayDateOnly.add(Duration(days: LeaveConfig.minNoticeDays));
    if (startOnly.isBefore(earliestAllowed)) {
      throw Exception(
        'Leave must be applied at least ${LeaveConfig.minNoticeDays} days in advance',
      );
    }

    // Rule 2: Overlap check
    for (final existing in _leaves) {
      var cur = startOnly;
      while (!cur.isAfter(endOnly)) {
        if (existing.containsDate(cur)) {
          throw Exception('Selected dates overlap with an existing leave');
        }
        cur = cur.add(const Duration(days: 1));
      }
    }

    // Rule 3: Assigned/Ongoing trips conflict
    final trips = await _tripRepository.getTrips();
    final activeTrips = trips.where((t) => (t.isAssigned || t.isOngoing) && !t.isClosed && !t.isCancelled);

    for (final trip in activeTrips) {
      final tripIST = IstDateTimeHelper.toIST(trip.pickupTime);
      final tripDateOnly = DateTime(tripIST.year, tripIST.month, tripIST.day);

      if ((tripDateOnly.isAtSameMomentAs(startOnly) || tripDateOnly.isAfter(startOnly)) &&
          (tripDateOnly.isAtSameMomentAs(endOnly) || tripDateOnly.isBefore(endOnly))) {
        final dateFormatted = IstDateTimeHelper.formatDate(tripDateOnly);
        throw Exception(
          'Cannot apply leave: You have an assigned trip #ORD-${trip.orderId} on $dateFormatted',
        );
      }
    }

    // Rule 4: Monthly limit per calendar month
    // Find all months spanned by the new leave
    final Map<String, int> requestedPerMonth = {};
    var cursor = startOnly;
    while (!cursor.isAfter(endOnly)) {
      final key = '${cursor.year}-${cursor.month}';
      requestedPerMonth[key] = (requestedPerMonth[key] ?? 0) + 1;
      cursor = cursor.add(const Duration(days: 1));
    }

    for (final entry in requestedPerMonth.entries) {
      final parts = entry.key.split('-');
      final y = int.parse(parts[0]);
      final m = int.parse(parts[1]);
      final requestedCount = entry.value;

      int existingCountInMonth = 0;
      for (final l in _leaves) {
        existingCountInMonth += l.daysInMonth(y, m);
      }

      if (existingCountInMonth + requestedCount > LeaveConfig.maxLeaveDaysPerMonth) {
        throw Exception(
          'Exceeds monthly limit of ${LeaveConfig.maxLeaveDaysPerMonth} leave days',
        );
      }
    }

    // Passed all validations: create leave
    final newLeave = DriverLeaveModel(
      leaveId: DateTime.now().millisecondsSinceEpoch % 100000,
      driverId: 1,
      startDate: startOnly,
      endDate: endOnly,
      createdAt: DateTime.now().toUtc(),
    );

    _leaves = [..._leaves, newLeave];
    _controller.add(List.unmodifiable(_leaves));
    return newLeave;
  }

  @override
  Future<void> cancelLeave(int leaveId, {DateTime? referenceNow}) async {
    final nowIST = referenceNow != null
        ? IstDateTimeHelper.toIST(referenceNow)
        : IstDateTimeHelper.nowIST();
    final todayDateOnly = DateTime(nowIST.year, nowIST.month, nowIST.day);

    final leaveIndex = _leaves.indexWhere((l) => l.leaveId == leaveId);
    if (leaveIndex == -1) {
      throw Exception('Leave not found');
    }

    final leave = _leaves[leaveIndex];
    if (!leave.isFuture(todayDateOnly)) {
      throw Exception('Cannot cancel a leave that has already started or is in the past');
    }

    _leaves = _leaves.where((l) => l.leaveId != leaveId).toList();
    _controller.add(List.unmodifiable(_leaves));
  }

  @override
  Future<void> deleteLeave(int leaveId) async {
    await cancelLeave(leaveId);
  }

  @override
  Future<DriverLeaveModel> requestLeave({
    required String startDate,
    required String endDate,
    String? reason,
  }) async {
    final s = DateTime.parse(startDate);
    final e = DateTime.parse(endDate);
    return applyLeave(startDate: s, endDate: e, reason: reason);
  }
}

class ApiLeaveRepository implements LeaveRepository {
  final Dio _dio;
  final _controller = StreamController<List<DriverLeaveModel>>.broadcast();

  ApiLeaveRepository(this._dio);

  @override
  Future<List<DriverLeaveModel>> getLeaves() async {
    try {
      final response = await _dio.get('/driver/leaves');
      final raw = response.data['data'] is Map
          ? response.data['data']['items']
          : response.data['data'];
      final leaves = <DriverLeaveModel>[];
      if (raw is List) {
        for (final item in raw) {
          if (item is Map<String, dynamic>) {
            leaves.add(DriverLeaveModel.fromJson(item));
          }
        }
      }
      _controller.add(leaves);
      return leaves;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    } catch (_) {
      return [];
    }
  }

  @override
  Stream<List<DriverLeaveModel>> watchLeaves() {
    getLeaves().ignore();
    return _controller.stream;
  }

  @override
  Future<DriverLeaveModel> applyLeave({
    required DateTime startDate,
    required DateTime endDate,
    String? reason,
    DateTime? referenceNow,
  }) async {
    final s = '${startDate.year}-${startDate.month.toString().padLeft(2, '0')}-${startDate.day.toString().padLeft(2, '0')}';
    final e = '${endDate.year}-${endDate.month.toString().padLeft(2, '0')}-${endDate.day.toString().padLeft(2, '0')}';
    return requestLeave(startDate: s, endDate: e, reason: reason);
  }

  @override
  Future<DriverLeaveModel> requestLeave({
    required String startDate,
    required String endDate,
    String? reason,
  }) async {
    try {
      final response = await _dio.post(
        '/driver/leaves',
        data: {
          'start_date': startDate,
          'end_date': endDate,
          'reason': reason,
        },
      );
      final data = response.data['data'] as Map<String, dynamic>;
      final model = DriverLeaveModel.fromJson(data);
      await getLeaves();
      return model;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<void> cancelLeave(int leaveId, {DateTime? referenceNow}) async {
    await deleteLeave(leaveId);
  }

  @override
  Future<void> deleteLeave(int leaveId) async {
    try {
      await _dio.delete('/driver/leaves/$leaveId');
      await getLeaves();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

final leaveRepositoryProvider = Provider<LeaveRepository>((ref) {
  if (Platform.environment.containsKey('FLUTTER_TEST')) {
    final tripRepo = ref.watch(tripRepositoryProvider);
    return MockLeaveRepository(tripRepo);
  }
  final dio = ref.watch(dioProvider);
  return ApiLeaveRepository(dio);
});

final driverLeavesProvider = FutureProvider<List<DriverLeaveModel>>((ref) {
  final repo = ref.watch(leaveRepositoryProvider);
  return repo.getLeaves();
});

final leavesStreamProvider = StreamProvider<List<DriverLeaveModel>>((ref) {
  final repo = ref.watch(leaveRepositoryProvider);
  return repo.watchLeaves();
});
