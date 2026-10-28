import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/controllers/driver_profile_controller.dart';

/// Modal popup dialog shown when a driver attempts to start a trip while offline.
/// Prompts the driver to go online before starting the trip.
class GoOnlineDialog extends ConsumerStatefulWidget {
  const GoOnlineDialog({super.key});

  /// Displays the dialog and returns true if the driver went online, false otherwise.
  static Future<bool> show(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => const GoOnlineDialog(),
    );
    return result ?? false;
  }

  @override
  ConsumerState<GoOnlineDialog> createState() => _GoOnlineDialogState();
}

class _GoOnlineDialogState extends ConsumerState<GoOnlineDialog> {
  bool _isLoading = false;

  Future<void> _handleGoOnline() async {
    setState(() => _isLoading = true);
    try {
      await ref.read(driverProfileProvider.notifier).setOnline(true);
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to go online: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Dialog(
      key: const Key('go_online_dialog'),
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: themeColors.cardBackground,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: themeColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.12),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Icon with Pulse Ring
            Center(
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.16),
                    ),
                  ),
                  Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.25),
                    ),
                    child: const Icon(
                      Icons.sensors_off_rounded,
                      color: Color(0xFFF59E0B),
                      size: 28,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Badge
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2E2415) : const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? const Color(0xFF78350F) : const Color(0xFFFDE68A),
                  ),
                ),
                child: const Text(
                  'CURRENTLY OFFLINE',
                  style: TextStyle(
                    color: Color(0xFFD97706),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Title
            Text(
              'Go Online to Start Trip',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: themeColors.textPrimary,
                fontSize: 19,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),

            // Description
            Text(
              'You are offline. To start this trip, enable live route tracking, and connect with the client, please switch your status to online.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: themeColors.textSecondary,
                fontSize: 13.5,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 24),

            // Action: Go Online Button
            SizedBox(
              height: 48,
              child: ElevatedButton.icon(
                key: const Key('go_online_dialog_confirm_button'),
                icon: _isLoading
                    ? const SizedBox.shrink()
                    : const Icon(Icons.toggle_on_rounded, color: Colors.white, size: 22),
                label: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.2,
                        ),
                      )
                    : const Text(
                        'Go Online',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                onPressed: _isLoading ? null : _handleGoOnline,
              ),
            ),
            const SizedBox(height: 8),

            // Secondary: Cancel Button
            SizedBox(
              height: 44,
              child: TextButton(
                key: const Key('go_online_dialog_cancel_button'),
                onPressed: _isLoading ? null : () => Navigator.of(context).pop(false),
                child: Text(
                  'Stay Offline',
                  style: TextStyle(
                    color: themeColors.textSecondary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
