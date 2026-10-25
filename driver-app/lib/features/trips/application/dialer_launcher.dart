import 'package:url_launcher/url_launcher.dart';

/// Helper to safely launch the system phone dialer (ACTION_DIAL).
/// Never places direct phone calls, requiring no CALL_PHONE permission.
class DialerLauncher {
  static DateTime? _lastLaunchTime;

  /// Opens the device dialer with the number pre-filled.
  /// Debounced by 1000ms to avoid multiple launches on rapid taps.
  static Future<void> openDialer(String rawPhone) async {
    final now = DateTime.now();
    if (_lastLaunchTime != null &&
        now.difference(_lastLaunchTime!) < const Duration(milliseconds: 1000)) {
      return;
    }
    _lastLaunchTime = now;

    try {
      final sanitized = rawPhone.replaceAll(RegExp(r'[^0-9+]'), '');
      if (sanitized.isEmpty) return;

      final uri = Uri(scheme: 'tel', path: sanitized);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      // Do nothing visible and do not crash
    }
  }
}
