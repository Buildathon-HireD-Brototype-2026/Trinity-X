import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/wallet_models.dart';
import 'expense_list_sheet.dart';

/// Bottom sheet displaying Trip Details for a wallet completed trip record.
/// PRD Section 4:
/// Heading: "Trip Details"
/// Show: order ID, start and completion date and time, driver earning (read-only split result),
/// total expense, trip status.
/// Expense row is tappable only when trip has expenses > 0.
class TripDetailsBottomSheet extends StatelessWidget {
  final WalletTripRecord trip;

  const TripDetailsBottomSheet({
    super.key,
    required this.trip,
  });

  static Future<void> show(BuildContext context, WalletTripRecord trip) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TripDetailsBottomSheet(trip: trip),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final startTimeFormatted = IstDateTimeHelper.formatDateTime(trip.tripStartTime);
    final completionTimeFormatted =
        IstDateTimeHelper.formatDateTime(trip.completedAt);

    return Container(
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(
          top: BorderSide(color: themeColors.border, width: 1),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag Handle
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Trip Details',
                    style: TextStyle(
                      color: themeColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      color: themeColors.textMuted,
                      size: 20,
                    ),
                    visualDensity: VisualDensity.compact,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              Divider(height: 20, color: themeColors.divider),
              // Order ID row
              _buildDetailRow(
                context: context,
                label: 'Order ID',
                value: '#ORD-${trip.orderId}',
                isBold: true,
              ),
              const SizedBox(height: 12),
              // Trip Status row
              _buildStatusRow(context),
              const SizedBox(height: 12),
              // Start Time row
              _buildDetailRow(
                context: context,
                label: 'Start Time',
                value: startTimeFormatted,
              ),
              const SizedBox(height: 12),
              // Completion Time row (PRD Section 4)
              _buildDetailRow(
                context: context,
                label: 'Completion Time',
                value: completionTimeFormatted,
              ),
              const SizedBox(height: 12),
              // Driver Earning row (read-only driver split)
              _buildDetailRow(
                context: context,
                label: 'Driver Earning',
                value: IstDateTimeHelper.formatCurrency(trip.driverEarning),
                valueColor: isDark
                    ? const Color(0xFF34D399)
                    : const Color(0xFF059669),
                isBold: true,
              ),
              const SizedBox(height: 12),
              // Total Expense row (tappable only when has expenses > 0)
              _buildExpenseRow(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow({
    required BuildContext context,
    required String label,
    required String value,
    Color? valueColor,
    bool isBold = false,
  }) {
    final themeColors = context.appColors;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: themeColors.textMuted,
            fontSize: 13.5,
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? themeColors.textPrimary,
            fontSize: 14,
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildStatusRow(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final bg = isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5);
    final text = isDark ? const Color(0xFF34D399) : const Color(0xFF047857);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Status',
          style: TextStyle(
            color: themeColors.textMuted,
            fontSize: 13.5,
            fontWeight: FontWeight.w500,
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            'COMPLETED',
            style: TextStyle(
              color: text,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildExpenseRow(BuildContext context) {
    final themeColors = context.appColors;
    final hasExp = trip.hasExpenses;
    final formattedExpense = IstDateTimeHelper.formatCurrency(trip.totalExpense);

    final content = Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Text(
                'Total Expense',
                style: TextStyle(
                  color: themeColors.textMuted,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (hasExp) ...[
                const SizedBox(width: 6),
                Icon(
                  Icons.info_outline_rounded,
                  size: 14,
                  color: themeColors.primaryButton,
                ),
              ],
            ],
          ),
          Row(
            children: [
              Text(
                formattedExpense,
                style: TextStyle(
                  color: themeColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (hasExp) ...[
                const SizedBox(width: 4),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 18,
                  color: themeColors.textMuted,
                ),
              ],
            ],
          ),
        ],
      ),
    );

    // PRD Section 7: If trip has no expenses, row is strictly non-tappable
    if (!hasExp) {
      return content;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => ExpenseListSheet.show(context, trip),
        borderRadius: BorderRadius.circular(8),
        child: content,
      ),
    );
  }
}
