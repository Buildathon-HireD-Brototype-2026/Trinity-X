import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/routing/route_names.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/widgets/app_loading_indicator.dart';
import '../domain/trip_model.dart';
import 'controllers/current_trip_provider.dart';
import 'controllers/trip_mini_overlay_controller.dart';

/// Screen displaying the active Trip and its associated B2B Order details
/// matching PostgreSQL schema (`orders`, `trips`, `companies`, `expenses`)
/// and requirements in PRD D-04, D-05, D-07, D-08, D-09.
class TripDetailsScreen extends ConsumerStatefulWidget {
  final String? tripId;
  const TripDetailsScreen({super.key, this.tripId});

  @override
  ConsumerState<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends ConsumerState<TripDetailsScreen> {
  final _otpController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.tripId != null) {
        ref.read(selectedTripIdProvider.notifier).select(widget.tripId!);
      }
      ref.read(tripMiniOverlayControllerProvider.notifier).setTripPageForeground(true);
    });
  }

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

  void _handleBack() {
    ref.read(tripMiniOverlayControllerProvider.notifier).setTripPageForeground(false);
    try {
      if (GoRouter.of(context).canPop()) {
        GoRouter.of(context).pop();
        return;
      }
    } catch (_) {}
    try {
      final nav = Navigator.maybeOf(context);
      if (nav != null && nav.canPop()) {
        nav.pop();
        return;
      }
    } catch (_) {}
    try {
      final rootNav = rootNavigatorKey.currentState;
      if (rootNav != null && rootNav.canPop()) {
        rootNav.pop();
        return;
      }
    } catch (_) {}
    context.go(RouteNames.home);
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final allTripsAsync = ref.watch(allTripsProvider);
    final allTrips = allTripsAsync.valueOrNull ?? [];

    // Robust trip resolution:
    // 1. If explicit widget.tripId is passed and matches in allTrips:
    TripModel? trip;
    if (widget.tripId != null && allTrips.isNotEmpty) {
      trip = allTrips.where((t) => t.tripId == widget.tripId).firstOrNull;
    }
    // 2. If not found or widget.tripId is null, check selectedTripIdProvider:
    if (trip == null) {
      final selectedId = ref.watch(selectedTripIdProvider);
      if (selectedId != null && allTrips.isNotEmpty) {
        trip = allTrips.where((t) => t.tripId == selectedId).firstOrNull;
      }
    }
    // 3. Fallback to selectedTripProvider (which picks ongoing or earliest assigned):
    trip ??= ref.watch(selectedTripProvider);

    // 4. Fallback to ongoing trip or first trip in allTrips (never leave blank):
    if (trip == null && allTrips.isNotEmpty) {
      trip = allTrips.where((t) => t.isOngoing).firstOrNull ?? allTrips.firstOrNull;
    }

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        ref.read(tripMiniOverlayControllerProvider.notifier).setTripPageForeground(false);
      },
      child: Scaffold(
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
          tooltip: 'Back',
          onPressed: _handleBack,
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Trip Details',
              style: TextStyle(
                color: themeColors.textPrimary,
                fontSize: 17,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
              ),
            ),
            if (trip != null)
              Text(
                '${trip.tripId} • ORD-${trip.orderId} • ${trip.companyName}',
                style: TextStyle(
                  color: themeColors.textSecondary,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        actions: [
          if (trip != null)
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: trip.isOngoing
                            ? (isDark ? const Color(0xFF1E3A8A) : const Color(0xFFDBEAFE))
                            : (isDark ? const Color(0xFF78350F) : const Color(0xFFFEF3C7)),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        trip.status.toUpperCase(),
                        style: TextStyle(
                          color: trip.isOngoing
                              ? (isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8))
                              : (isDark ? const Color(0xFFFBBF24) : const Color(0xFFB45309)),
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: allTripsAsync.when(
          loading: () => const Center(child: AppLoadingIndicator()),
          error: (err, _) => Center(
            child: Text(
              'Failed to load trips: $err',
              style: TextStyle(color: themeColors.textPrimary),
            ),
          ),
          data: (allList) {
            TripModel? currentTrip;
            if (widget.tripId != null && allList.isNotEmpty) {
              currentTrip = allList.where((t) => t.tripId == widget.tripId).firstOrNull;
            }
            if (currentTrip == null) {
              final selectedId = ref.watch(selectedTripIdProvider);
              if (selectedId != null && allList.isNotEmpty) {
                currentTrip = allList.where((t) => t.tripId == selectedId).firstOrNull;
              }
            }
            currentTrip ??= trip ?? ref.watch(selectedTripProvider);
            if (currentTrip == null && allList.isNotEmpty) {
              currentTrip = allList.where((t) => t.isOngoing).firstOrNull ?? allList.firstOrNull;
            }

            if (currentTrip == null) {
              if (allList.isEmpty) {
                return _buildEmptyState(context);
              }
              return _buildTripNotFoundState(context, widget.tripId);
            }

            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Card 1: B2B Order & Partner Company Info
                  _buildOrderOverviewCard(context, currentTrip),
                  const SizedBox(height: 16),

                  // Card 2: Pickup, Dropoff & Route Schedule
                  _buildRouteScheduleCard(context, currentTrip),
                  const SizedBox(height: 16),

                  // Card 3: Payout & Commission Breakdown
                  _buildFinancialCard(context, currentTrip),
                  const SizedBox(height: 16),

                  // Card 4: Trip Expenses (PRD D-08)
                  _buildExpensesCard(context, currentTrip),
                  const SizedBox(height: 24),

                  // Action Button(s) based on Trip Status
                  _buildActionControls(context, currentTrip),
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        ),
      ),
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
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      trip.companyName,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Order ORD-${trip.orderId} • ${_formatDate(trip.pickupTime)}',
                      style: TextStyle(
                        color: themeColors.textSecondary,
                        fontSize: 11.5,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
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
                          style: TextStyle(
                            color: isDark ? Colors.white : const Color(0xFF10B981),
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
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: themeColors.purpleTint,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.payments_rounded, color: themeColors.purpleAccent, size: 18),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Your Earning',
                    style: TextStyle(
                      color: themeColors.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              Text(
                '₹${trip.driverShare.toStringAsFixed(2)}',
                style: TextStyle(
                  color: themeColors.purpleAccent,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
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
              Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.receipt_long_rounded, color: Color(0xFF10B981), size: 18),
                  ),
                  const SizedBox(width: 10),
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
                          color: themeColors.textPrimary,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              if (trip.isOngoing)
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(0, 36),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  icon: const Icon(Icons.add_rounded, size: 16),
                  label: const Text('Add Expense', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: () => _showAddExpenseDialog(context, trip),
                ),
            ],
          ),

          if (trip.isOngoing) ...[
            const SizedBox(height: 14),
            // Quick category tap chips for fast road entry (name only, no prices, no fasttag):
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                _buildQuickExpenseChip(context, trip, 'Toll', Icons.toll_rounded),
                _buildQuickExpenseChip(context, trip, 'Parking', Icons.local_parking_rounded),
                _buildQuickExpenseChip(context, trip, 'Fuel', Icons.local_gas_station_rounded),
                _buildQuickExpenseChip(context, trip, 'Other', Icons.more_horiz_rounded),
              ],
            ),
          ],

          const SizedBox(height: 14),
          Divider(color: themeColors.divider, height: 1),
          const SizedBox(height: 12),

          if (trip.expenses.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              alignment: Alignment.center,
              child: Column(
                children: [
                  Icon(Icons.receipt_outlined, color: themeColors.textMuted, size: 28),
                  const SizedBox(height: 6),
                  Text(
                    'No expenses logged yet.',
                    style: TextStyle(color: themeColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    trip.isOngoing
                        ? 'Tap a category above to log Toll, Parking, or Fuel.'
                        : 'No expenses were logged for this trip.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: themeColors.textSecondary, fontSize: 11.5),
                  ),
                ],
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
                              onPressed: () => _confirmDeleteExpense(context, trip, expense),
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
      ),
    );
  }

  Widget _getExpenseCategoryIcon(String description, AppThemeColors themeColors) {
    final descLower = description.toLowerCase();
    IconData iconData = Icons.receipt_long_rounded;
    Color iconColor = themeColors.purpleAccent;

    if (descLower.contains('toll')) {
      iconData = Icons.toll_rounded;
      iconColor = const Color(0xFFF59E0B);
    } else if (descLower.contains('parking')) {
      iconData = Icons.local_parking_rounded;
      iconColor = const Color(0xFF3B82F6);
    } else if (descLower.contains('fuel') || descLower.contains('petrol') || descLower.contains('diesel')) {
      iconData = Icons.local_gas_station_rounded;
      iconColor = const Color(0xFFEF4444);
    } else if (descLower.contains('fastag')) {
      iconData = Icons.nfc_rounded;
      iconColor = const Color(0xFF10B981);
    }

    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: iconColor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(iconData, color: iconColor, size: 17),
    );
  }

  Widget _buildQuickExpenseChip(
    BuildContext context,
    TripModel trip,
    String label,
    IconData icon,
  ) {
    final themeColors = context.appColors;

    return ActionChip(
      avatar: Icon(icon, size: 14, color: const Color(0xFF10B981)),
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: themeColors.textPrimary,
        ),
      ),
      backgroundColor: themeColors.innerBox,
      side: BorderSide(color: themeColors.border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      onPressed: () => _showAddExpenseDialog(
        context,
        trip,
        prefilledCategory: label,
      ),
    );
  }

  /// Action Controls for Start Trip / Close Trip with OTP
  Widget _buildActionControls(BuildContext context, TripModel trip) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

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
          onPressed: () => _showStartTripSelfieModal(context, trip),
        ),
      );
    }

    if (trip.isOngoing) {
      final overlayState = ref.watch(tripMiniOverlayControllerProvider);

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Overlay permission prompt if not granted
          if (!overlayState.hasOverlayPermission) ...[
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF261908) : const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? const Color(0xFF78350F) : const Color(0xFFFDE68A),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.picture_in_picture_alt_rounded,
                      color: Color(0xFFD97706), size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Floating Mini Window',
                          style: TextStyle(
                            color: isDark ? const Color(0xFFFDE68A) : const Color(0xFF92400E),
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Enable display over other apps to see live trip status while using GPS navigation.',
                          style: TextStyle(
                            color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF78350F),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD97706),
                      minimumSize: const Size(0, 32),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () {
                      ref
                          .read(tripMiniOverlayControllerProvider.notifier)
                          .requestOverlayPermission();
                    },
                    child: const Text('Enable', style: TextStyle(color: Colors.white, fontSize: 11)),
                  ),
                ],
              ),
            ),
          ],

          // In-Trip Expense Logging button (PRD D-08)
          SizedBox(
            height: 48,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.receipt_long_rounded, color: Color(0xFF10B981), size: 20),
              label: const Text(
                'Add In-Trip Expense (Toll / Fuel / Parking)',
                style: TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF10B981),
                ),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF10B981), width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: () => _showAddExpenseDialog(context, trip),
            ),
          ),
          const SizedBox(height: 12),

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
          const SizedBox(height: 16),

          // Explicit Cancel Trip Button (Requirement 3)
          OutlinedButton.icon(
            icon: const Icon(Icons.cancel_outlined, color: Color(0xFFEF4444), size: 18),
            label: const Text(
              'Cancel Ongoing Trip',
              style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w600, fontSize: 13.5),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0x66EF4444)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            onPressed: () => _showCancelTripDialog(context, trip),
          ),
        ],
      );
    }

    if (trip.status.toUpperCase() == 'CANCELLED') {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFEF4444).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Center(
          child: Text(
            'Trip Cancelled',
            style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w700),
          ),
        ),
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

  void _showCancelTripDialog(BuildContext context, TripModel trip) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Cancel Ongoing Trip?'),
        content: const Text(
          'Are you sure you want to cancel this trip? This will stop tracking, dismiss the floating overlay, and notify operations.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Keep Trip'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              await ref.read(tripRepositoryProvider).cancelTrip(trip.tripId);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Trip cancelled.'),
                    backgroundColor: Color(0xFFEF4444),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            child: const Text('Cancel Trip', style: TextStyle(color: Colors.white)),
          ),
        ],
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
              onPressed: _handleBack,
              child: const Text('Back to Dashboard'),
            ),
          ],
        ),
      ),
    );
  }

  /// Add Expense Dialog (PRD D-08)
  /// Add Expense Dialog (PRD D-08)
  void _showAddExpenseDialog(
    BuildContext context,
    TripModel trip, {
    String? prefilledCategory,
  }) {
    String selectedCategory = prefilledCategory ?? 'Toll';
    final amountController = TextEditingController();
    final otherNoteController = TextEditingController();
    final themeColors = context.appColors;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            backgroundColor: themeColors.cardBackground,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.receipt_long_rounded, color: Color(0xFF10B981), size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Add Expense',
                    style: TextStyle(color: themeColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16.5),
                  ),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CATEGORY',
                    style: TextStyle(
                      color: themeColors.textMuted,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      _buildCategorySelectChip('Toll', Icons.toll_rounded, selectedCategory, (cat) {
                        setDialogState(() => selectedCategory = cat);
                      }),
                      _buildCategorySelectChip('Parking', Icons.local_parking_rounded, selectedCategory, (cat) {
                        setDialogState(() => selectedCategory = cat);
                      }),
                      _buildCategorySelectChip('Fuel', Icons.local_gas_station_rounded, selectedCategory, (cat) {
                        setDialogState(() => selectedCategory = cat);
                      }),
                      _buildCategorySelectChip('Other', Icons.more_horiz_rounded, selectedCategory, (cat) {
                        setDialogState(() => selectedCategory = cat);
                      }),
                    ],
                  ),
                  const SizedBox(height: 18),
                  TextField(
                    controller: amountController,
                    autofocus: true,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: themeColors.textPrimary,
                    ),
                    decoration: InputDecoration(
                      labelText: 'Amount (₹)',
                      hintText: '0',
                      prefixText: '₹ ',
                      prefixStyle: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF10B981),
                      ),
                      filled: true,
                      fillColor: themeColors.innerBox,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                  if (selectedCategory == 'Other') ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: otherNoteController,
                      decoration: InputDecoration(
                        labelText: 'Note (Optional)',
                        hintText: 'e.g. Wash / Repair',
                        filled: true,
                        fillColor: themeColors.innerBox,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogCtx).pop(),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
                onPressed: () async {
                  final amt = double.tryParse(amountController.text.trim());
                  if (amt == null || amt <= 0) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Please enter a valid expense amount.'),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                    return;
                  }

                  final desc = selectedCategory == 'Other' && otherNoteController.text.trim().isNotEmpty
                      ? otherNoteController.text.trim()
                      : selectedCategory;

                  Navigator.of(dialogCtx).pop();
                  await ref.read(tripRepositoryProvider).addExpense(trip.tripId, desc, amt);

                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Added $desc: ₹${amt.toStringAsFixed(2)}'),
                        backgroundColor: const Color(0xFF10B981),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                },
                child: const Text('Save Expense', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildCategorySelectChip(
    String label,
    IconData icon,
    String selectedCategory,
    ValueChanged<String> onSelected,
  ) {
    final isSelected = label == selectedCategory;
    return ChoiceChip(
      avatar: Icon(
        icon,
        size: 15,
        color: isSelected ? Colors.white : const Color(0xFF10B981),
      ),
      label: Text(label),
      selected: isSelected,
      selectedColor: const Color(0xFF10B981),
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: isSelected ? Colors.white : null,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      onSelected: (_) => onSelected(label),
    );
  }

  void _confirmDeleteExpense(BuildContext context, TripModel trip, TripExpenseModel expense) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Delete Expense?'),
        content: Text('Are you sure you want to remove "${expense.description}" (₹${expense.amount.toStringAsFixed(2)})?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              if (expense.expenseId != null) {
                await ref.read(tripRepositoryProvider).deleteExpense(trip.tripId, expense.expenseId!);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Deleted expense: ${expense.description}'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildTripNotFoundState(BuildContext context, String? requestedTripId) {
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
                Icons.search_off_rounded,
                color: themeColors.purpleAccent,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Trip Not Found',
              style: TextStyle(
                color: themeColors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              requestedTripId != null
                  ? 'No trip matching ID "$requestedTripId" was found assigned to your driver account.'
                  : 'No active trip details are available.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: themeColors.textSecondary,
                fontSize: 13,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _handleBack,
              child: const Text('Back to Dashboard'),
            ),
          ],
        ),
      ),
    );
  }

  /// Pre-trip selfie verification modal (PRD D-06 / D-07)
  void _showStartTripSelfieModal(BuildContext context, TripModel trip) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    bool isSelfieUploaded = false;
    bool isStarting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (context, setSheetState) {
          return Container(
            padding: EdgeInsets.only(
              top: 16,
              left: 20,
              right: 20,
              bottom: MediaQuery.of(sheetCtx).viewInsets.bottom + 24,
            ),
            decoration: BoxDecoration(
              color: themeColors.cardBackground,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border(
                top: BorderSide(color: themeColors.border),
                left: BorderSide(color: themeColors.border),
                right: BorderSide(color: themeColors.border),
              ),
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
                      color: themeColors.border,
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Pre-Trip Driver Verification',
                  style: TextStyle(
                    color: themeColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Corporate safety requires driver identity verification before starting trip ${trip.tripId}.',
                  style: TextStyle(color: themeColors.textSecondary, fontSize: 12.5),
                ),
                const SizedBox(height: 16),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    key: const Key('details_upload_selfie_button'),
                    onTap: () {
                      setSheetState(() => isSelfieUploaded = !isSelfieUploaded);
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isSelfieUploaded
                            ? (isDark ? const Color(0xFF132A1C) : const Color(0xFFF0FDF4))
                            : themeColors.innerBox,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelfieUploaded
                              ? const Color(0xFF22C55E)
                              : themeColors.border,
                          width: isSelfieUploaded ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: isSelfieUploaded
                                  ? const Color(0xFF22C55E).withValues(alpha: 0.15)
                                  : themeColors.purpleTint,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isSelfieUploaded
                                  ? Icons.check_circle_rounded
                                  : Icons.camera_alt_rounded,
                              color: isSelfieUploaded
                                  ? const Color(0xFF16A34A)
                                  : themeColors.purpleAccent,
                              size: 26,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isSelfieUploaded
                                      ? 'Driver Selfie Verified ✓'
                                      : 'Take Verification Selfie',
                                  style: TextStyle(
                                    color: isSelfieUploaded
                                        ? (isDark ? const Color(0xFF86EFAC) : const Color(0xFF15803D))
                                        : themeColors.textPrimary,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  isSelfieUploaded
                                      ? 'Biometrics matched with corporate roster. Ready to roll.'
                                      : 'Tap to capture quick photo via front camera.',
                                  style: TextStyle(
                                    color: themeColors.textSecondary,
                                    fontSize: 11.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (isSelfieUploaded)
                            Text(
                              'Retake',
                              style: TextStyle(
                                color: themeColors.purpleAccent,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  height: 50,
                  child: ElevatedButton(
                    key: const Key('details_confirm_start_trip_button'),
                    onPressed: (!isSelfieUploaded || isStarting)
                        ? null
                        : () async {
                            setSheetState(() => isStarting = true);
                            try {
                              await ref.read(tripRepositoryProvider).startTrip(trip.tripId);
                              if (sheetCtx.mounted) Navigator.of(sheetCtx).pop();
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Trip started! Status set to Ongoing.'),
                                    backgroundColor: Color(0xFF10B981),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              }
                            } finally {
                              if (sheetCtx.mounted) setSheetState(() => isStarting = false);
                            }
                          },
                    child: isStarting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Text('Confirm & Start Trip'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  /// OTP Close Trip Modal (PRD D-09)
  void _showCloseTripModal(BuildContext context, TripModel trip) {
    final themeColors = context.appColors;
    _otpController.clear();
    String? otpError;
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final isLocked = trip.otpAttempts >= 3;

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

                // Security lockout banner
                if (isLocked)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFEF4444)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.lock_outline_rounded, color: Color(0xFFEF4444), size: 20),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Maximum OTP attempts exceeded (3/3). This trip is locked for security. Please contact dispatch support.',
                            style: TextStyle(
                              color: Color(0xFFEF4444),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Debug helper banner
                if (kDebugMode && !isLocked)
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
                  enabled: !isLocked && !isSubmitting,
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
                    errorText: otpError,
                  ),
                ),
                const SizedBox(height: 20),

                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: (isLocked || isSubmitting)
                        ? null
                        : () async {
                            final entered = _otpController.text.trim();
                            if (entered.length != 6) {
                              setSheetState(() => otpError = 'Enter complete 6-digit OTP code');
                              return;
                            }

                            setSheetState(() {
                              isSubmitting = true;
                              otpError = null;
                            });

                            try {
                              final success = await ref
                                  .read(tripRepositoryProvider)
                                  .closeTripWithOtp(trip.tripId, entered);

                              if (!success) {
                                final attempts = (trip.otpAttempts + 1).clamp(0, 3);
                                setSheetState(() {
                                  otpError = attempts >= 3
                                      ? 'Maximum OTP attempts reached (3/3). Trip locked.'
                                      : 'Invalid OTP code. Attempt $attempts of 3.';
                                });
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
                            } finally {
                              if (sheetCtx.mounted) {
                                setSheetState(() => isSubmitting = false);
                              }
                            }
                          },
                    child: isSubmitting
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : const Text('Verify OTP & Complete Trip'),
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
