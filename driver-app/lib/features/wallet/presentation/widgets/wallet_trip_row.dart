import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/wallet_models.dart';

/// Single completed trip row in the Wallet Trips list (PRD Sections 2 & 4).
/// Each row shows: order ID, completion date and time, driver earning,
/// and the expense amount (only when the trip has expenses > 0).
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

    final formattedCompletionDateTime =
        IstDateTimeHelper.formatDateTime(trip.completedAt);
    final formattedEarning =
        IstDateTimeHelper.formatCurrency(trip.driverEarning);

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
                // Order ID and Completion Date & Time
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
                        formattedCompletionDateTime,
                        style: TextStyle(
                          color: themeColors.textMuted,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                // Driver Earning and optional Expense amount
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formattedEarning,
                      style: TextStyle(
                        color: isDark
                            ? const Color(0xFF34D399)
                            : const Color(0xFF059669),
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    // PRD Section 4: Expense amount shown ONLY when above 0
                    if (trip.hasExpenses) ...[
                      const SizedBox(height: 3),
                      Text(
                        'Expense: ${IstDateTimeHelper.formatCurrency(trip.totalExpense)}',
                        style: TextStyle(
                          color: themeColors.textMuted,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
