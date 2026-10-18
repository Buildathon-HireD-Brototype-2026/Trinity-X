import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/routing/route_names.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../controllers/current_trip_provider.dart';
import '../controllers/trip_mini_overlay_controller.dart';
import 'trip_map_view.dart';

/// In-App Floating Mini Card showing live driver location map at street level.
/// Wrapped in a RepaintBoundary so dragging stays smooth.
/// Disposed when card hides (e.g., while Ongoing Trip page is open).
class TripMiniFloatingCard extends ConsumerWidget {
  const TripMiniFloatingCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overlayState = ref.watch(tripMiniOverlayControllerProvider);
    if (!overlayState.shouldShowInAppMiniCard) {
      return const SizedBox.shrink();
    }

    final trip = overlayState.ongoingTrip;
    if (trip == null) return const SizedBox.shrink();

    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return RepaintBoundary(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            ref.read(selectedTripIdProvider.notifier).select(trip.tripId);
            context.push(RouteNames.tripDetails, extra: trip.tripId);
          },
          child: Container(
            width: 140,
            height: 220,
            decoration: BoxDecoration(
              color: themeColors.cardBackground,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: themeColors.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top: Status & ETA
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Color(0xFF10B981),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'ONGOING',
                          style: TextStyle(
                            color: isDark ? const Color(0xFF34D399) : const Color(0xFF059669),
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '~${trip.estimatedReachMinutes}m',
                      style: TextStyle(
                        color: themeColors.purpleAccent,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Destination
                Text(
                  trip.dropoffSpot.split(',').first.trim(),
                  style: TextStyle(
                    color: themeColors.textPrimary,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),

                // Live Map in driverLocation mode
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: TripMapView(
                      mode: TripMapMode.driverLocation,
                      driverLat: overlayState.currentDriverLat,
                      driverLng: overlayState.currentDriverLng,
                      isLiteMode: overlayState.isLiteMode,
                      interactive: false,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
