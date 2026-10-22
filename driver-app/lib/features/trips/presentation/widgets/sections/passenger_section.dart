import 'package:flutter/material.dart';
import 'package:driver_app/core/theme/app_theme_colors.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';

/// Passenger / Client Section displaying client name and company name.
/// Phone number and call button have been moved to the Contact Bottom Sheet.
class PassengerSection extends StatelessWidget {
  final TripModel trip;

  const PassengerSection({
    super.key,
    required this.trip,
  });

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final hasName = trip.contactName.trim().isNotEmpty;
    final hasCompany = trip.companyName.trim().isNotEmpty;

    // If no passenger or client info, hide the section cleanly
    if (!hasName && !hasCompany) {
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
            'PASSENGER',
            style: TextStyle(
              color: themeColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 14),

          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: themeColors.purpleTint,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  Icons.person_rounded,
                  color: themeColors.purpleAccent,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (hasName)
                      Text(
                        trip.contactName,
                        style: TextStyle(
                          color: themeColors.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    if (hasCompany) ...[
                      const SizedBox(height: 2),
                      Text(
                        trip.companyName,
                        style: TextStyle(
                          color: themeColors.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
