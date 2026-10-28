import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../application/dialer_launcher.dart';

/// Small Contact Bottom Sheet displaying person name, company name,
/// and full phone number with a dialer launch button.
class ContactBottomSheet extends StatelessWidget {
  final String? personName;
  final String? companyName;
  final String? phoneNumber;
  final VoidCallback? onClosed;

  const ContactBottomSheet({
    super.key,
    this.personName,
    this.companyName,
    this.phoneNumber,
    this.onClosed,
  });

  static BuildContext? _activeSheetContext;

  /// Closes the currently active contact sheet if open.
  static void close() {
    if (_activeSheetContext != null && _activeSheetContext!.mounted) {
      try {
        Navigator.of(_activeSheetContext!).maybePop();
      } catch (_) {}
      _activeSheetContext = null;
    }
  }

  static Future<void> show({
    required BuildContext context,
    required String? personName,
    required String? companyName,
    required String? phoneNumber,
    VoidCallback? onClosed,
  }) async {
    // Keep in-memory copy only for sheet lifetime
    String? memPerson = personName;
    String? memCompany = companyName;
    String? memPhone = phoneNumber;

    try {
      await showModalBottomSheet<void>(
        context: context,
        backgroundColor: Colors.transparent,
        isScrollControlled: true,
        useRootNavigator: false,
        builder: (ctx) {
          _activeSheetContext = ctx;
          return ContactBottomSheet(
            personName: memPerson,
            companyName: memCompany,
            phoneNumber: memPhone,
            onClosed: onClosed,
          );
        },
      );
    } finally {
      _activeSheetContext = null;
      // Clear in-memory references when sheet closes
      memPerson = null;
      memCompany = null;
      memPhone = null;
      onClosed?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final hasPerson = personName != null && personName!.trim().isNotEmpty;
    final hasCompany = companyName != null && companyName!.trim().isNotEmpty;
    final hasPhone = phoneNumber != null && phoneNumber!.trim().isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(color: themeColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag Handle Indicator
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: themeColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Header Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Contact',
                  style: TextStyle(
                    color: themeColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close_rounded, color: themeColors.textMuted, size: 20),
                  tooltip: 'Close',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Divider(color: themeColors.divider, height: 1),
            const SizedBox(height: 16),

            // Item 1: Person Name
            if (hasPerson) ...[
              _buildContactRow(
                context: context,
                icon: Icons.person_rounded,
                label: 'PASSENGER',
                value: personName!,
              ),
              const SizedBox(height: 14),
            ],

            // Item 2: Company Name
            if (hasCompany) ...[
              _buildContactRow(
                context: context,
                icon: Icons.business_rounded,
                label: 'COMPANY',
                value: companyName!,
              ),
              const SizedBox(height: 14),
            ],

            // Item 3: Phone Number with Dial Button
            if (hasPhone) ...[
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: themeColors.purpleTint,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.phone_rounded,
                      color: themeColors.purpleAccent,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'PHONE NUMBER',
                          style: TextStyle(
                            color: themeColors.textMuted,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        // Plain non-selectable text, no long-press copy
                        Text(
                          phoneNumber!,
                          style: TextStyle(
                            color: themeColors.textPrimary,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w600,
                            fontFamily: 'monospace',
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Minimum 48dp touch target for dialer action
                  SizedBox(
                    width: 48,
                    height: 48,
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        key: const Key('contact_sheet_dial_button'),
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => DialerLauncher.openDialer(phoneNumber!),
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.call_rounded,
                            color: Color(0xFF10B981),
                            size: 20,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildContactRow({
    required BuildContext context,
    required IconData icon,
    required String label,
    required String value,
  }) {
    final themeColors = context.appColors;

    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: themeColors.purpleTint,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: themeColors.purpleAccent,
            size: 20,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: themeColors.textMuted,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 2),
              // Plain non-selectable text wrapping to 2 lines max
              Text(
                value,
                style: TextStyle(
                  color: themeColors.textPrimary,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
