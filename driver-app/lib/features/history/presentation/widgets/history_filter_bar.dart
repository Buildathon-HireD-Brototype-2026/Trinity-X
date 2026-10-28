import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../wallet/domain/wallet_models.dart';
import '../controllers/trip_history_controller.dart';

/// Filter bar for Trip History screen.
/// Includes month selector chips (defaulting to "All"), custom date range picker,
/// and an Order ID search field.
class HistoryFilterBar extends StatefulWidget {
  final TripHistoryFilterState filterState;
  final List<HistoryMonthOption> availableMonths;
  final VoidCallback onSelectAllMonths;
  final ValueChanged<HistoryMonthOption> onSelectMonth;
  final ValueChanged<DateTimeRange> onSelectCustomRange;
  final ValueChanged<String> onSearchChanged;

  const HistoryFilterBar({
    super.key,
    required this.filterState,
    required this.availableMonths,
    required this.onSelectAllMonths,
    required this.onSelectMonth,
    required this.onSelectCustomRange,
    required this.onSearchChanged,
  });

  @override
  State<HistoryFilterBar> createState() => _HistoryFilterBarState();
}

class _HistoryFilterBarState extends State<HistoryFilterBar> {
  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: widget.filterState.searchQuery);
  }

  @override
  void didUpdateWidget(covariant HistoryFilterBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.filterState.searchQuery != _searchController.text &&
        widget.filterState.searchQuery != oldWidget.filterState.searchQuery) {
      _searchController.text = widget.filterState.searchQuery;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _pickCustomDateRange(BuildContext context) async {
    final nowIST = IstDateTimeHelper.nowIST();
    final todayDateOnly = DateTime(nowIST.year, nowIST.month, nowIST.day);

    final initialRange = widget.filterState.customDateRange ??
        DateTimeRange(
          start: todayDateOnly.subtract(const Duration(days: 7)),
          end: todayDateOnly,
        );

    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2025, 1, 1),
      // Future dates are not selectable
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
      if (!picked.end.isBefore(picked.start)) {
        widget.onSelectCustomRange(picked);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Container(
      color: themeColors.cardBackground,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Search Bar for Order ID
          Container(
            height: 40,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: themeColors.border, width: 1),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: widget.onSearchChanged,
              style: TextStyle(
                color: themeColors.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
              decoration: InputDecoration(
                hintText: 'Search by Order ID (e.g. 1040)',
                hintStyle: TextStyle(
                  color: themeColors.textMuted,
                  fontSize: 12.5,
                ),
                prefixIcon: Icon(
                  Icons.search_rounded,
                  size: 18,
                  color: themeColors.textMuted,
                ),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: Icon(
                          Icons.cancel_rounded,
                          size: 16,
                          color: themeColors.textMuted,
                        ),
                        onPressed: () {
                          _searchController.clear();
                          widget.onSearchChanged('');
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // 2. Horizontal Filter Chips Bar (All, Months, Custom)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: [
                // "All" chip
                _buildChip(
                  context: context,
                  label: 'All',
                  isSelected: widget.filterState.isAllSelected,
                  onTap: widget.onSelectAllMonths,
                ),
                const SizedBox(width: 8),

                // Available months (e.g. October 2026, September 2026, August 2026)
                ...widget.availableMonths.map((month) {
                  final isSelected = widget.filterState.selectedMonth == month;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: _buildChip(
                      context: context,
                      label: month.label,
                      isSelected: isSelected,
                      onTap: () => widget.onSelectMonth(month),
                    ),
                  );
                }),

                // Custom date range chip
                _buildCustomChip(context),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChip({
    required BuildContext context,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
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
            label,
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
    final isSelected = widget.filterState.isCustomSelected;

    String label = 'Custom';
    if (isSelected && widget.filterState.customDateRange != null) {
      final range = widget.filterState.customDateRange!;
      label = '${IstDateTimeHelper.formatDate(range.start)} - ${IstDateTimeHelper.formatDate(range.end)}';
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
