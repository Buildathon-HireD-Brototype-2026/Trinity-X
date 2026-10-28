import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/wallet_models.dart';

/// Bottom sheet displaying the list of expenses added for a trip.
/// PRD requirement:
/// Simple rows with: expense name or type, amount, who or what it was added for (reason/category), time added.
/// Total at the bottom.
class ExpenseListSheet extends StatelessWidget {
  final WalletTripRecord trip;

  const ExpenseListSheet({
    super.key,
    required this.trip,
  });

  static Future<void> show(BuildContext context, WalletTripRecord trip) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ExpenseListSheet(trip: trip),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
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
            // Drag Handle
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
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 6, 20, 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Trip Expenses',
                    style: TextStyle(
                      color: themeColors.textPrimary,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
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
            ),
            Divider(height: 1, color: themeColors.divider),
            // Expense List Rows
            Flexible(
              child: trip.expenses.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Center(
                        child: Text(
                          'No expenses',
                          style: TextStyle(color: themeColors.textMuted),
                        ),
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      itemCount: trip.expenses.length,
                      separatorBuilder: (_, __) =>
                          Divider(height: 18, color: themeColors.divider),
                      itemBuilder: (context, index) {
                        final item = trip.expenses[index];
                        return _buildExpenseRow(context, item);
                      },
                    ),
            ),
            Divider(height: 1, color: themeColors.divider),
            // Bottom Total Row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Total Expense',
                    style: TextStyle(
                      color: themeColors.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    IstDateTimeHelper.formatCurrency(trip.totalExpense),
                    style: TextStyle(
                      color: themeColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpenseRow(BuildContext context, WalletExpenseItem item) {
    final themeColors = context.appColors;

    final formattedTime = IstDateTimeHelper.formatTime(item.addedAt);
    final formattedAmount = IstDateTimeHelper.formatCurrency(item.amount);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Expense name/type
              Text(
                item.name,
                style: TextStyle(
                  color: themeColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 3),
              // Who or what it was added for (reason / category) + time
              Text(
                '${item.addedFor} • $formattedTime',
                style: TextStyle(
                  color: themeColors.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        // Amount
        Text(
          formattedAmount,
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 14.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
