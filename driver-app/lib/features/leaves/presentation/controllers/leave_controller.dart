import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:driver_app/core/config/leave_config.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import 'package:driver_app/features/trips/presentation/controllers/current_trip_provider.dart';
import 'package:driver_app/features/wallet/domain/wallet_models.dart';
import 'package:driver_app/features/leaves/data/leave_repository.dart';
import 'package:driver_app/features/leaves/domain/driver_leave_model.dart';

/// Provider for LeaveRepository
final leaveRepositoryProvider = Provider<LeaveRepository>((ref) {
  final tripRepo = ref.watch(tripRepositoryProvider);
  return MockLeaveRepository(tripRepo);
});

/// Stream of all driver leaves
final leavesStreamProvider = StreamProvider<List<DriverLeaveModel>>((ref) {
  final repo = ref.watch(leaveRepositoryProvider);
  return repo.watchLeaves();
});

/// Map of blocked dates (days on which driver has an assigned or ongoing trip)
/// Key: 'YYYY-MM-DD', Value: TripModel
final blockedTripDatesProvider = Provider<Map<String, TripModel>>((ref) {
  final tripsAsync = ref.watch(allTripsProvider);
  final trips = tripsAsync.valueOrNull ?? [];
  final activeTrips = trips.where((t) => (t.isAssigned || t.isOngoing) && !t.isClosed && !t.isCancelled);

  final Map<String, TripModel> map = {};
  for (final trip in activeTrips) {
    final ist = IstDateTimeHelper.toIST(trip.pickupTime);
    final key = '${ist.year}-${ist.month.toString().padLeft(2, '0')}-${ist.day.toString().padLeft(2, '0')}';
    map[key] = trip;
  }
  return map;
});

/// Calendar interaction & leave selection state
class LeaveCalendarState {
  final DateTime focusedMonth; // Reference year and month in IST
  final DateTime? selectedStartDate;
  final DateTime? selectedEndDate;
  final bool isApplying;
  final String? errorMessage;
  final String? successMessage;

  const LeaveCalendarState({
    required this.focusedMonth,
    this.selectedStartDate,
    this.selectedEndDate,
    this.isApplying = false,
    this.errorMessage,
    this.successMessage,
  });

  int get selectedDaysCount {
    if (selectedStartDate == null) return 0;
    final end = selectedEndDate ?? selectedStartDate!;
    return end.difference(selectedStartDate!).inDays + 1;
  }

  LeaveCalendarState copyWith({
    DateTime? focusedMonth,
    DateTime? Function()? selectedStartDate,
    DateTime? Function()? selectedEndDate,
    bool? isApplying,
    String? Function()? errorMessage,
    String? Function()? successMessage,
  }) {
    return LeaveCalendarState(
      focusedMonth: focusedMonth ?? this.focusedMonth,
      selectedStartDate: selectedStartDate != null ? selectedStartDate() : this.selectedStartDate,
      selectedEndDate: selectedEndDate != null ? selectedEndDate() : this.selectedEndDate,
      isApplying: isApplying ?? this.isApplying,
      errorMessage: errorMessage != null ? errorMessage() : this.errorMessage,
      successMessage: successMessage != null ? successMessage() : this.successMessage,
    );
  }
}

class LeaveCalendarNotifier extends StateNotifier<LeaveCalendarState> {
  final Ref _ref;

  LeaveCalendarNotifier(this._ref, [DateTime? initialDate])
      : super(
          LeaveCalendarState(
            focusedMonth: initialDate ?? IstDateTimeHelper.nowIST(),
          ),
        );

  void nextMonth() {
    final next = DateTime(state.focusedMonth.year, state.focusedMonth.month + 1, 1);
    state = state.copyWith(focusedMonth: next, errorMessage: () => null);
  }

  void previousMonth() {
    final prev = DateTime(state.focusedMonth.year, state.focusedMonth.month - 1, 1);
    state = state.copyWith(focusedMonth: prev, errorMessage: () => null);
  }

