import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/auth_interceptor.dart';

class WalletTransactionModel {
  final int transactionId;
  final String amount;
  final String transactionType; // 'CREDIT' or 'DEBIT'
  final String? description;
  final DateTime? createdAt;

  const WalletTransactionModel({
    required this.transactionId,
    required this.amount,
    required this.transactionType,
    this.description,
    this.createdAt,
  });

  bool get isCredit => transactionType.toUpperCase() == 'CREDIT';

  factory WalletTransactionModel.fromJson(Map<String, dynamic> json) {
    return WalletTransactionModel(
      transactionId: json['transaction_id'] as int? ?? json['id'] as int? ?? 0,
      amount: json['amount']?.toString() ?? '0.00',
      transactionType: json['transaction_type'] as String? ?? 'CREDIT',
      description: json['description'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }
}

class DriverWalletModel {
  final String balance;
  final List<WalletTransactionModel> items;
  final int page;
  final int limit;
  final int total;

  const DriverWalletModel({
    required this.balance,
    required this.items,
    this.page = 1,
    this.limit = 20,
    this.total = 0,
  });

  factory DriverWalletModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    final txList = <WalletTransactionModel>[];
    if (rawItems is List) {
      for (final item in rawItems) {
        if (item is Map<String, dynamic>) {
          txList.add(WalletTransactionModel.fromJson(item));
        }
      }
    }
    return DriverWalletModel(
      balance: json['balance']?.toString() ?? '0.00',
      items: txList,
      page: json['page'] as int? ?? 1,
      limit: json['limit'] as int? ?? 20,
      total: json['total'] as int? ?? txList.length,
    );
  }
}

abstract class WalletRepository {
  Future<DriverWalletModel> getWallet({int page = 1, int limit = 20});
}

class ApiWalletRepository implements WalletRepository {
  final Dio _dio;

  ApiWalletRepository(this._dio);

  @override
  Future<DriverWalletModel> getWallet({int page = 1, int limit = 20}) async {
    try {
      final response = await _dio.get(
        '/driver/wallet',
        queryParameters: {'page': page, 'limit': limit},
      );
      final data = response.data['data'] as Map<String, dynamic>;
      return DriverWalletModel.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    } catch (_) {
      return const DriverWalletModel(balance: '0.00', items: []);
    }
  }
}

final walletRepositoryProvider = Provider<WalletRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ApiWalletRepository(dio);
});

final driverWalletProvider = FutureProvider<DriverWalletModel>((ref) {
  final repo = ref.watch(walletRepositoryProvider);
  return repo.getWallet();
});
