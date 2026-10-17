import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/wallet_models.dart';

/// Minimal date filter bar: Today / This Week / This Month / Custom.
class WalletDateFilterBar extends StatelessWidget {
  final WalletDateFilter selectedFilter;
  final DateTimeRange? customRange;
  final ValueChanged<WalletDateFilter> onFilterSelected;
  final ValueChanged<DateTimeRange?> onCustomRangeSelected;

  const WalletDateFilterBar({
    super.key,
    required this.selectedFilter,
    required this.customRange,
    required this.onFilterSelected,
    required this.onCustomRangeSelected,
  });

  Future<void> _pickCustomDateRange(BuildContext context) async {
    final now = DateTime.now();
    final initialRange = customRange ??
        DateTimeRange(
          start: now.subtract(const Duration(days: 7)),
          end: now,
        );

    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2025, 1, 1),
      lastDate: DateTime(2030, 12, 31),
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
      onCustomRangeSelected(picked);
      onFilterSelected(WalletDateFilter.custom);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
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
