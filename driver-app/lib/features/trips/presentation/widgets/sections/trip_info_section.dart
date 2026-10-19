import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:driver_app/core/theme/app_theme_colors.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import 'trip_live_elapsed_timer.dart';

/// Trip Info Section displaying start time, end time, duration, and distance
/// in a clean two-column grid. Automatically hides missing rows without N/A or dashes.
class TripInfoSection extends StatelessWidget {
  final TripModel trip;

  const TripInfoSection({
    super.key,
    required this.trip,
  });

  String _formatTime(DateTime utcTime) {
    final kolkata = utcTime.add(const Duration(hours: 5, minutes: 30));
    return DateFormat('hh:mm a').format(kolkata);
  }

  String _formatCompletedDuration(DateTime start, DateTime end) {
    final diff = end.difference(start);
    final h = diff.inHours;
    final m = diff.inMinutes.remainder(60);
    if (h > 0) {
      return m > 0 ? '${h}h ${m}m' : '${h}h';
    }
    return '${m > 0 ? m : 1}m';
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final isOngoing = trip.isOngoing;
    final isClosed = trip.isClosed;
    final isCancelled = trip.status.toUpperCase() == 'CANCELLED';

    // 1. Start Time: trip.startedAt ?? (isOngoing || isClosed ? trip.pickupTime : null)
    final startTime = trip.startedAt ?? (isOngoing || isClosed ? trip.pickupTime : null);
    final String? startTimeStr = startTime != null ? _formatTime(startTime) : null;

    // 2. End Time: only when trip is closed / completed
    final endTime = trip.closedAt;
    final String? endTimeStr = endTime != null ? _formatTime(endTime) : null;

    // 3. Duration:
    Widget? durationValueWidget;
    if (!isCancelled) {
      if (isOngoing && startTime != null) {
        durationValueWidget = TripLiveElapsedTimer(
          startedAt: startTime,
          style: TextStyle(
            color: themeColors.purpleAccent,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        );
      } else if (isClosed && startTime != null && endTime != null) {
        durationValueWidget = Text(
          _formatCompletedDuration(startTime, endTime),
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        );
      } else if (trip.isAssigned && trip.estimatedReachMinutes > 0) {
        durationValueWidget = Text(
          '~${trip.estimatedReachMinutes}m est.',
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        );
      }
    }

    // 4. Reach / Distance:
    String? distanceOrReach;
    if (trip.estimatedReachMinutes > 0) {
      distanceOrReach = '${trip.estimatedReachMinutes} mins';
    }

    // Collect available info items
    final items = <_InfoItem>[];

    if (startTimeStr != null) {
      items.add(_InfoItem(
        label: 'START TIME',
        child: Text(
          startTimeStr,
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ));
    }

    if (endTimeStr != null) {
      items.add(_InfoItem(
        label: 'END TIME',
        child: Text(
          endTimeStr,
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ));
    }

    if (durationValueWidget != null) {
      items.add(_InfoItem(
        label: isOngoing ? 'LIVE ELAPSED' : 'DURATION',
        child: durationValueWidget,
      ));
    }

    if (distanceOrReach != null) {
      items.add(_InfoItem(
        label: 'EST. TIME',
        child: Text(
          distanceOrReach,
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ));
    }

    // If no info items are available, hide the section cleanly
    if (items.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: themeColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'TRIP INFO',
            style: TextStyle(
              color: themeColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 14),

          // 2-column grid layout
          for (var i = 0; i < items.length; i += 2) ...[
            if (i > 0) const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: _buildItemColumn(items[i], themeColors)),
                const SizedBox(width: 16),
                Expanded(
                  child: i + 1 < items.length
                      ? _buildItemColumn(items[i + 1], themeColors)
                      : const SizedBox.shrink(),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildItemColumn(_InfoItem item, AppThemeColors colors) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          item.label,
          style: TextStyle(
            color: colors.textMuted,
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: 3),
        item.child,
      ],
    );
  }
}

class _InfoItem {
  final String label;
  final Widget child;

  const _InfoItem({
    required this.label,
    required this.child,
  });
}
