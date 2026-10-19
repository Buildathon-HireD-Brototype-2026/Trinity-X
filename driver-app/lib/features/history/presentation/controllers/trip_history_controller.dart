import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../trips/domain/trip_model.dart';
import '../../../trips/presentation/controllers/current_trip_provider.dart';
import '../../../wallet/domain/wallet_models.dart';

/// Month filter descriptor (e.g. October 2026)
class HistoryMonthOption {
  final int year;
  final int month;
  final String label;

  const HistoryMonthOption({
    required this.year,
    required this.month,
    required this.label,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is HistoryMonthOption &&
          runtimeType == other.runtimeType &&
          year == other.year &&
          month == other.month;

  @override
  int get hashCode => year.hashCode ^ month.hashCode;
}

/// Filter state for Trip History
class TripHistoryFilterState {
  final HistoryMonthOption? selectedMonth; // null means "All"
  final DateTimeRange? customDateRange;
  final String searchQuery;
  final int pageSize;
  final int currentPage;

  const TripHistoryFilterState({
    this.selectedMonth,
    this.customDateRange,
    this.searchQuery = '',
    this.pageSize = 15,
    this.currentPage = 1,
  });

  bool get isAllSelected => selectedMonth == null && customDateRange == null;
  bool get isCustomSelected => customDateRange != null;

  TripHistoryFilterState copyWith({
    HistoryMonthOption? Function()? selectedMonth,
    DateTimeRange? Function()? customDateRange,
    String? searchQuery,
    int? pageSize,
    int? currentPage,
  }) {
    return TripHistoryFilterState(
      selectedMonth: selectedMonth != null ? selectedMonth() : this.selectedMonth,
      customDateRange: customDateRange != null ? customDateRange() : this.customDateRange,
      searchQuery: searchQuery ?? this.searchQuery,
      pageSize: pageSize ?? this.pageSize,
      currentPage: currentPage ?? this.currentPage,
    );
  }
}

/// StateNotifier controlling Trip History filters and pagination
class TripHistoryFilterNotifier extends StateNotifier<TripHistoryFilterState> {
  TripHistoryFilterNotifier({int? initialYear, int? initialMonth})
      : super(
          TripHistoryFilterState(
            selectedMonth: initialYear != null && initialMonth != null
                ? HistoryMonthOption(
                    year: initialYear,
                    month: initialMonth,
                    label: _formatMonthLabel(initialYear, initialMonth),
                  )
                : null,
          ),
        );

  static String _formatMonthLabel(int year, int month) {
    const months = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    final monthName = month >= 1 && month <= 12 ? months[month] : '';
    return '$monthName $year';
  }

  void selectAllMonths() {
    state = state.copyWith(
      selectedMonth: () => null,
      customDateRange: () => null,
      currentPage: 1,
    );
  }

  void selectMonth(HistoryMonthOption month) {
    state = state.copyWith(
      selectedMonth: () => month,
      customDateRange: () => null,
      currentPage: 1,
    );
  }

  void selectCustomDateRange(DateTimeRange range) {
    state = state.copyWith(
      selectedMonth: () => null,
      customDateRange: () => range,
      currentPage: 1,
    );
  }

  void updateSearchQuery(String query) {
    state = state.copyWith(
      searchQuery: query.trim(),
      currentPage: 1,
    );
  }

  void loadNextPage() {
    state = state.copyWith(currentPage: state.currentPage + 1);
  }

  void resetPagination() {
    state = state.copyWith(currentPage: 1);
  }
}

/// Family provider for TripHistoryFilterNotifier accepting initial year & month
final tripHistoryFilterProvider = StateNotifierProvider.autoDispose
    .family<TripHistoryFilterNotifier, TripHistoryFilterState, ({int? year, int? month})>(
  (ref, arg) => TripHistoryFilterNotifier(
    initialYear: arg.year,
    initialMonth: arg.month,
  ),
);

/// Stream provider of raw completed trips (PRD D-10: past completed trips only).
/// Single source of truth from TripRepository.
final completedTripsStreamProvider = StreamProvider.autoDispose<List<TripModel>>((ref) {
  final tripsAsync = ref.watch(allTripsProvider);
  return tripsAsync.when(
    data: (trips) {
      // Completed trips only, sorted newest completion time first
      final closedTrips = trips
          .where((t) => t.isClosed && !t.isCancelled)
          .toList()
        ..sort((a, b) {
          final timeA = a.closedAt ?? a.pickupTime;
          final timeB = b.closedAt ?? b.pickupTime;
          return timeB.compareTo(timeA); // Newest first
        });
      return Stream.value(closedTrips);
    },
    loading: () => const Stream.empty(),
    error: (err, stack) => Stream.error(err, stack),
  );
});

/// Returns all available month options present across completed trips
final availableHistoryMonthsProvider = Provider.autoDispose<List<HistoryMonthOption>>((ref) {
  final tripsAsync = ref.watch(completedTripsStreamProvider);
  final trips = tripsAsync.valueOrNull ?? [];
  final Map<String, HistoryMonthOption> monthMap = {};

  for (final trip in trips) {
    final completionDate = trip.closedAt ?? trip.pickupTime;
    final ist = IstDateTimeHelper.toIST(completionDate);
    final key = '${ist.year}-${ist.month}';
    if (!monthMap.containsKey(key)) {
      monthMap[key] = HistoryMonthOption(
        year: ist.year,
        month: ist.month,
        label: TripHistoryFilterNotifier._formatMonthLabel(ist.year, ist.month),
      );
    }
  }

  // Sort months newest first
  final list = monthMap.values.toList()
    ..sort((a, b) {
      if (a.year != b.year) return b.year.compareTo(a.year);
      return b.month.compareTo(a.month);
    });

  return list;
});

/// Filtered completed trips based on selected month, custom range, and search query
final filteredHistoryTripsProvider = Provider.autoDispose
    .family<List<TripModel>, ({int? year, int? month})>((ref, arg) {
  final tripsAsync = ref.watch(completedTripsStreamProvider);
  final filter = ref.watch(tripHistoryFilterProvider(arg));
  final allCompletedTrips = tripsAsync.valueOrNull ?? [];

  return allCompletedTrips.where((trip) {
    final completionDate = trip.closedAt ?? trip.pickupTime;
    final ist = IstDateTimeHelper.toIST(completionDate);

    // 1. Month filter
    if (filter.selectedMonth != null) {
      if (ist.year != filter.selectedMonth!.year || ist.month != filter.selectedMonth!.month) {
        return false;
      }
    }

    // 2. Custom date range filter
    if (filter.customDateRange != null) {
      final inRange = IstDateTimeHelper.isDateInPeriod(
        completionDate,
        filter.customDateRange!.start,
        filter.customDateRange!.end,
      );
      if (!inRange) return false;
    }

    // 3. Order ID search
    if (filter.searchQuery.isNotEmpty) {
      final q = filter.searchQuery.toLowerCase().replaceAll('#ord-', '').replaceAll('#', '').replaceAll('ord-', '');
      final orderIdStr = trip.orderId.toString().toLowerCase();
      final tripIdStr = trip.tripId.toLowerCase();
      if (!orderIdStr.contains(q) && !tripIdStr.contains(q)) {
        return false;
      }
    }

    return true;
  }).toList();
});

/// Flattened list item type for high-performance single ListView on low-spec devices
sealed class HistoryListItem {
  const HistoryListItem();
}

class HistoryMonthHeaderItem extends HistoryListItem {
  final String title; // e.g. "OCTOBER 2026"
  const HistoryMonthHeaderItem(this.title);
}

class HistoryDayHeaderItem extends HistoryListItem {
  final String dateString; // e.g. "18 OCT"
  const HistoryDayHeaderItem(this.dateString);
}

class HistoryTripCardItem extends HistoryListItem {
  final TripModel trip;
  const HistoryTripCardItem(this.trip);
}

/// Paginated and grouped flattened items for the history screen
final paginatedHistoryItemsProvider = Provider.autoDispose
    .family<List<HistoryListItem>, ({int? year, int? month})>((ref, arg) {
  final filteredTrips = ref.watch(filteredHistoryTripsProvider(arg));
  final filter = ref.watch(tripHistoryFilterProvider(arg));

  final totalAvailable = filteredTrips.length;
  final displayCount = (filter.currentPage * filter.pageSize).clamp(0, totalAvailable);
  final visibleTrips = filteredTrips.take(displayCount).toList();

  final List<HistoryListItem> items = [];
  String? currentMonth;
  String? currentDay;

  const fullMonthNames = [
    '', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const shortMonthNames = [
    '', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];

  for (final trip in visibleTrips) {
    final completionDate = trip.closedAt ?? trip.pickupTime;
    final ist = IstDateTimeHelper.toIST(completionDate);

    final monthStr = '${fullMonthNames[ist.month]} ${ist.year}';
    final dayStr = '${ist.day} ${shortMonthNames[ist.month]}';

    if (currentMonth != monthStr) {
      currentMonth = monthStr;
      currentDay = null; // Reset day when month changes
      items.add(HistoryMonthHeaderItem(monthStr));
    }

    if (currentDay != dayStr) {
      currentDay = dayStr;
      items.add(HistoryDayHeaderItem(dayStr));
    }

    items.add(HistoryTripCardItem(trip));
  }

  return items;
});
