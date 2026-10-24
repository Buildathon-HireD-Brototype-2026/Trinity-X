import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:driver_app/core/routing/route_names.dart';
import 'package:driver_app/core/theme/app_theme_colors.dart';
import 'package:driver_app/features/trips/presentation/controllers/current_trip_provider.dart';
import 'package:driver_app/features/wallet/domain/wallet_models.dart';
import 'package:driver_app/features/performance/presentation/controllers/performance_controller.dart';

/// Performance screen showing all-time and current month earnings.
class PerformanceScreen extends ConsumerWidget {
  const PerformanceScreen({super.key});

  void _handleBack(BuildContext context) {
    try {
      if (context.canPop()) {
        context.pop();
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
  Widget build(BuildContext context, WidgetRef ref) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final summaryAsync = ref.watch(performanceSummaryProvider);

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
          'Performance',
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
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
          child: summaryAsync.when(
            loading: () => _buildLoading(context),
            error: (err, _) => _buildError(context, ref, err),
            data: (summary) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Top Earnings Card
                  Container(
                    decoration: BoxDecoration(
                      color: themeColors.cardBackground,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: themeColors.border),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Total Earnings
                        Text(
                          'Total Earnings',
                          style: TextStyle(
                            color: themeColors.textMuted,
                            fontSize: 13.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          IstDateTimeHelper.formatCurrency(summary.totalEarnings),
                          style: TextStyle(
                            color: themeColors.textPrimary,
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                          ),
                        ),
                        Divider(height: 32, color: themeColors.divider),

                        // This Month
                        Text(
                          'This Month',
                          style: TextStyle(
                            color: themeColors.textMuted,
                            fontSize: 13.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          IstDateTimeHelper.formatCurrency(summary.currentMonthEarnings),
                          style: TextStyle(
                            color: isDark ? const Color(0xFF34D399) : const Color(0xFF059669),
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildLoading(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: themeColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 100,
            height: 14,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(height: 10),
          Container(
            width: 160,
            height: 28,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildError(BuildContext context, WidgetRef ref, Object error) {
    final themeColors = context.appColors;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline_rounded, size: 36, color: themeColors.textMuted),
          const SizedBox(height: 12),
          Text(
            'Failed to load performance',
            style: TextStyle(color: themeColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 14),
          ElevatedButton(
            onPressed: () => ref.invalidate(allTripsProvider),
            style: ElevatedButton.styleFrom(
              backgroundColor: themeColors.primaryButton,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
