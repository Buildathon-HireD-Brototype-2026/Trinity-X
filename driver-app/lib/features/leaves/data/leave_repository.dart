import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/auth_interceptor.dart';

/// Driver leave model representing a requested or approved planned leave.
class LeaveModel {
  final int leaveId;
  final int driverId;
  final String startDate; // 'YYYY-MM-DD'
  final String endDate;   // 'YYYY-MM-DD'
  final String status;    // 'PENDING', 'APPROVED', 'REJECTED'
  final String? reason;
  final DateTime? createdAt;

  const LeaveModel({
    required this.leaveId,
    required this.driverId,
    required this.startDate,
    required this.endDate,
    this.status = 'PENDING',
    this.reason,
    this.createdAt,
  });

  bool get isPending => status.toUpperCase() == 'PENDING';
  bool get isApproved => status.toUpperCase() == 'APPROVED';
  bool get isRejected => status.toUpperCase() == 'REJECTED';

  factory LeaveModel.fromJson(Map<String, dynamic> json) {
    return LeaveModel(
      leaveId: json['leave_id'] as int? ?? json['id'] as int? ?? 0,
      driverId: json['driver_id'] as int? ?? 0,
      startDate: json['start_date'] as String? ?? '',
      endDate: json['end_date'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING',
      reason: json['reason'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'leave_id': leaveId,
      'driver_id': driverId,
      'start_date': startDate,
      'end_date': endDate,
      'status': status,
      'reason': reason,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}

abstract class LeaveRepository {
  Future<List<LeaveModel>> getLeaves();
  Future<LeaveModel> requestLeave({
    required String startDate,
    required String endDate,
    String? reason,
  });
  Future<void> deleteLeave(int leaveId);
}

class ApiLeaveRepository implements LeaveRepository {
  final Dio _dio;

  ApiLeaveRepository(this._dio);

  @override
  Future<List<LeaveModel>> getLeaves() async {
    try {
      final response = await _dio.get('/driver/leaves');
      final raw = response.data['data'] is Map
          ? response.data['data']['items']
          : response.data['data'];
      final leaves = <LeaveModel>[];
      if (raw is List) {
        for (final item in raw) {
          if (item is Map<String, dynamic>) {
            leaves.add(LeaveModel.fromJson(item));
          }
        }
      }
      return leaves;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    } catch (_) {
      return [];
    }
  }

  @override
  Future<LeaveModel> requestLeave({
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
      return LeaveModel.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<void> deleteLeave(int leaveId) async {
    try {
      await _dio.delete('/driver/leaves/$leaveId');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

final leaveRepositoryProvider = Provider<LeaveRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ApiLeaveRepository(dio);
});

final driverLeavesProvider = FutureProvider<List<LeaveModel>>((ref) {
  final repo = ref.watch(leaveRepositoryProvider);
  return repo.getLeaves();
});
