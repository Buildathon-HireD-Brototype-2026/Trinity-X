import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/auth_interceptor.dart';
import '../../trips/data/trip_repository.dart';
import '../../trips/presentation/controllers/current_trip_provider.dart';
import '../domain/wallet_models.dart';

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
  Stream<List<WalletTripRecord>> watchCompletedTrips();
  double calculateCurrentMonthBalance(
    List<WalletTripRecord> trips, [
    DateTime? referenceNow,
  ]);
  int calculateCurrentMonthTripCount(
    List<WalletTripRecord> trips, [
    DateTime? referenceNow,
  ]);
  WalletPeriodSummary calculatePeriodSummary(List<WalletTripRecord> trips);
  Future<List<MonthlySettlementRecord>> getPreviousMonths([DateTime? referenceNow]);
  Future<DriverWalletModel> getWallet({int page = 1, int limit = 20});
}

class MockWalletRepository implements WalletRepository {
  final TripRepository _tripRepository;

  MockWalletRepository(this._tripRepository);

  @override
  Stream<List<WalletTripRecord>> watchCompletedTrips() {
    return _tripRepository.watchTrips().map((trips) {
      return trips
          .where((t) => t.isClosed && t.status.toUpperCase() != 'CANCELLED')
          .map((t) => WalletTripRecord.fromTripModel(t))
          .toList();
    });
  }

  @override
  double calculateCurrentMonthBalance(
    List<WalletTripRecord> trips, [
    DateTime? referenceNow,
  ]) {
    final nowIST = referenceNow != null
        ? IstDateTimeHelper.toIST(referenceNow)
        : IstDateTimeHelper.nowIST();

    double total = 0.0;
    for (final trip in trips) {
      if (!trip.countsTowardBalance) continue;

      final tripIST = IstDateTimeHelper.toIST(trip.completedAt);
      if (tripIST.year == nowIST.year && tripIST.month == nowIST.month) {
        total += trip.driverEarning;
      }
    }
    return total;
  }

  @override
  int calculateCurrentMonthTripCount(
    List<WalletTripRecord> trips, [
    DateTime? referenceNow,
  ]) {
    final nowIST = referenceNow != null
        ? IstDateTimeHelper.toIST(referenceNow)
        : IstDateTimeHelper.nowIST();

    int count = 0;
    for (final trip in trips) {
      if (!trip.countsTowardBalance) continue;

      final tripIST = IstDateTimeHelper.toIST(trip.completedAt);
      if (tripIST.year == nowIST.year && tripIST.month == nowIST.month) {
        count++;
      }
    }
    return count;
  }

  @override
  WalletPeriodSummary calculatePeriodSummary(List<WalletTripRecord> trips) {
    double totalEarning = 0.0;
    double totalExpense = 0.0;
    int count = 0;

    for (final trip in trips) {
      if (!trip.isCompleted) continue;
      totalEarning += trip.driverEarning;
      totalExpense += trip.totalExpense;
      count++;
    }

    return WalletPeriodSummary(
      totalDriverEarning: totalEarning,
      completedTripCount: count,
      totalExpense: totalExpense,
    );
  }

  @override
  Future<List<MonthlySettlementRecord>> getPreviousMonths([DateTime? referenceNow]) async {
    final allTrips = await _tripRepository.getTrips();
    final completedTrips = allTrips
        .where((t) => t.isClosed && !t.isCancelled)
        .map((t) => WalletTripRecord.fromTripModel(t))
        .toList();

    // September 2026 trips (IST month 9, 2026)
    final septTrips = completedTrips.where((t) {
      final ist = IstDateTimeHelper.toIST(t.completedAt);
      return ist.year == 2026 && ist.month == 9;
    }).toList();
    final septEarnings = septTrips.fold(0.0, (sum, t) => sum + t.driverEarning);
    final septExpenses = septTrips.fold(0.0, (sum, t) => sum + t.totalExpense);

    // August 2026 trips (IST month 8, 2026)
    final augTrips = completedTrips.where((t) {
      final ist = IstDateTimeHelper.toIST(t.completedAt);
      return ist.year == 2026 && ist.month == 8;
    }).toList();
    final augEarnings = augTrips.fold(0.0, (sum, t) => sum + t.driverEarning);
    final augExpenses = augTrips.fold(0.0, (sum, t) => sum + t.totalExpense);

    return [
      MonthlySettlementRecord(
        month: 'September 2026',
        monthDate: DateTime.utc(2026, 9, 1),
        totalDriverEarning: septEarnings,
        tripCount: septTrips.length,
        totalExpense: septExpenses,
        status: SettlementStatus.paid,
        paidAmount: septEarnings,
        paidDate: DateTime.utc(2026, 10, 5, 11, 30),
        trips: septTrips,
      ),
      MonthlySettlementRecord(
        month: 'August 2026',
        monthDate: DateTime.utc(2026, 8, 1),
        totalDriverEarning: augEarnings,
        tripCount: augTrips.length,
        totalExpense: augExpenses,
        status: SettlementStatus.paid,
        paidAmount: augEarnings,
        paidDate: DateTime.utc(2026, 9, 4, 10, 0),
        trips: augTrips,
      ),
    ];
  }

  @override
  Future<DriverWalletModel> getWallet({int page = 1, int limit = 20}) async {
    return const DriverWalletModel(balance: '0.00', items: []);
  }
}

class ApiWalletRepository implements WalletRepository {
  final Dio _dio;
  final TripRepository _tripRepository;
  late final MockWalletRepository _calculator;

  ApiWalletRepository(this._dio, this._tripRepository) {
    _calculator = MockWalletRepository(_tripRepository);
  }

  @override
  Stream<List<WalletTripRecord>> watchCompletedTrips() => _calculator.watchCompletedTrips();

  @override
  double calculateCurrentMonthBalance(List<WalletTripRecord> trips, [DateTime? referenceNow]) =>
      _calculator.calculateCurrentMonthBalance(trips, referenceNow);

  @override
  int calculateCurrentMonthTripCount(List<WalletTripRecord> trips, [DateTime? referenceNow]) =>
      _calculator.calculateCurrentMonthTripCount(trips, referenceNow);

  @override
  WalletPeriodSummary calculatePeriodSummary(List<WalletTripRecord> trips) =>
      _calculator.calculatePeriodSummary(trips);

  @override
  Future<List<MonthlySettlementRecord>> getPreviousMonths([DateTime? referenceNow]) =>
      _calculator.getPreviousMonths(referenceNow);

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
  final tripRepo = ref.watch(tripRepositoryProvider);
  if (tripRepo is MockTripRepository) {
    return MockWalletRepository(tripRepo);
  }
  final dio = ref.watch(dioProvider);
  return ApiWalletRepository(dio, tripRepo);
});

final driverWalletProvider = FutureProvider<DriverWalletModel>((ref) {
  final repo = ref.watch(walletRepositoryProvider);
  return repo.getWallet();
});
