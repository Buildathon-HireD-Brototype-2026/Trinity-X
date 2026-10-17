import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/wallet_models.dart';

/// Single trip row in the Wallet Trips list.
/// PRD requirement: Each row shows only order ID, trip date and time, and driver earning (driver split amount).
class WalletTripRow extends StatelessWidget {
  final WalletTripRecord trip;
  final VoidCallback onTap;

  const WalletTripRow({
    super.key,
    required this.trip,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final formattedDateTime = IstDateTimeHelper.formatDateTime(trip.tripStartTime);
    final formattedEarning = IstDateTimeHelper.formatCurrency(trip.driverEarning);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
              children: [
                // Order ID and Date & Time
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Order #${trip.orderId}',
                        style: TextStyle(
                          color: themeColors.textPrimary,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        formattedDateTime,
                        style: TextStyle(
                          color: themeColors.textMuted,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                // Driver Earning (the driver split amount)
                Text(
                  formattedEarning,
                  style: TextStyle(
                    color: trip.countsTowardBalance
                        ? (isDark ? const Color(0xFF34D399) : const Color(0xFF059669))
                        : themeColors.textMuted,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
