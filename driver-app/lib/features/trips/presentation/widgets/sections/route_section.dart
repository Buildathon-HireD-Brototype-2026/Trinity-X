import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:driver_app/core/theme/app_theme_colors.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';
import '../route_card_map_preview.dart';
import '../trip_navigate_button.dart';

/// Route Section showing map preview banner, pickup/dropoff timeline with
/// dot-line-dot indicator, expandable address text, and navigate button.
class RouteSection extends StatelessWidget {
  final TripModel trip;
  final bool showNavigateButton;

  const RouteSection({
    super.key,
    required this.trip,
    this.showNavigateButton = true,
  });

  String _formatTime(DateTime utcTime) {
    final kolkata = utcTime.add(const Duration(hours: 5, minutes: 30));
    return DateFormat('hh:mm a').format(kolkata);
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

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
            'ROUTE',
            style: TextStyle(
              color: themeColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 14),

          // 1. Static Map Preview Banner
          RouteCardMapPreview(trip: trip),
          const SizedBox(height: 16),

          // 2. Pickup Row with Green Dot
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Container(
                    width: 14,
                    height: 14,
                    decoration: const BoxDecoration(
                      color: Color(0xFF10B981),
                      shape: BoxShape.circle,
                    ),
                  ),
                  Container(
                    width: 2,
                    height: 48,
                    color: themeColors.border,
                  ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'PICKUP',
                          style: TextStyle(
                            color: themeColors.textMuted,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.3,
                          ),
                        ),
                        Text(
                          _formatTime(trip.pickupTime),
                          style: TextStyle(
                            color: isDark ? Colors.white : const Color(0xFF10B981),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    _ExpandableAddressText(
                      text: trip.pickupSpot,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // 3. Dropoff Row with Red Dot
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: const BoxDecoration(
                  color: Color(0xFFEF4444),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'DROPOFF',
                          style: TextStyle(
                            color: themeColors.textMuted,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.3,
                          ),
                        ),
                        if (trip.estimatedReachMinutes > 0)
                          Text(
                            '~${trip.estimatedReachMinutes} mins ETA',
                            style: TextStyle(
                              color: themeColors.purpleAccent,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    _ExpandableAddressText(
                      text: trip.dropoffSpot,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // 4. In-Card Navigate Button
          if (showNavigateButton) TripNavigateButton(trip: trip),
        ],
      ),
    );
  }
}

class _ExpandableAddressText extends StatefulWidget {
  final String text;
  final TextStyle? style;

  const _ExpandableAddressText({
    required this.text,
    this.style,
  });

  @override
  State<_ExpandableAddressText> createState() => _ExpandableAddressTextState();
}

class _ExpandableAddressTextState extends State<_ExpandableAddressText> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        setState(() {
          _isExpanded = !_isExpanded;
        });
      },
      child: Text(
        widget.text,
        style: widget.style,
        maxLines: _isExpanded ? null : 2,
        overflow: _isExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
      ),
    );
  }
}
