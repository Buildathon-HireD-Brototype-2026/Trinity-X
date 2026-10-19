import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../controllers/trip_mini_overlay_controller.dart';
import '../../domain/trip_model.dart';
import '../../application/navigation_launcher_service.dart';

class TripNavigateButton extends ConsumerWidget {
  final TripModel trip;

  const TripNavigateButton({
    super.key,
    required this.trip,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Hide button if trip is closed or cancelled
    if (trip.isClosed || trip.status.toUpperCase() == 'CANCELLED') {
      return const SizedBox.shrink();
    }

    final isLiteMode = ref.watch(tripMiniOverlayControllerProvider.select((s) => s.isLiteMode));
    final themeColors = context.appColors;

    // Phase: before trip start = Navigate to Pickup, after trip start = Navigate to Destination
    final isOngoing = trip.isOngoing;
    final label = isOngoing ? 'Navigate to Destination' : 'Navigate to Pickup';
    final targetLat = isOngoing ? trip.dropoffLat : trip.pickupLat;
    final targetLng = isOngoing ? trip.dropoffLng : trip.pickupLng;

    final hasValidTarget = targetLat != null && targetLng != null && targetLat != 0.0 && targetLng != 0.0;

    return Padding(
      padding: const EdgeInsets.only(top: 14.0),
      child: SizedBox(
        height: 48,
        width: double.infinity,
        child: ElevatedButton.icon(
          key: const Key('trip_navigate_primary_button'),
          icon: const Icon(
            Icons.navigation_rounded,
            size: 19,
            color: Colors.white,
          ),
          label: AnimatedSwitcher(
            duration: isLiteMode ? const Duration(milliseconds: 150) : const Duration(milliseconds: 280),
            transitionBuilder: (child, animation) => FadeTransition(
              opacity: animation,
              child: child,
            ),
            child: Text(
              label,
              key: ValueKey<String>(label),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.2,
              ),
            ),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: themeColors.primaryButton,
            disabledBackgroundColor: themeColors.primaryButton.withValues(alpha: 0.4),
            elevation: isLiteMode ? 0 : 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          onPressed: !hasValidTarget
              ? null
              : () async {
                  await ref
                      .read(navigationLauncherServiceProvider)
                      .launchNavigation(lat: targetLat, lng: targetLng);
                },
        ),
      ),
    );
  }
}
