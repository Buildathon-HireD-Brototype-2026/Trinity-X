import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/trip_model.dart';
import '../controllers/sos_controller.dart';
import '../sos_status_screen.dart';

/// Bottom sheet displaying the 2 emergency categories for driver SOS.
class SosReasonSheet extends ConsumerStatefulWidget {
  final TripModel trip;

  const SosReasonSheet({
    super.key,
    required this.trip,
  });

  @override
  ConsumerState<SosReasonSheet> createState() => _SosReasonSheetState();
}

class _SosReasonSheetState extends ConsumerState<SosReasonSheet> {
  String? _selectedReason; // 'VEHICLE_DAMAGE' or 'MEDICAL_EMERGENCY'
  bool _isSubmitting = false;

  Future<void> _handleSendSos() async {
    if (_selectedReason == null || _isSubmitting) return;

    setState(() {
      _isSubmitting = true;
    });

    final alert = await ref.read(sosControllerProvider.notifier).sendSos(
      tripId: widget.trip.tripId,
      reason: _selectedReason!,
    );

    if (!mounted) return;

    setState(() {
      _isSubmitting = false;
    });

    if (alert != null) {
      // Close sheet and navigate to status screen
      Navigator.of(context).pop();
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => SosStatusScreen(
            trip: widget.trip,
            initialAlert: alert,
          ),
        ),
      );
    } else {
      final err = ref.read(sosControllerProvider).errorMessage ?? 'Could not transmit SOS.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Widget _buildReasonCard({
    required String reasonKey,
    required String emoji,
    required String title,
    required String subtitle,
    required AppThemeColors themeColors,
    required bool isDark,
  }) {
    final isSelected = _selectedReason == reasonKey;
    final primaryEmergencyColor = const Color(0xFFDC2626);

    return InkWell(
      onTap: _isSubmitting
          ? null
          : () {
              setState(() {
                _selectedReason = reasonKey;
              });
            },
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isSelected
              ? primaryEmergencyColor.withValues(alpha: isDark ? 0.25 : 0.08)
              : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC)),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? primaryEmergencyColor : themeColors.border,
            width: isSelected ? 2.0 : 1.0,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: primaryEmergencyColor.withValues(alpha: 0.18),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: isSelected
                    ? primaryEmergencyColor.withValues(alpha: 0.2)
                    : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                borderRadius: BorderRadius.circular(14),
              ),
              alignment: Alignment.center,
              child: Text(
                emoji,
                style: const TextStyle(fontSize: 26),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? primaryEmergencyColor : themeColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: themeColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? primaryEmergencyColor : themeColors.textSecondary,
                  width: 2,
                ),
                color: isSelected ? primaryEmergencyColor : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 16, color: Colors.white)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final sosState = ref.watch(sosControllerProvider);
    final retryMsg = sosState.retryMessage;

    return Container(
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        14,
        20,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: themeColors.border,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Title Row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFDC2626).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.warning_amber_rounded,
                  color: Color(0xFFDC2626),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Emergency SOS',
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        color: themeColors.textPrimary,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Select the emergency reason to notify operations team',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: themeColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Option 1: Vehicle Breakdown / Damage
          _buildReasonCard(
            reasonKey: 'VEHICLE_DAMAGE',
            emoji: '🚗',
            title: 'Vehicle Breakdown / Damage',
            subtitle: 'Engine failure, tire puncture, mechanical or accident issue',
            themeColors: themeColors,
            isDark: isDark,
          ),
          const SizedBox(height: 12),

          // Option 2: Medical / Personal Safety
          _buildReasonCard(
            reasonKey: 'MEDICAL_EMERGENCY',
            emoji: '🚨',
            title: 'Medical / Personal Safety',
            subtitle: 'Driver or passenger injury, physical threat, or sudden illness',
            themeColors: themeColors,
            isDark: isDark,
          ),
          const SizedBox(height: 24),

          // Retry Message Banner if retrying network
          if (retryMsg != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFF59E0B)),
              ),
              child: Row(
                children: [
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Color(0xFFF59E0B),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      retryMsg,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFD97706),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Send SOS Button
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: (_selectedReason == null || _isSubmitting)
                  ? null
                  : _handleSendSos,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626),
                disabledBackgroundColor: isDark
                    ? const Color(0xFF334155)
                    : const Color(0xFFE2E8F0),
                foregroundColor: Colors.white,
                disabledForegroundColor: themeColors.textSecondary,
                elevation: _selectedReason != null ? 3 : 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: _isSubmitting
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(width: 12),
                        Text(
                          'Transmitting SOS...',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    )
                  : const Text(
                      'Send SOS Alert',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
