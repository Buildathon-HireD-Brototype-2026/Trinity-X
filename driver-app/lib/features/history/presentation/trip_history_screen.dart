import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/routing/route_names.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../trips/presentation/controllers/current_trip_provider.dart';
import 'controllers/trip_history_controller.dart';
import 'widgets/history_filter_bar.dart';
import 'widgets/trip_history_row.dart';

/// Trip History Screen (PRD D-10).
/// Chronological list of completed trips grouped by Month and Date.
/// Features month filter, custom date range picker, search by order ID,
/// pull-to-refresh, pagination, and read-only trip details on tap.
class TripHistoryScreen extends ConsumerStatefulWidget {
  final int? initialYear;
  final int? initialMonth;

  const TripHistoryScreen({
    super.key,
    this.initialYear,
    this.initialMonth,
  });

  @override
  ConsumerState<TripHistoryScreen> createState() => _TripHistoryScreenState();
}

class _TripHistoryScreenState extends ConsumerState<TripHistoryScreen> {
  late final ScrollController _scrollController;
  late final ({int? year, int? month}) _filterArg;

  @override
  void initState() {
    super.initState();
    _filterArg = (year: widget.initialYear, month: widget.initialMonth);
    _scrollController = ScrollController()..addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      ref.read(tripHistoryFilterProvider(_filterArg).notifier).loadNextPage();
    }
  }

  Future<void> _onRefresh() async {
    ref.invalidate(allTripsProvider);
    ref.read(tripHistoryFilterProvider(_filterArg).notifier).resetPagination();
    await Future.delayed(const Duration(milliseconds: 300));
  }

  void _handleBack() {
    try {
      if (context.canPop()) {
        context.pop();
        return;
      }
    } catch (_) {}

    try {
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
        return;
      }
    } catch (_) {}

    context.go(RouteNames.profile);
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;

    final filterState = ref.watch(tripHistoryFilterProvider(_filterArg));
    final filterNotifier = ref.read(tripHistoryFilterProvider(_filterArg).notifier);
    final availableMonths = ref.watch(availableHistoryMonthsProvider);
    final historyItems = ref.watch(paginatedHistoryItemsProvider(_filterArg));
    final rawStreamAsync = ref.watch(completedTripsStreamProvider);

    return Scaffold(
      backgroundColor: themeColors.pageBackground,
      appBar: AppBar(
        backgroundColor: themeColors.cardBackground,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: themeColors.textPrimary,
            size: 20,
          ),
          tooltip: 'Back',
          onPressed: _handleBack,
        ),
        title: Text(
          'Trip History',
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        centerTitle: false,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 1. Top Filter Bar (Month selector + Custom range + Search)
            HistoryFilterBar(
              filterState: filterState,
              availableMonths: availableMonths,
              onSelectAllMonths: filterNotifier.selectAllMonths,
              onSelectMonth: filterNotifier.selectMonth,
              onSelectCustomRange: filterNotifier.selectCustomDateRange,
              onSearchChanged: filterNotifier.updateSearchQuery,
            ),
            Divider(height: 1, color: themeColors.border),

            // 2. Main History Content
            Expanded(
              child: rawStreamAsync.when(
                loading: () => _buildLoadingState(context),
                error: (err, _) => _buildErrorState(context, err),
                data: (_) {
                  if (historyItems.isEmpty) {
                    return _buildEmptyState(context);
                  }

                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: themeColors.primaryButton,
                    backgroundColor: themeColors.cardBackground,
                    child: ListView.builder(
                      controller: _scrollController,
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      itemCount: historyItems.length,
                      itemBuilder: (context, index) {
                        final item = historyItems[index];

                        if (item is HistoryMonthHeaderItem) {
                          return _buildMonthHeader(context, item.title);
                        } else if (item is HistoryDayHeaderItem) {
                          return _buildDayHeader(context, item.dateString);
                        } else if (item is HistoryTripCardItem) {
                          return TripHistoryRow(trip: item.trip);
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Sticky/clean Month Section Header (e.g. "OCTOBER 2026")
  Widget _buildMonthHeader(BuildContext context, String title) {
    final themeColors = context.appColors;

    return Padding(
      padding: const EdgeInsets.only(top: 14, bottom: 8, left: 2),
      child: Text(
        title,
        style: TextStyle(
          color: themeColors.purpleAccent,
          fontSize: 12.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  /// Small Date Section Header (e.g. "18 OCT")
  Widget _buildDayHeader(BuildContext context, String dateString) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 8, left: 4),
      child: Row(
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            dateString,
            style: TextStyle(
              color: themeColors.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }

  /// Empty state: neutral icon with the word "No trips"
  Widget _buildEmptyState(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
                border: Border.all(color: themeColors.border, width: 1),
              ),
              child: Icon(
                Icons.history_rounded,
                size: 28,
                color: themeColors.textMuted,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'No trips',
              style: TextStyle(
                color: themeColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Loading state: simple placeholder rows
  Widget _buildLoadingState(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 4,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: themeColors.cardBackground,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: themeColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 120,
                height: 14,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                height: 24,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Error state: error message with a retry action
  Widget _buildErrorState(BuildContext context, Object error) {
    final themeColors = context.appColors;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 40,
              color: themeColors.textMuted,
            ),
            const SizedBox(height: 12),
            Text(
              'Failed to load history',
              style: TextStyle(
                color: themeColors.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                ref.invalidate(allTripsProvider);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: themeColors.primaryButton,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
