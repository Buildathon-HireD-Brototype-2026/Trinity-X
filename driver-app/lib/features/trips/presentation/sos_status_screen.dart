import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../domain/sos_model.dart';
import '../domain/trip_model.dart';
import 'controllers/sos_controller.dart';

/// Screen displaying the active SOS status, admin attendance state,
/// helpline dialer, and false alarm cancellation option.
class SosStatusScreen extends ConsumerStatefulWidget {
  final TripModel trip;
  final TripSosAlertModel? initialAlert;

  const SosStatusScreen({
    super.key,
    required this.trip,
    this.initialAlert,
  });

  @override
  ConsumerState<SosStatusScreen> createState() => _SosStatusScreenState();
}

class _SosStatusScreenState extends ConsumerState<SosStatusScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.initialAlert != null) {
        ref.read(sosControllerProvider.notifier).setAlert(widget.initialAlert);
      }
      ref.read(sosControllerProvider.notifier).checkActiveSos(widget.trip.tripId);
    });
  }

  Future<void> _callHelpline() async {
    final phoneNumber = AppConfig.emergencyHelplineNumber;
    final Uri telUri = Uri(scheme: 'tel', path: phoneNumber);
    try {
      if (await canLaunchUrl(telUri)) {
        await launchUrl(telUri);
      } else {
        await launchUrl(telUri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not open dialer for $phoneNumber: $e'),
          backgroundColor: const Color(0xFFDC2626),
        ),
      );
    }
  }

  Future<void> _confirmCancelSos(int alertId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        final themeColors = ctx.appColors;
        return AlertDialog(
          backgroundColor: themeColors.cardBackground,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            'Cancel SOS Alert?',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: themeColors.textPrimary,
            ),
          ),
          content: Text(
            'Are you sure you want to cancel this emergency alert? It will be marked as "False alarm / I\'m safe" in the system.',
            style: TextStyle(
              fontSize: 14,
              color: themeColors.textSecondary,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(
                'No, Keep SOS',
                style: TextStyle(color: themeColors.textSecondary),
              ),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Yes, I\'m Safe'),
            ),
          ],
        );
      },
    );

    if (confirmed == true && mounted) {
      final success = await ref.read(sosControllerProvider.notifier).cancelSos(alertId);
      if (!mounted) return;
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('SOS Alert cancelled. Marked as false alarm.'),
            backgroundColor: Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Widget _buildStatusHeader(TripSosAlertModel alert, AppThemeColors themeColors, bool isDark) {
    if (alert.isResolved) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? const Color(0xFF059669) : const Color(0xFF10B981),
            width: 1.5,
          ),
        ),
        child: Column(
          children: [
            const Icon(
              Icons.check_circle_rounded,
              color: Color(0xFF10B981),
              size: 48,
            ),
            const SizedBox(height: 12),
            const Text(
              'SOS Marked Resolved',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: Color(0xFF065F46),
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              alert.resolutionNotes ?? 'Issue has been addressed and marked resolved.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? const Color(0xFFA7F3D0) : const Color(0xFF047857),
              ),
            ),
            if (alert.resolvedAt != null) ...[
              const SizedBox(height: 6),
              Text(
                'Resolved at ${DateFormat('hh:mm a').format(alert.resolvedAt!.toLocal())}',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? const Color(0xFF6EE7B7) : const Color(0xFF065F46),
                ),
              ),
            ],
          ],
        ),
      );
    }

    if (alert.isInProgress) {
      final adminName = alert.claimedByAdminName ?? 'Operations Admin';
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E3A8A) : const Color(0xFFDBEAFE),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? const Color(0xFF3B82F6) : const Color(0xFF2563EB),
            width: 1.5,
          ),
        ),
        child: Column(
          children: [
            const Icon(
              Icons.support_agent_rounded,
              color: Color(0xFF2563EB),
              size: 48,
            ),
            const SizedBox(height: 12),
            Text(
              'Admin $adminName is handling your SOS',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                color: Color(0xFF1E40AF),
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'The operations team is actively coordinating assistance. Keep your phone reachable.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Color(0xFF1D4ED8),
              ),
            ),
          ],
        ),
      );
    }

    // Default: OPEN
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF451A03) : const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFFB45309) : const Color(0xFFF59E0B),
          width: 1.5,
        ),
      ),
      child: Column(
        children: const [
          Icon(
            Icons.hourglass_top_rounded,
            color: Color(0xFFD97706),
            size: 48,
          ),
          SizedBox(height: 12),
          Text(
            'Waiting for an admin...',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF92400E),
              letterSpacing: -0.3,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Your emergency signal and live GPS coordinates have been broadcast to all active administrators.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFFB45309),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, AppThemeColors themeColors) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: themeColors.textSecondary,
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: themeColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final sosState = ref.watch(sosControllerProvider);
    final alert = sosState.activeAlert ?? widget.initialAlert;

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
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Emergency SOS Status',
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: alert == null
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(18.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Main Status Hero Banner
                    _buildStatusHeader(alert, themeColors, isDark),
                    const SizedBox(height: 18),

                    // Top Banner Notice
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDC2626).withValues(alpha: isDark ? 0.2 : 0.08),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: const Color(0xFFDC2626).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.location_on_rounded,
                            color: Color(0xFFDC2626),
                            size: 22,
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              'SOS Sent — Admin Team has been alerted with your live location.',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFFDC2626),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Incident Information Card
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: themeColors.cardBackground,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: themeColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'INCIDENT SUMMARY',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                              color: themeColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildDetailRow(
                            'Reason',
                            '${alert.reasonEmoji} ${alert.reasonDisplay}',
                            themeColors,
                          ),
                          _buildDetailRow('Trip ID', '#${alert.tripId}', themeColors),
                          _buildDetailRow('Order ID', '#${alert.orderId}', themeColors),
                          _buildDetailRow(
                            'GPS Coordinates',
                            '${alert.latitude.toStringAsFixed(4)}, ${alert.longitude.toStringAsFixed(4)}',
                            themeColors,
                          ),
                          if (alert.createdAt != null)
                            _buildDetailRow(
                              'Triggered At',
                              DateFormat('dd MMM, hh:mm a').format(alert.createdAt!.toLocal()),
                              themeColors,
                            ),
                          if (alert.notes != null && alert.notes!.isNotEmpty)
                            _buildDetailRow('Notes', alert.notes!, themeColors),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Return to Trip Button if Resolved
                    if (alert.isResolved) ...[
                      SizedBox(
                        height: 52,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.arrow_back),
                          label: const Text(
                            'Return to Trip Details',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: themeColors.purpleAccent,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    // Fixed Button 1: Call Helpline / Emergency Contact
                    SizedBox(
                      height: 52,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.call_rounded, color: Colors.white),
                        label: const Text(
                          'Call Helpline / Emergency Contact',
                          style: TextStyle(
                            fontSize: 15.5,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFDC2626),
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: _callHelpline,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Fixed Button 2: False alarm / I'm safe (Only if active)
                    if (alert.isActive) ...[
                      SizedBox(
                        height: 48,
                        child: OutlinedButton(
                          onPressed: () => _confirmCancelSos(alert.alertId),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: themeColors.textSecondary,
                            side: BorderSide(color: themeColors.border),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Text(
                            'False alarm / I\'m safe',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
      ),
    );
  }
}
