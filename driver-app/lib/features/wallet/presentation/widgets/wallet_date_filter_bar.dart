import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/wallet_models.dart';

/// DateFilterBar with range summary (PRD Section 3).
/// Displays filter chips (Today / This Week / This Month / Custom range)
/// and a live period summary row: Total Driver Earning, Completed Trips, and Total Expense.
class WalletDateFilterBar extends StatelessWidget {
  final WalletDateFilter selectedFilter;
  final DateTimeRange? customRange;
  final WalletPeriodSummary summary;
  final ValueChanged<WalletDateFilter> onFilterSelected;
  final ValueChanged<DateTimeRange?> onCustomRangeSelected;

  const WalletDateFilterBar({
    super.key,
    required this.selectedFilter,
    required this.customRange,
    required this.summary,
    required this.onFilterSelected,
    required this.onCustomRangeSelected,
  });

  Future<void> _pickCustomDateRange(BuildContext context) async {
    final nowIST = IstDateTimeHelper.nowIST();
    final todayDateOnly = DateTime(nowIST.year, nowIST.month, nowIST.day);

    final initialRange = customRange ??
        DateTimeRange(
          start: todayDateOnly.subtract(const Duration(days: 7)),
          end: todayDateOnly,
        );

    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2025, 1, 1),
      // PRD Section 3: Future dates are not selectable
      lastDate: todayDateOnly,
      initialDateRange: initialRange,
      builder: (context, child) {
        final isDark = context.isDarkMode;
        final themeColors = context.appColors;
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.fromSeed(
              seedColor: themeColors.primaryButton,
              brightness: isDark ? Brightness.dark : Brightness.light,
              primary: themeColors.primaryButton,
            ),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );

    if (picked != null) {
      // PRD rule: end date cannot be before start date
      if (!picked.end.isBefore(picked.start)) {
        onCustomRangeSelected(picked);
        onFilterSelected(WalletDateFilter.custom);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Horizontal Filter Chips Bar
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: [
              _buildChip(context, WalletDateFilter.today),
              const SizedBox(width: 8),
              _buildChip(context, WalletDateFilter.thisWeek),
              const SizedBox(width: 8),
              _buildChip(context, WalletDateFilter.thisMonth),
              const SizedBox(width: 8),
              _buildCustomChip(context),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 2. Period Summary Row (Live recalculation for selected period)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: themeColors.cardBackground,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: themeColors.border,
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSummaryItem(
                context: context,
                label: 'Driver Earning',
                value: IstDateTimeHelper.formatCurrency(summary.totalDriverEarning),
                valueColor: isDark ? const Color(0xFF34D399) : const Color(0xFF059669),
              ),
              Container(
                width: 1,
                height: 28,
                color: themeColors.divider,
              ),
              _buildSummaryItem(
                context: context,
                label: 'Trips',
                value: summary.completedTripCount.toString(),
                valueColor: themeColors.textPrimary,
              ),
              Container(
                width: 1,
                height: 28,
                color: themeColors.divider,
              ),
              _buildSummaryItem(
                context: context,
                label: 'Total Expense',
                value: IstDateTimeHelper.formatCurrency(summary.totalExpense),
                valueColor: summary.totalExpense > 0
                    ? themeColors.textPrimary
                    : themeColors.textMuted,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryItem({
    required BuildContext context,
    required String label,
    required String value,
    required Color valueColor,
  }) {
    final themeColors = context.appColors;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: TextStyle(
            color: themeColors.textMuted,
            fontSize: 11.5,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: TextStyle(
            color: valueColor,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  Widget _buildChip(BuildContext context, WalletDateFilter filter) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final isSelected = selectedFilter == filter;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => onFilterSelected(filter),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: isSelected
                ? themeColors.primaryButton
                : (isDark ? const Color(0xFF1E293B) : Colors.white),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? Colors.transparent : themeColors.border,
              width: 1,
            ),
          ),
          child: Text(
            filter.label,
            style: TextStyle(
              color: isSelected
                  ? Colors.white
                  : (isDark ? const Color(0xFF94A3B8) : themeColors.textSecondary),
              fontSize: 12.5,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCustomChip(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final isSelected = selectedFilter == WalletDateFilter.custom;

    String label = 'Custom';
    if (isSelected && customRange != null) {
      label =
          '${IstDateTimeHelper.formatDate(customRange!.start)} - ${IstDateTimeHelper.formatDate(customRange!.end)}';
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => _pickCustomDateRange(context),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: isSelected
                ? themeColors.primaryButton
                : (isDark ? const Color(0xFF1E293B) : Colors.white),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? Colors.transparent : themeColors.border,
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: isSelected
                      ? Colors.white
                      : (isDark ? const Color(0xFF94A3B8) : themeColors.textSecondary),
                  fontSize: 12.5,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.calendar_today_rounded,
                size: 13,
                color: isSelected
                    ? Colors.white
                    : (isDark ? const Color(0xFF94A3B8) : themeColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
