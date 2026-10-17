import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/routing/route_names.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/widgets/app_loading_indicator.dart';
import '../domain/wallet_models.dart';
import 'controllers/wallet_controller.dart';
import 'widgets/past_months_section.dart';
import 'widgets/trip_details_bottom_sheet.dart';
import 'widgets/wallet_balance_card.dart';
import 'widgets/wallet_date_filter_bar.dart';
import 'widgets/wallet_trip_row.dart';

/// Driver Wallet & Earnings Screen (PRD D-12, rows 63-64).
/// Displays live current-month balance, date-filtered trip list,
/// and past-month settlements (Paid/Pending).
class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> {
  Future<void> _onRefresh() async {
    // Refresh both live trips and past months data
    ref.invalidate(allWalletTripsProvider);
    ref.invalidate(pastMonthsProvider);
    await Future.delayed(const Duration(milliseconds: 300));
  }

  void _handleBack(BuildContext context) {
    try {
      if (context.canPop()) {
        context.pop();
        return;
      }
    } catch (_) {}

    try {
      final navState = rootNavigatorKey.currentState;
      if (navState != null && navState.canPop()) {
        navState.pop();
        return;
      }
    } catch (_) {}

    try {
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
        return;
      }
    } catch (_) {}

    context.go(RouteNames.home);
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;

    final balance = ref.watch(currentMonthBalanceProvider);
    final selectedFilter = ref.watch(walletDateFilterProvider);
    final customRange = ref.watch(customDateRangeProvider);
    final filteredTripsAsync = ref.watch(filteredWalletTripsProvider);
    final pastMonthsAsync = ref.watch(pastMonthsProvider);

    final currentNowIST = IstDateTimeHelper.nowIST();

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
          tooltip: 'Back',
          onPressed: () => _handleBack(context),
        ),
        title: Text(
          'Wallet',
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        centerTitle: false,
      ),
      body: SafeArea(
        child: RefreshIndicator(
          color: themeColors.primaryButton,
          backgroundColor: themeColors.cardBackground,
          onRefresh: _onRefresh,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            children: [
              // 1. Top Balance Card (Always shows CURRENT MONTH total only)
              WalletBalanceCard(
                balance: balance,
                currentDateTime: currentNowIST,
              ),
              const SizedBox(height: 16),

              // 2. Date Filter Bar (Filters the trip list only)
              WalletDateFilterBar(
                selectedFilter: selectedFilter,
                customRange: customRange,
                onFilterSelected: (newFilter) {
                  ref.read(walletDateFilterProvider.notifier).state = newFilter;
                },
                onCustomRangeSelected: (newRange) {
                  ref.read(customDateRangeProvider.notifier).state = newRange;
                },
              ),
              const SizedBox(height: 20),

              // 3. Trip List Section Heading
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Trips',
                    style: TextStyle(
                      color: themeColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // 4. Trip List Body
              filteredTripsAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 30.0),
                  child: Center(child: AppLoadingIndicator()),
                ),
                error: (error, _) => Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: themeColors.cardBackground,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: themeColors.border),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Failed to load trips',
                        style: TextStyle(
                          color: themeColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () => ref.invalidate(allWalletTripsProvider),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
                data: (trips) {
                  if (trips.isEmpty) {
                    return _buildEmptyState(context);
                  }

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: trips.length,
                    itemBuilder: (context, index) {
                      final trip = trips[index];
                      return WalletTripRow(
                        trip: trip,
                        onTap: () {
                          TripDetailsBottomSheet.show(context, trip);
                        },
                      );
                    },
                  );
                },
              ),
              const SizedBox(height: 24),

              // 5. Past Months Section (Paid & Pending settlement records)
              pastMonthsAsync.when(
                loading: () => const PastMonthsSection(
                  pastMonths: [],
                  isLoading: true,
                ),
                error: (_, __) => const PastMonthsSection(
                  pastMonths: [],
                ),
                data: (months) => PastMonthsSection(
                  pastMonths: months,
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  /// Neutral empty state per PRD: neutral icon with the word "No trips"
  Widget _buildEmptyState(BuildContext context) {
    final themeColors = context.appColors;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: themeColors.border),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.receipt_long_outlined,
            size: 38,
            color: themeColors.textMuted,
          ),
          const SizedBox(height: 8),
          Text(
            'No trips',
            style: TextStyle(
              color: themeColors.textMuted,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
