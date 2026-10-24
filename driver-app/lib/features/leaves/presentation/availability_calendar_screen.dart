import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:driver_app/core/config/leave_config.dart';
import 'package:driver_app/core/routing/route_names.dart';
import 'package:driver_app/core/theme/app_theme_colors.dart';
import 'package:driver_app/features/wallet/domain/wallet_models.dart';
import 'package:driver_app/features/leaves/domain/driver_leave_model.dart';
import 'package:driver_app/features/leaves/presentation/controllers/leave_controller.dart';

/// Availability Calendar & Apply for Leave Screen (PRD D-03, Excel row 55).
class AvailabilityCalendarScreen extends ConsumerStatefulWidget {
  const AvailabilityCalendarScreen({super.key});

  @override
  ConsumerState<AvailabilityCalendarScreen> createState() => _AvailabilityCalendarScreenState();
}

class _AvailabilityCalendarScreenState extends ConsumerState<AvailabilityCalendarScreen> {
  static const List<String> _weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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

  void _showCancelDialog(BuildContext context, DriverLeaveModel leave) {
    final themeColors = context.appColors;

    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: themeColors.cardBackground,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            'Cancel Leave',
            style: TextStyle(
              color: themeColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          content: Text(
            'Are you sure you want to cancel this leave (${IstDateTimeHelper.formatDate(leave.startDate)} - ${IstDateTimeHelper.formatDate(leave.endDate)})? These dates will become available again.',
            style: TextStyle(
              color: themeColors.textSecondary,
              fontSize: 13.5,
              height: 1.4,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: Text(
                'Keep Leave',
                style: TextStyle(color: themeColors.textMuted, fontWeight: FontWeight.w600),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                final messenger = ScaffoldMessenger.of(context);
                final success = await ref
                    .read(leaveCalendarControllerProvider.notifier)
                    .cancelLeave(leave.leaveId);
                if (mounted && success) {
                  messenger.showSnackBar(
                    const SnackBar(
                      behavior: SnackBarBehavior.floating,
                      content: Text('Leave cancelled successfully'),
                    ),
                  );
                }
              },
              child: const Text('Cancel Leave'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final calendarState = ref.watch(leaveCalendarControllerProvider);
    final calendarNotifier = ref.read(leaveCalendarControllerProvider.notifier);
    final remainingDays = ref.watch(remainingLeaveDaysForFocusedMonthProvider);
    final leavesAsync = ref.watch(leavesStreamProvider);
    final blockedMap = ref.watch(blockedTripDatesProvider);

    final leavesList = leavesAsync.valueOrNull ?? [];
    final nowIST = IstDateTimeHelper.nowIST();
    final todayOnly = DateTime(nowIST.year, nowIST.month, nowIST.day);

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
          'Availability Calendar',
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
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Calendar Card
              GestureDetector(
                onHorizontalDragEnd: (details) {
                  if (details.primaryVelocity != null) {
                    if (details.primaryVelocity! < -200) {
                      calendarNotifier.nextMonth();
                    } else if (details.primaryVelocity! > 200) {
                      calendarNotifier.previousMonth();
                    }
                  }
                },
                child: Container(
                  decoration: BoxDecoration(
                    color: themeColors.cardBackground,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: themeColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Month Selector Header & Remaining Days Label
                      _buildMonthHeader(
                        context: context,
                        focusedMonth: calendarState.focusedMonth,
                        remainingDays: remainingDays,
                        onPrev: calendarNotifier.previousMonth,
                        onNext: calendarNotifier.nextMonth,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Leave must be applied at least ${LeaveConfig.minNoticeDays} days in advance',
                        style: TextStyle(
                          color: themeColors.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Week Day Labels
                      _buildWeekDaysRow(context),
                      const SizedBox(height: 8),

                      // Day Cells Grid
                      _buildDaysGrid(
                        context: context,
                        focusedMonth: calendarState.focusedMonth,
                        selectedStart: calendarState.selectedStartDate,
                        selectedEnd: calendarState.selectedEndDate,
                        leaves: leavesList,
                        blockedMap: blockedMap,
                        todayOnly: todayOnly,
                        onDayTap: calendarNotifier.selectDay,
                      ),
                      const SizedBox(height: 14),

                      // Legend
                      _buildLegend(context),
                    ],
                  ),
                ),
              ),

              // Error / Validation message banner
              if (calendarState.errorMessage != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF451A1A) : const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? const Color(0xFFB91C1C) : const Color(0xFFFCA5A5),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, size: 18, color: Color(0xFFEF4444)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          calendarState.errorMessage!,
                          style: const TextStyle(
                            color: Color(0xFFDC2626),
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // 2. Selection Action Summary Card
              if (calendarState.selectedStartDate != null) ...[
                const SizedBox(height: 14),
                _buildSelectionActionCard(
                  context: context,
                  state: calendarState,
                  remainingDays: remainingDays,
                  onApply: calendarNotifier.applyLeave,
                  onClear: calendarNotifier.clearSelection,
                ),
              ],

              const SizedBox(height: 20),

              // 3. Upcoming Leaves List
              _buildUpcomingLeavesSection(
                context: context,
                leaves: leavesList,
                todayOnly: todayOnly,
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  /// Month selector with navigation arrows and remaining days label
  Widget _buildMonthHeader({
    required BuildContext context,
    required DateTime focusedMonth,
    required int remainingDays,
    required VoidCallback onPrev,
    required VoidCallback onNext,
  }) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    const monthNames = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    final monthTitle = '${monthNames[focusedMonth.month]} ${focusedMonth.year}';

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  monthTitle,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: themeColors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Remaining leave days badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: remainingDays > 0
                      ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5))
                      : (isDark ? const Color(0xFF451A1A) : const Color(0xFFFEE2E2)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$remainingDays left',
                  style: TextStyle(
                    color: remainingDays > 0
                        ? (isDark ? const Color(0xFF34D399) : const Color(0xFF059669))
                        : const Color(0xFFEF4444),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: Icon(Icons.chevron_left_rounded, color: themeColors.textPrimary, size: 22),
              visualDensity: VisualDensity.compact,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              tooltip: 'Previous Month',
              onPressed: onPrev,
            ),
            IconButton(
              icon: Icon(Icons.chevron_right_rounded, color: themeColors.textPrimary, size: 22),
              visualDensity: VisualDensity.compact,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              tooltip: 'Next Month',
              onPressed: onNext,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildWeekDaysRow(BuildContext context) {
    final themeColors = context.appColors;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: _weekDays.map((d) {
        return SizedBox(
          width: 32,
          child: Text(
            d,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: themeColors.textMuted,
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDaysGrid({
    required BuildContext context,
    required DateTime focusedMonth,
    required DateTime? selectedStart,
    required DateTime? selectedEnd,
    required List<DriverLeaveModel> leaves,
    required Map<String, dynamic> blockedMap,
    required DateTime todayOnly,
    required void Function(DateTime day) onDayTap,
  }) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final firstDayOfMonth = DateTime(focusedMonth.year, focusedMonth.month, 1);
    final daysInMonth = DateTime(focusedMonth.year, focusedMonth.month + 1, 0).day;
    // DateTime weekday: Monday is 1, Sunday is 7
    final leadingBlanks = firstDayOfMonth.weekday - 1;

    final earliestNoticeDay = todayOnly.add(Duration(days: LeaveConfig.minNoticeDays));

    final totalCells = leadingBlanks + daysInMonth;
    final rowCount = (totalCells / 7).ceil();

    return Column(
      children: List.generate(rowCount, (rowIndex) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 3.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(7, (colIndex) {
              final cellIndex = rowIndex * 7 + colIndex;
              final dayNumber = cellIndex - leadingBlanks + 1;

              if (dayNumber < 1 || dayNumber > daysInMonth) {
                return const SizedBox(width: 34, height: 34);
              }

              final cellDate = DateTime(focusedMonth.year, focusedMonth.month, dayNumber);
              final dateKey = '${cellDate.year}-${cellDate.month.toString().padLeft(2, '0')}-${cellDate.day.toString().padLeft(2, '0')}';

              final isToday = cellDate.isAtSameMomentAs(todayOnly);
              final isPastOrNoticeDisabled = cellDate.isBefore(earliestNoticeDay);
              final isBlocked = blockedMap.containsKey(dateKey);
              final isOnLeave = leaves.any((l) => l.containsDate(cellDate));

              final isStart = selectedStart != null && cellDate.isAtSameMomentAs(selectedStart);
              final isEnd = selectedEnd != null && cellDate.isAtSameMomentAs(selectedEnd);
              final isInRange = selectedStart != null &&
                  selectedEnd != null &&
                  cellDate.isAfter(selectedStart) &&
                  cellDate.isBefore(selectedEnd);

              // Cell Styling
              Color? bgColor;
              Color textColor = themeColors.textPrimary;
              Border? border;

              if (isStart || isEnd) {
                bgColor = themeColors.primaryButton;
                textColor = Colors.white;
              } else if (isInRange) {
                bgColor = themeColors.primaryButton.withValues(alpha: isDark ? 0.35 : 0.15);
                textColor = themeColors.primaryButton;
              } else if (isOnLeave) {
                bgColor = isDark ? const Color(0xFF3B2506) : const Color(0xFFFEF3C7);
                textColor = isDark ? const Color(0xFFFBBF24) : const Color(0xFFD97706);
              } else if (isBlocked) {
                bgColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
                textColor = themeColors.textMuted;
              } else if (isPastOrNoticeDisabled) {
                textColor = themeColors.textMuted.withValues(alpha: 0.4);
              }

              if (isToday && !isStart && !isEnd) {
                border = Border.all(color: themeColors.purpleAccent, width: 1.5);
              }

              return InkWell(
                onTap: (isPastOrNoticeDisabled || isBlocked || isOnLeave)
                    ? () => onDayTap(cellDate) // triggers validation message
                    : () => onDayTap(cellDate),
                borderRadius: BorderRadius.circular(17),
                child: Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: bgColor,
                    shape: BoxShape.circle,
                    border: border,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '$dayNumber',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 12.5,
                      fontWeight: (isStart || isEnd || isToday) ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ),
              );
            }),
          ),
        );
      }),
    );
  }

  Widget _buildLegend(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Padding(
      padding: const EdgeInsets.only(top: 8.0),
      child: Wrap(
        alignment: WrapAlignment.spaceEvenly,
        spacing: 12,
        runSpacing: 6,
        children: [
          _buildLegendItem(
            color: isDark ? const Color(0xFF3B2506) : const Color(0xFFFEF3C7),
            label: 'Leave',
            textColor: themeColors.textSecondary,
          ),
          _buildLegendItem(
            color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
            label: 'Blocked (Trip)',
            textColor: themeColors.textSecondary,
          ),
          _buildLegendItem(
            color: themeColors.primaryButton,
            label: 'Selected',
            textColor: themeColors.textSecondary,
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem({
    required Color color,
    required String label,
    required Color textColor,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(color: textColor, fontSize: 11, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Widget _buildSelectionActionCard({
    required BuildContext context,
    required LeaveCalendarState state,
    required int remainingDays,
    required Future<bool> Function() onApply,
    required VoidCallback onClear,
  }) {
    final themeColors = context.appColors;

    final start = state.selectedStartDate!;
    final end = state.selectedEndDate ?? start;
    final daysCount = state.selectedDaysCount;
    final dateRangeStr = start.isAtSameMomentAs(end)
        ? IstDateTimeHelper.formatDate(start)
        : '${IstDateTimeHelper.formatDate(start)} - ${IstDateTimeHelper.formatDate(end)}';

    return Container(
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: themeColors.border),
      ),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$daysCount day${daysCount > 1 ? 's' : ''} selected',
                style: TextStyle(
                  color: themeColors.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                ),
              ),
              IconButton(
                icon: Icon(Icons.close_rounded, size: 18, color: themeColors.textMuted),
                visualDensity: VisualDensity.compact,
                onPressed: onClear,
              ),
            ],
          ),
          Text(
            dateRangeStr,
            style: TextStyle(
              color: themeColors.textSecondary,
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 14),
          ElevatedButton(
            onPressed: state.isApplying ? null : onApply,
            style: ElevatedButton.styleFrom(
              backgroundColor: themeColors.primaryButton,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: state.isApplying
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text(
                    'Apply Leave',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingLeavesSection({
    required BuildContext context,
    required List<DriverLeaveModel> leaves,
    required DateTime todayOnly,
  }) {
    final themeColors = context.appColors;

    final sortedLeaves = List<DriverLeaveModel>.from(leaves)
      ..sort((a, b) => a.startDate.compareTo(b.startDate));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Upcoming Leaves',
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
          ),
        ),
        const SizedBox(height: 12),
        if (sortedLeaves.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(28.0),
            decoration: BoxDecoration(
              color: themeColors.cardBackground,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: themeColors.border),
            ),
            child: Column(
              children: [
                Icon(Icons.event_busy_rounded, size: 32, color: themeColors.textMuted),
                const SizedBox(height: 10),
                Text(
                  'No leaves',
                  style: TextStyle(
                    color: themeColors.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: sortedLeaves.length,
            itemBuilder: (context, index) {
              final leave = sortedLeaves[index];
              final canCancel = leave.isFuture(todayOnly);
              final dateRangeStr = leave.startDate.isAtSameMomentAs(leave.endDate)
                  ? IstDateTimeHelper.formatDate(leave.startDate)
                  : '${IstDateTimeHelper.formatDate(leave.startDate)} - ${IstDateTimeHelper.formatDate(leave.endDate)}';

              return Container(
                margin: const EdgeInsets.only(bottom: 10.0),
                decoration: BoxDecoration(
                  color: themeColors.cardBackground,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: themeColors.border),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            dateRangeStr,
                            style: TextStyle(
                              color: themeColors.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${leave.daysCount} day${leave.daysCount > 1 ? 's' : ''} • Active',
                            style: TextStyle(
                              color: themeColors.textMuted,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (canCancel)
                      TextButton(
                        onPressed: () => _showCancelDialog(context, leave),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFFEF4444),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        ),
                        child: const Text(
                          'Cancel',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                      )
                    else
                      Text(
                        'View Only',
                        style: TextStyle(
                          color: themeColors.textMuted,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }
}
