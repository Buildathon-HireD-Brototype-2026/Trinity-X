import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/widgets/app_loading_indicator.dart';
import '../domain/trip_model.dart';
import 'controllers/current_trip_provider.dart';

/// Screen displaying the active Trip and its associated B2B Order details
/// matching PostgreSQL schema (`orders`, `trips`, `companies`, `expenses`)
/// and requirements in PRD D-04, D-05, D-07, D-08, D-09.
class TripDetailsScreen extends ConsumerStatefulWidget {
  const TripDetailsScreen({super.key});

  @override
  ConsumerState<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends ConsumerState<TripDetailsScreen> {
  final _otpController = TextEditingController();
  String? _otpError;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  String _formatTime(DateTime utcTime) {
    final kolkata = utcTime.add(const Duration(hours: 5, minutes: 30));
    return DateFormat('hh:mm a').format(kolkata);
  }

  String _formatDate(DateTime utcTime) {
    final kolkata = utcTime.add(const Duration(hours: 5, minutes: 30));
    return DateFormat('EEE, d MMM yyyy').format(kolkata);
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final assignedTripsAsync = ref.watch(assignedTripsProvider);
    final selectedTrip = ref.watch(selectedTripProvider);

    return Scaffold(
      backgroundColor: themeColors.pageBackground,
      appBar: AppBar(
        backgroundColor: themeColors.cardBackground,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: themeColors.textPrimary,
            size: 20,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Trip Details',
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          if (selectedTrip != null)
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: selectedTrip.isOngoing
                        ? (isDark ? const Color(0xFF1E3A8A) : const Color(0xFFDBEAFE))
                        : (isDark ? const Color(0xFF78350F) : const Color(0xFFFEF3C7)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    selectedTrip.status.toUpperCase(),
                    style: TextStyle(
                      color: selectedTrip.isOngoing
                          ? (isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8))
                          : (isDark ? const Color(0xFFFBBF24) : const Color(0xFFB45309)),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: assignedTripsAsync.when(
          loading: () => const Center(child: AppLoadingIndicator()),
          error: (err, _) => Center(
            child: Text(
              'Failed to load trips: $err',
              style: TextStyle(color: themeColors.textPrimary),
            ),
          ),
          data: (trips) {
            if (trips.isEmpty || selectedTrip == null) {
              return _buildEmptyState(context);
            }

            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Multi-Trip Switcher (PRD D-04 allows up to 2 active trips)
                  if (trips.length > 1) ...[
                    _buildTripSelectorTabs(context, ref, trips, selectedTrip),
                    const SizedBox(height: 16),
                  ],

                  // Card 1: B2B Order & Partner Company Info
                  _buildOrderOverviewCard(context, selectedTrip),
                  const SizedBox(height: 16),

                  // Card 2: Pickup, Dropoff & Route Schedule
                  _buildRouteScheduleCard(context, selectedTrip),
                  const SizedBox(height: 16),

                  // Card 3: Payout & Commission Breakdown
                  _buildFinancialCard(context, selectedTrip),
                  const SizedBox(height: 16),

                  // Card 4: Trip Expenses (PRD D-08)
                  _buildExpensesCard(context, selectedTrip),
                  const SizedBox(height: 24),

                  // Action Button(s) based on Trip Status
                  _buildActionControls(context, selectedTrip),
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  /// Multi-Trip Selector Pills
  Widget _buildTripSelectorTabs(
    BuildContext context,
    WidgetRef ref,
    List<TripModel> trips,
    TripModel selectedTrip,
  ) {
    final themeColors = context.appColors;

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: themeColors.border),
      ),
      child: Row(
        children: trips.map((trip) {
          final isSelected = trip.tripId == selectedTrip.tripId;
          return Expanded(
            child: InkWell(
              onTap: () {
                ref.read(selectedTripIdProvider.notifier).select(trip.tripId);
              },
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? themeColors.purpleAccent : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(
                    'Trip ${trip.tripId} • ${trip.status}',
                    style: TextStyle(
                      color: isSelected ? Colors.white : themeColors.textSecondary,
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  /// Card 1: B2B Partner Order & Contact Person
  Widget _buildOrderOverviewCard(BuildContext context, TripModel trip) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

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
          // Order Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: themeColors.purpleTint,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.business_rounded,
                      color: themeColors.purpleAccent,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        trip.companyName,
                        style: TextStyle(
                          color: themeColors.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Corporate Order Ref: ORD-${trip.orderId}',
                        style: TextStyle(
                          color: themeColors.textSecondary,
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                icon: Icon(Icons.copy_rounded, color: themeColors.textMuted, size: 18),
                tooltip: 'Copy Order ID',
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: 'ORD-${trip.orderId}'));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Order ID copied to clipboard'),
                      duration: Duration(seconds: 1),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 16),
          Divider(color: themeColors.divider, height: 1),
          const SizedBox(height: 16),

          // Client Contact Row
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'PASSENGER / CONTACT',
                      style: TextStyle(
                        color: themeColors.textMuted,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      trip.contactName,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      trip.contactPhone,
                      style: TextStyle(
                        color: themeColors.textSecondary,
                        fontSize: 12.5,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
              // Call action button
              IconButton(
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981).withValues(alpha: 0.12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.phone_rounded, color: Color(0xFF10B981), size: 20),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Calling client ${trip.contactName} (${trip.contactPhone})...'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
              const SizedBox(width: 8),
              // Message action button
              IconButton(
                style: IconButton.styleFrom(
                  backgroundColor: themeColors.purpleTint,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: Icon(Icons.chat_bubble_outline_rounded, color: themeColors.purpleAccent, size: 20),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Messaging client ${trip.contactName}...'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
            ],
          ),

          // Notes / Instructions callout if present
          if (trip.notes != null && trip.notes!.isNotEmpty) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: themeColors.innerBox,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: themeColors.border),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.notes_rounded, color: themeColors.purpleAccent, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      trip.notes!,
                      style: TextStyle(
                        color: themeColors.textSecondary,
                        fontSize: 12,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Card 2: Pickup and Dropoff Timeline & Route
  Widget _buildRouteScheduleCard(BuildContext context, TripModel trip) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

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
                'ROUTE & SCHEDULE',
                style: TextStyle(
                  color: themeColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: themeColors.purpleTint,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _formatDate(trip.pickupTime),
                  style: TextStyle(
                    color: themeColors.purpleAccent,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Pickup Location Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Container(
                    width: 14,
                    height: 14,
                    decoration: const BoxDecoration(
                      color: Color(0xFF10B981),
                      shape: BoxShape.circle,
                    ),
                  ),
                  Container(
                    width: 2,
                    height: 48,
                    color: themeColors.border,
                  ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'PICKUP SPOT',
                          style: TextStyle(
                            color: themeColors.textMuted,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          _formatTime(trip.pickupTime),
                          style: const TextStyle(
                            color: Color(0xFF10B981),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      trip.pickupSpot,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Dropoff Location Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: const BoxDecoration(
                  color: Color(0xFFEF4444),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'DROPOFF SPOT',
                          style: TextStyle(
                            color: themeColors.textMuted,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          '~${trip.estimatedReachMinutes} mins ETA',
                          style: TextStyle(
                            color: themeColors.purpleAccent,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      trip.dropoffSpot,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Card 3: Payout and Billing Breakdown (PRD 5.4 / database.md `trip_payrolls`)
  Widget _buildFinancialCard(BuildContext context, TripModel trip) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

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
            'FINANCIAL SUMMARY & PAYOUT',
            style: TextStyle(
              color: themeColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 14),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total Corporate Billing Fare',
                style: TextStyle(color: themeColors.textSecondary, fontSize: 13),
              ),
              Text(
                '₹${trip.amount.toStringAsFixed(2)}',
                style: TextStyle(
                  color: themeColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Driver Payout (30% Split)',
                style: TextStyle(
                  color: themeColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                '₹${trip.driverShare.toStringAsFixed(2)}',
                style: TextStyle(
                  color: themeColors.purpleAccent,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: themeColors.purpleTint.withValues(alpha: isDark ? 0.35 : 0.6),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(Icons.account_balance_wallet_rounded, color: themeColors.purpleAccent, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Automatically credited to your Driver Wallet upon OTP trip completion.',
                    style: TextStyle(
                      color: themeColors.purpleAccent,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Card 4: Trip Expenses (PRD D-08)
  Widget _buildExpensesCard(BuildContext context, TripModel trip) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final totalExpenses = trip.expenses.fold<double>(0.0, (sum, e) => sum + e.amount);

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
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'TRIP EXPENSES',
                    style: TextStyle(
                      color: themeColors.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${trip.expenses.length} Logged • Total ₹${totalExpenses.toStringAsFixed(2)}',
                    style: TextStyle(
                      color: themeColors.textSecondary,
                      fontSize: 11.5,
                    ),
                  ),
                ],
              ),
              if (trip.isOngoing)
                TextButton.icon(
                  icon: const Icon(Icons.add_rounded, size: 16),
                  label: const Text('Add Expense', style: TextStyle(fontSize: 12)),
                  onPressed: () => _showAddExpenseDialog(context, trip),
                ),
            ],
          ),
          const SizedBox(height: 12),

          if (trip.expenses.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              alignment: Alignment.center,
              child: Text(
                'No trip expenses logged yet.',
                style: TextStyle(color: themeColors.textMuted, fontSize: 12),
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
                      Row(
                        children: [
                          Icon(Icons.receipt_long_rounded, color: themeColors.purpleAccent, size: 18),
                          const SizedBox(width: 10),
                          Text(
                            expense.description,
                            style: TextStyle(
                              color: themeColors.textPrimary,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '₹${expense.amount.toStringAsFixed(2)}',
                        style: TextStyle(
                          color: themeColors.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  /// Action Controls for Start Trip / Close Trip with OTP
  Widget _buildActionControls(BuildContext context, TripModel trip) {
    final themeColors = context.appColors;

    if (trip.isAssigned) {
      return SizedBox(
        height: 52,
        child: ElevatedButton.icon(
          icon: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 22),
          label: const Text(
            'Start Trip',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10B981),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
          onPressed: _isSubmitting
              ? null
              : () async {
                  setState(() => _isSubmitting = true);
                  await ref.read(tripRepositoryProvider).startTrip(trip.tripId);
                  setState(() => _isSubmitting = false);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Trip started! Status set to Ongoing.'),
                        backgroundColor: Color(0xFF10B981),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                },
        ),
      );
    }

    if (trip.isOngoing) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 52,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.check_circle_outline_rounded, color: Colors.white, size: 22),
              label: const Text(
                'Complete & Close Trip (OTP)',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: themeColors.primaryButton,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              onPressed: () => _showCloseTripModal(context, trip),
            ),
          ),
          const SizedBox(height: 10),
          Center(
            child: Text(
              'Trip completion requires 6-digit OTP from passenger',
              style: TextStyle(color: themeColors.textMuted, fontSize: 11),
            ),
          ),
        ],
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Center(
        child: Text(
          'Trip Completed & Closed',
          style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  /// Empty State when No Trips are Assigned
  Widget _buildEmptyState(BuildContext context) {
    final themeColors = context.appColors;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: themeColors.purpleTint,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.directions_car_rounded,
                color: themeColors.purpleAccent,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'No Trips Currently Assigned',
              style: TextStyle(
                color: themeColors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'When the HireD Admin assigns corporate transport orders to you, they will appear here with full pickup, dropoff, and client details.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: themeColors.textSecondary,
                fontSize: 13,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.pop(),
              child: const Text('Back to Dashboard'),
            ),
          ],
        ),
      ),
    );
  }

  /// Add Expense Dialog (PRD D-08)
  void _showAddExpenseDialog(BuildContext context, TripModel trip) {
    final descController = TextEditingController();
    final amountController = TextEditingController();
    final themeColors = context.appColors;

    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: themeColors.cardBackground,
        title: Text(
          'Log Trip Expense',
          style: TextStyle(color: themeColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 17),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: descController,
              decoration: const InputDecoration(
                labelText: 'Expense Description',
                hintText: 'e.g. Toll, Fuel, Parking',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Amount (₹)',
                hintText: 'e.g. 150.00',
                prefixText: '₹ ',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final desc = descController.text.trim();
              final amt = double.tryParse(amountController.text.trim());
              if (desc.isEmpty || amt == null || amt <= 0) return;

              Navigator.of(dialogCtx).pop();
              await ref.read(tripRepositoryProvider).addExpense(trip.tripId, desc, amt);

              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Added expense: $desc (₹${amt.toStringAsFixed(2)})'),
                    backgroundColor: const Color(0xFF10B981),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  /// OTP Close Trip Modal (PRD D-09)
  void _showCloseTripModal(BuildContext context, TripModel trip) {
    final themeColors = context.appColors;
    _otpController.clear();
    _otpError = null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          return Container(
            padding: EdgeInsets.only(
              left: 24,
              right: 24,
              top: 20,
              bottom: MediaQuery.of(sheetCtx).viewInsets.bottom + 24,
            ),
            decoration: BoxDecoration(
              color: themeColors.cardBackground,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border.all(color: themeColors.border),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: themeColors.divider,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Complete Trip',
                  style: TextStyle(
                    color: themeColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Ask passenger ${trip.contactName} for their 6-digit trip completion OTP code.',
                  style: TextStyle(color: themeColors.textSecondary, fontSize: 12.5),
                ),
                const SizedBox(height: 16),

                // Debug helper banner
                if (kDebugMode)
                  Container(
                    padding: const EdgeInsets.all(10),
                    margin: const EdgeInsets.only(bottom: 14),
                    decoration: BoxDecoration(
                      color: themeColors.purpleTint,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'Demo Client OTP: ${trip.otp}',
                      style: TextStyle(
                        color: themeColors.purpleAccent,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),

                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(6),
                  ],
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 24,
                    letterSpacing: 8,
                    fontWeight: FontWeight.bold,
                  ),
                  decoration: InputDecoration(
                    hintText: '••••••',
                    errorText: _otpError,
                  ),
                ),
                const SizedBox(height: 20),

                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () async {
                      final entered = _otpController.text.trim();
                      if (entered.length != 6) {
                        setSheetState(() => _otpError = 'Enter complete 6-digit OTP code');
                        return;
                      }

                      final success = await ref
                          .read(tripRepositoryProvider)
                          .closeTripWithOtp(trip.tripId, entered);

                      if (!success) {
                        setSheetState(() => _otpError = 'Invalid OTP code. Please check with client.');
                        return;
                      }

                      if (sheetCtx.mounted) Navigator.of(sheetCtx).pop();

                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Trip completed successfully! ₹${trip.driverShare.toStringAsFixed(2)} credited to your wallet.',
                            ),
                            backgroundColor: const Color(0xFF10B981),
                            behavior: SnackBarBehavior.floating,
                            duration: const Duration(seconds: 4),
                          ),
                        );
                      }
                    },
                    child: const Text('Verify OTP & Complete Trip'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