  void selectDay(DateTime day, {DateTime? referenceNow}) {
    final nowIST = referenceNow != null ? IstDateTimeHelper.toIST(referenceNow) : IstDateTimeHelper.nowIST();
    final todayOnly = DateTime(nowIST.year, nowIST.month, nowIST.day);
    final targetDay = DateTime(day.year, day.month, day.day);

    // Rule 1: Notice period check
    final earliestAllowed = todayOnly.add(Duration(days: LeaveConfig.minNoticeDays));
    if (targetDay.isBefore(earliestAllowed)) {
      state = state.copyWith(
        errorMessage: () => 'Leave must be applied at least ${LeaveConfig.minNoticeDays} days in advance',
      );
      return;
    }

    // Rule 2: Blocked trip check
    final blockedMap = _ref.read(blockedTripDatesProvider);
    final key = '${targetDay.year}-${targetDay.month.toString().padLeft(2, '0')}-${targetDay.day.toString().padLeft(2, '0')}';
    if (blockedMap.containsKey(key)) {
      final trip = blockedMap[key]!;
      state = state.copyWith(
        errorMessage: () => 'Date blocked: You have assigned trip #ORD-${trip.orderId}',
      );
      return;
    }

    // Rule 3: Existing leave check
    final leaves = _ref.read(leavesStreamProvider).valueOrNull ?? [];
    if (leaves.any((l) => l.containsDate(targetDay))) {
      state = state.copyWith(
        errorMessage: () => 'Date is already on an existing leave',
      );
      return;
    }

    // Selection mechanics:
    // If no start date, or both start and end are selected, start fresh with this day
    if (state.selectedStartDate == null || state.selectedEndDate != null) {
      state = state.copyWith(
        selectedStartDate: () => targetDay,
        selectedEndDate: () => null,
        errorMessage: () => null,
      );
    } else {
      // Start date is selected, end date is null
      final start = state.selectedStartDate!;
      if (targetDay.isBefore(start)) {
        // Tapped earlier date: reset start to this day
        state = state.copyWith(
          selectedStartDate: () => targetDay,
          selectedEndDate: () => null,
          errorMessage: () => null,
        );
      } else {
        // Check if any date in the range [start, targetDay] has a blocked trip or existing leave
        var cur = start;
        while (!cur.isAfter(targetDay)) {
          final curKey = '${cur.year}-${cur.month.toString().padLeft(2, '0')}-${cur.day.toString().padLeft(2, '0')}';
          if (blockedMap.containsKey(curKey)) {
            final conflict = blockedMap[curKey]!;
            state = state.copyWith(
              errorMessage: () => 'Selected range conflicts with trip #ORD-${conflict.orderId} on ${IstDateTimeHelper.formatDate(cur)}',
            );
            return;
          }
          if (leaves.any((l) => l.containsDate(cur))) {
            state = state.copyWith(
              errorMessage: () => 'Selected range overlaps with an existing leave',
            );
            return;
          }
          cur = cur.add(const Duration(days: 1));
        }

        // Set end date
        state = state.copyWith(
          selectedEndDate: () => targetDay,
          errorMessage: () => null,
        );
      }
    }
  }

  void clearSelection() {
    state = state.copyWith(
      selectedStartDate: () => null,
      selectedEndDate: () => null,
      errorMessage: () => null,
    );
  }

  Future<bool> applyLeave() async {
    if (state.selectedStartDate == null) return false;
    final start = state.selectedStartDate!;
    final end = state.selectedEndDate ?? start;

    state = state.copyWith(isApplying: true, errorMessage: () => null);

    try {
      final repo = _ref.read(leaveRepositoryProvider);
      await repo.applyLeave(startDate: start, endDate: end);
      state = state.copyWith(
        isApplying: false,
        selectedStartDate: () => null,
        selectedEndDate: () => null,
        successMessage: () => 'Leave applied successfully',
      );
      return true;
    } catch (e) {
      final message = e.toString().replaceFirst('Exception: ', '');
      state = state.copyWith(
        isApplying: false,
        errorMessage: () => message,
      );
      return false;
    }
  }

  Future<bool> cancelLeave(int leaveId) async {
    try {
      final repo = _ref.read(leaveRepositoryProvider);
      await repo.cancelLeave(leaveId);
      return true;
    } catch (e) {
      final message = e.toString().replaceFirst('Exception: ', '');
      state = state.copyWith(errorMessage: () => message);
      return false;
    }
  }
}

final leaveCalendarControllerProvider =
    StateNotifierProvider.autoDispose<LeaveCalendarNotifier, LeaveCalendarState>((ref) {
  return LeaveCalendarNotifier(ref);
});

/// Calculates remaining allowed leave days for the visible/focused calendar month
final remainingLeaveDaysForFocusedMonthProvider = Provider.autoDispose<int>((ref) {
  final state = ref.watch(leaveCalendarControllerProvider);
  final leaves = ref.watch(leavesStreamProvider).valueOrNull ?? [];

  int usedDays = 0;
  for (final leave in leaves) {
    usedDays += leave.daysInMonth(state.focusedMonth.year, state.focusedMonth.month);
  }

  final remaining = LeaveConfig.maxLeaveDaysPerMonth - usedDays;
  return remaining < 0 ? 0 : remaining;
});
