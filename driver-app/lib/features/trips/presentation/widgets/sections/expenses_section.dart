import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:driver_app/core/theme/app_theme_colors.dart';
import 'package:driver_app/features/trips/domain/trip_model.dart';

/// Expenses Section showing total amount and item count, expandable list of
/// expenses, quick logging chips, and "Add Expense" button.
class ExpensesSection extends StatefulWidget {
  final TripModel trip;
  final VoidCallback onAddExpense;
  final Function(String category) onQuickExpense;
  final Function(TripExpenseModel expense) onDeleteExpense;

  const ExpensesSection({
    super.key,
    required this.trip,
    required this.onAddExpense,
    required this.onQuickExpense,
    required this.onDeleteExpense,
  });

  @override
  State<ExpensesSection> createState() => _ExpensesSectionState();
}

class _ExpensesSectionState extends State<ExpensesSection> {
  bool _isExpanded = false;

  String _formatTime(DateTime utcTime) {
    final kolkata = utcTime.add(const Duration(hours: 5, minutes: 30));
    return DateFormat('hh:mm a').format(kolkata);
  }

  Widget _getExpenseCategoryIcon(String description, AppThemeColors themeColors) {
    final lower = description.toLowerCase();
    IconData iconData = Icons.receipt_long_rounded;
    Color iconColor = const Color(0xFF10B981);

    if (lower.contains('toll')) {
      iconData = Icons.toll_rounded;
      iconColor = const Color(0xFF3B82F6);
    } else if (lower.contains('parking')) {
      iconData = Icons.local_parking_rounded;
      iconColor = const Color(0xFF8B5CF6);
    } else if (lower.contains('fuel')) {
      iconData = Icons.local_gas_station_rounded;
      iconColor = const Color(0xFFF59E0B);
    }

    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: iconColor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(iconData, color: iconColor, size: 16),
    );
  }

  Widget _buildQuickExpenseChip(
    BuildContext context,
    String label,
    IconData icon,
  ) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return ActionChip(
      avatar: Icon(icon, size: 16, color: themeColors.purpleAccent),
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: themeColors.textPrimary,
        ),
      ),
      backgroundColor: isDark ? themeColors.innerBox : const Color(0xFFF3EDF9),
      side: BorderSide(color: themeColors.border),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      onPressed: () => widget.onQuickExpense(label),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final trip = widget.trip;

    final isCancelled = trip.status.toUpperCase() == 'CANCELLED';
    if (isCancelled && trip.expenses.isEmpty) {
      return const SizedBox.shrink();
    }

    final totalExpenses = trip.expenses.fold<double>(0.0, (sum, e) => sum + e.amount);
    final count = trip.expenses.length;
    final countLabel = count == 1 ? '1 item' : '$count items';

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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'EXPENSES',
                style: TextStyle(
                  color: themeColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              if (trip.isOngoing)
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(0, 34),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  icon: const Icon(Icons.add_rounded, size: 16),
                  label: const Text('Add Expense', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                  onPressed: widget.onAddExpense,
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Tappable summary header row
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () {
              setState(() {
                _isExpanded = !_isExpanded;
              });
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4.0),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.receipt_long_rounded, color: Color(0xFF10B981), size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '₹${totalExpenses.toStringAsFixed(2)}',
                          style: TextStyle(
                            color: themeColors.textPrimary,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '$countLabel • Tap to ${ _isExpanded ? 'hide' : 'view' } list',
                          style: TextStyle(
                            color: themeColors.textMuted,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    _isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    color: themeColors.unselectedIcon,
                    size: 24,
                  ),
                ],
              ),
            ),
          ),

          // Quick category tap chips for fast entry when ongoing
          if (trip.isOngoing) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                _buildQuickExpenseChip(context, 'Toll', Icons.toll_rounded),
                _buildQuickExpenseChip(context, 'Parking', Icons.local_parking_rounded),
                _buildQuickExpenseChip(context, 'Fuel', Icons.local_gas_station_rounded),
                _buildQuickExpenseChip(context, 'Other', Icons.more_horiz_rounded),
              ],
            ),
          ],

          // Expandable list of logged expenses
          if (_isExpanded) ...[
            const SizedBox(height: 14),
            Divider(color: themeColors.divider, height: 1),
            const SizedBox(height: 12),

            if (trip.expenses.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12.0),
                child: Center(
                  child: Text(
                    'No expenses logged yet.',
                    style: TextStyle(
                      color: themeColors.textSecondary,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              )
            else
              ...trip.expenses.map((expense) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: themeColors.innerBox,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: themeColors.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              _getExpenseCategoryIcon(expense.description, themeColors),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      expense.description,
                                      style: TextStyle(
                                        color: themeColors.textPrimary,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (expense.createdAt != null)
                                      Text(
                                        _formatTime(expense.createdAt!),
                                        style: TextStyle(
                                          color: themeColors.textMuted,
                                          fontSize: 11,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        Row(
                          children: [
                            Text(
                              '₹${expense.amount.toStringAsFixed(2)}',
                              style: TextStyle(
                                color: themeColors.textPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (trip.isOngoing && expense.expenseId != null) ...[
                              const SizedBox(width: 6),
                              IconButton(
                                icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 18),
                                tooltip: 'Delete Expense',
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                                onPressed: () => widget.onDeleteExpense(expense),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
          ],
        ],
      ),
    );
  }
}
