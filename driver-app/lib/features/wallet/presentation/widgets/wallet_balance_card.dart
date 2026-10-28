import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/wallet_models.dart';

/// Minimal top card displaying current month live balance, month label,
/// and number of completed trips.
/// PRD Section 2: Minimal design, only labels, headings, and numbers.
class WalletBalanceCard extends StatelessWidget {
  final double balance;
  final DateTime currentDateTime;
  final int completedTripCount;

  const WalletBalanceCard({
    super.key,
    required this.balance,
    required this.currentDateTime,
    required this.completedTripCount,
  });

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final monthLabel = IstDateTimeHelper.formatMonthYear(currentDateTime);
    final formattedBalance = IstDateTimeHelper.formatCurrency(balance);
    final tripsLabel = completedTripCount == 1
        ? '1 completed trip'
        : '$completedTripCount completed trips';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: themeColors.border,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row with "Balance" heading and Month label
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                'Balance',
                style: TextStyle(
                  color: themeColors.textMuted,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  monthLabel,
                  style: TextStyle(
                    color: themeColors.textSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Large balance number
          Text(
            formattedBalance,
            style: TextStyle(
              color: themeColors.textPrimary,
              fontSize: 32,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.8,
            ),
          ),
          const SizedBox(height: 6),
          // Number of completed trips
          Text(
            tripsLabel,
            style: TextStyle(
              color: themeColors.textMuted,
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
