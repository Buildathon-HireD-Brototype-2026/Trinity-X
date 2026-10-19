import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../controllers/trip_mini_overlay_controller.dart';
import '../../domain/trip_model.dart';
import '../../application/navigation_launcher_service.dart';
import 'trip_map_view.dart';

/// Route Card Map Preview Banner in Trip Details (PRD Ongoing Trip Route Card).
/// Uses TripMapView in route mode with pickup (green) and dropoff (red) markers.
/// Tapping the map opens native turn-by-turn navigation directly.
class RouteCardMapPreview extends ConsumerWidget {
  final TripModel trip;

  const RouteCardMapPreview({
    super.key,
    required this.trip,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!trip.hasValidCoordinates) {
      return const SizedBox.shrink();
    }

    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final isLiteMode = ref.watch(tripMiniOverlayControllerProvider.select((s) => s.isLiteMode));

    // Target coordinates: before trip start = pickup, after trip start = dropoff
    final isOngoing = trip.isOngoing;
    final targetLat = (isOngoing ? trip.dropoffLat : trip.pickupLat) ?? trip.pickupLat!;
    final targetLng = (isOngoing ? trip.dropoffLng : trip.pickupLng) ?? trip.pickupLng!;

    void handleOpenMap() async {
      await ref.read(navigationLauncherServiceProvider).launchNavigation(
        lat: targetLat,
        lng: targetLng,
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 14.0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 148,
          decoration: BoxDecoration(
            color: themeColors.innerBox,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: themeColors.border),
          ),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // 1. Shared Native Google Maps SDK View (Route Mode)
              TripMapView(
                mode: TripMapMode.route,
                pickupLat: trip.pickupLat,
                pickupLng: trip.pickupLng,
                dropoffLat: trip.dropoffLat,
                dropoffLng: trip.dropoffLng,
                routePolyline: trip.routePolyline,
                height: 148,
                isLiteMode: isLiteMode,
                showMyLocationButton: false,
                onTap: handleOpenMap,
              ),

              // 2. Clickable gesture area
              Positioned.fill(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    key: const Key('route_card_map_preview_tap_area'),
                    onTap: handleOpenMap,
                  ),
                ),
              ),

              // 3. "Open map" Pill on Bottom-Right (Google logo at bottom-left remains completely visible)
              Positioned(
                right: 10,
                bottom: 10,
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    key: const Key('route_card_open_in_maps_pill'),
                    borderRadius: BorderRadius.circular(20),
                    onTap: handleOpenMap,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: themeColors.cardBackground.withValues(alpha: 0.94),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: themeColors.border),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.navigation_rounded,
                            size: 13,
                            color: themeColors.textPrimary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Open map',
                            style: TextStyle(
                              color: themeColors.textPrimary,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(width: 2),
                          Icon(
                            Icons.chevron_right_rounded,
                            size: 14,
                            color: themeColors.textMuted,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
