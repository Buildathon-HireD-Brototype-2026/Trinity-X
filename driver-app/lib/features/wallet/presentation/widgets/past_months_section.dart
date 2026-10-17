import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/wallet_models.dart';
import 'trip_details_bottom_sheet.dart';
import 'wallet_trip_row.dart';

/// Section showing past closed months settlement records (PRD D-12 rows 63-64).
/// Shows month name, total driver earning, settlement status chip ("Paid" or "Pending"),
/// paid amount & date or pending amount.
/// Tapping a past month displays its trips list with the same row design.
class PastMonthsSection extends StatelessWidget {
  final List<MonthlySettlementRecord> pastMonths;
  final bool isLoading;

  const PastMonthsSection({
    super.key,
    required this.pastMonths,
    this.isLoading = false,
  });

  void _showPastMonthTripsSheet(
    BuildContext context,
    MonthlySettlementRecord monthRecord,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        final themeColors = sheetContext.appColors;
        final isDark = sheetContext.isDarkMode;

        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(sheetContext).size.height * 0.8,
          ),
          decoration: BoxDecoration(
            color: themeColors.cardBackground,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            border: Border(
              top: BorderSide(color: themeColors.border, width: 1),
            ),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    margin: const EdgeInsets.only(top: 10, bottom: 8),
                    width: 38,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 6, 20, 14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            monthRecord.month,
                            style: TextStyle(
                              color: themeColors.textPrimary,
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Total Earning: ${IstDateTimeHelper.formatCurrency(monthRecord.totalDriverEarning)}',
                            style: TextStyle(
                              color: themeColors.textMuted,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: Icon(
                          Icons.close_rounded,
                          color: themeColors.textMuted,
                          size: 20,
                        ),
                        visualDensity: VisualDensity.compact,
                        onPressed: () => Navigator.of(sheetContext).pop(),
                      ),
                    ],
                  ),
                ),
                Divider(height: 1, color: themeColors.divider),
                Flexible(
                  child: monthRecord.trips.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.all(28.0),
                          child: Center(
                            child: Text(
                              'No trips for ${monthRecord.month}',
                              style: TextStyle(color: themeColors.textMuted),
                            ),
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 14,
                          ),
                          itemCount: monthRecord.trips.length,
                          itemBuilder: (context, index) {
                            final trip = monthRecord.trips[index];
                            return WalletTripRow(
                              trip: trip,
                              onTap: () {
                                TripDetailsBottomSheet.show(context, trip);
                              },
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Past Months',
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: 12),
        if (isLoading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 20.0),
            child: Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          )
        else if (pastMonths.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: themeColors.cardBackground,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: themeColors.border),
            ),
            child: Center(
              child: Text(
                'No past months',
                style: TextStyle(
                  color: themeColors.textMuted,
                  fontSize: 13,
                ),
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: pastMonths.length,
            itemBuilder: (context, index) {
              final month = pastMonths[index];
              return _buildPastMonthRow(context, month);
            },
          ),
      ],
    );
  }

  Widget _buildPastMonthRow(
    BuildContext context,
    MonthlySettlementRecord month,
  ) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final isPaid = month.isPaid;
    final formattedTotal = IstDateTimeHelper.formatCurrency(month.totalDriverEarning);

    // Paid / Pending settlement details
    String settlementDetail;
    if (isPaid) {
      final dateStr = month.paidDate != null
          ? IstDateTimeHelper.formatDate(month.paidDate!)
          : '';
      final amountStr = month.paidAmount != null
          ? IstDateTimeHelper.formatCurrency(month.paidAmount!)
          : formattedTotal;
      settlementDetail = dateStr.isNotEmpty
          ? 'Paid $amountStr on $dateStr'
          : 'Paid $amountStr';
    } else {
      final pendingStr = month.pendingAmount != null
          ? IstDateTimeHelper.formatCurrency(month.pendingAmount!)
          : formattedTotal;
      settlementDetail = 'Pending amount: $pendingStr';
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => _showPastMonthTripsSheet(context, month),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        month.month,
                        style: TextStyle(
                          color: themeColors.textPrimary,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        settlementDetail,
                        style: TextStyle(
                          color: isPaid
                              ? themeColors.textMuted
                              : (isDark ? const Color(0xFFFBBF24) : const Color(0xFFD97706)),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formattedTotal,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Settlement status chip: Paid or Pending
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isPaid
                            ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5))
                            : (isDark ? const Color(0xFF78350F) : const Color(0xFFFEF3C7)),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        month.status.label.toUpperCase(),
                        style: TextStyle(
                          color: isPaid
                              ? (isDark ? const Color(0xFF34D399) : const Color(0xFF047857))
                              : (isDark ? const Color(0xFFFBBF24) : const Color(0xFFB45309)),
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
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
