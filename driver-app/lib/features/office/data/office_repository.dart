import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/auth_interceptor.dart';

/// Office information returned by GET /api/v1/driver/office
class OfficeModel {
  final int officeId;
  final String officeName;
  final String? officeLocation;
  final DateTime createdAt;

  const OfficeModel({
    required this.officeId,
    required this.officeName,
    this.officeLocation,
    required this.createdAt,
  });

  factory OfficeModel.fromJson(Map<String, dynamic> json) {
    return OfficeModel(
      officeId: json['office_id'] as int? ?? 1,
      officeName: json['office_name'] as String? ?? 'HireD Office',
      officeLocation: json['office_location'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

abstract class OfficeRepository {
  Future<OfficeModel> getHeadOffice();
}

class ApiOfficeRepository implements OfficeRepository {
  final Dio _dio;

  ApiOfficeRepository(this._dio);

  @override
  Future<OfficeModel> getHeadOffice() async {
    try {
      final response = await _dio.get('/driver/office');
      final data = response.data['data'] as Map<String, dynamic>;
      return OfficeModel.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    } catch (_) {
      // Fallback
      return OfficeModel(
        officeId: 1,
        officeName: 'HireD Head Office',
        officeLocation: 'Trinity X HQ, Kochi, Kerala',
        createdAt: DateTime.now(),
      );
    }
  }
}

final officeRepositoryProvider = Provider<OfficeRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ApiOfficeRepository(dio);
});

final headOfficeProvider = FutureProvider<OfficeModel>((ref) {
  final repo = ref.watch(officeRepositoryProvider);
  return repo.getHeadOffice();
});
