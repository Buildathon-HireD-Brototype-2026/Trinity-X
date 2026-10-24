import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../trips/domain/trip_model.dart';
import '../../../wallet/domain/wallet_models.dart';
import '../../../wallet/presentation/widgets/trip_details_bottom_sheet.dart';

/// Compact Trip History card row.
/// Shows: Order ID, completion time, pickup → drop (short, 1 line each with ellipsis),
/// and the driver earning.
/// Tapping opens the read-only Trip Details bottom sheet with expenses breakdown.
class TripHistoryRow extends StatelessWidget {
  final TripModel trip;

  const TripHistoryRow({
    super.key,
    required this.trip,
  });

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final completionDate = trip.closedAt ?? trip.pickupTime;
    final completionFormatted = IstDateTimeHelper.formatDateTime(completionDate);
    final earningFormatted = IstDateTimeHelper.formatCurrency(trip.driverShare);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            TripDetailsBottomSheet.show(
              context,
              WalletTripRecord.fromTripModel(trip),
            );
          },
          child: Container(
            decoration: BoxDecoration(
              color: themeColors.cardBackground,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: themeColors.border, width: 1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Row: Order ID, Completion Time, and Driver Earning
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Order ID and Time
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '#ORD-${trip.orderId}',
                            style: TextStyle(
                              color: themeColors.textPrimary,
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            completionFormatted,
                            style: TextStyle(
                              color: themeColors.textMuted,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Driver Earning badge
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          earningFormatted,
                          style: TextStyle(
                            color: isDark ? const Color(0xFF34D399) : const Color(0xFF059669),
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                        ),
                        if (trip.expenses.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            '${trip.expenses.length} expense${trip.expenses.length > 1 ? 's' : ''}',
                            style: TextStyle(
                              color: themeColors.textMuted,
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Route Indicators: Pickup & Dropoff (short, 1 line each with ellipsis)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      // Pickup
                      Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              color: Color(0xFF3B82F6),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              trip.pickupSpot,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: themeColors.textPrimary,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),

                      // Dropoff
                      Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              color: Color(0xFF10B981),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              trip.dropoffSpot,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: themeColors.textPrimary,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
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
