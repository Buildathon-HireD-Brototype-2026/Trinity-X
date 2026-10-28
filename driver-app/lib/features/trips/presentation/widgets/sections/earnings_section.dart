import 'package:flutter/material.dart';
import 'package:driver_app/core/theme/app_theme_colors.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';

/// Earnings Section displaying the driver's earnings with prominent typography.
/// Automatically hidden on cancelled trips or when driverShare is missing.
class EarningsSection extends StatelessWidget {
  final TripModel trip;

  const EarningsSection({
    super.key,
    required this.trip,
  });

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final isCancelled = trip.status.toUpperCase() == 'CANCELLED';
    if (isCancelled) {
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
            'EARNINGS',
            style: TextStyle(
              color: themeColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 12),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: themeColors.purpleTint,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Icons.payments_rounded,
                        color: themeColors.purpleAccent,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Your Earning',
                        style: TextStyle(
                          color: themeColors.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '₹${trip.driverShare.toStringAsFixed(2)}',
                style: TextStyle(
                  color: themeColors.purpleAccent,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
