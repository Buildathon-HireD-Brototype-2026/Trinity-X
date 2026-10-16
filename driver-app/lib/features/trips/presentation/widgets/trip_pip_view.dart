import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/routing/route_names.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../controllers/current_trip_provider.dart';
import '../controllers/trip_mini_overlay_controller.dart';

/// Full-window Picture-in-Picture view displayed when Android enters PiP mode (16:9).
/// Shows live ongoing trip status, short destination name, route, and ETA in real-time.
/// Tapping anywhere expands back to the full trip screen.
class TripPiPView extends ConsumerWidget {
  const TripPiPView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overlayState = ref.watch(tripMiniOverlayControllerProvider);
    final trip = overlayState.ongoingTrip;

    if (trip == null) {
      return const SizedBox.shrink();
    }

    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    final destinationShort = trip.dropoffSpot.split(',').first.trim();
    final pickupShort = trip.pickupSpot.split(',').first.trim();

    return Material(
      color: isDark ? const Color(0xFF14101B) : const Color(0xFFFFFFFF),
      child: InkWell(
        onTap: () {
          ref.read(selectedTripIdProvider.notifier).select(trip.tripId);
          try {
            final currentLoc = GoRouter.of(context).routeInformationProvider.value.uri.path;
            if (currentLoc == RouteNames.tripDetails || currentLoc == '/trip-details') {
              return;
            }
          } catch (_) {}
          context.push(RouteNames.tripDetails, extra: trip.tripId);
        },
        child: Container(
          width: double.infinity,
          height: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            border: Border.all(
              color: isDark ? const Color(0xFF6A379F) : const Color(0xFF93C5FD),
              width: 2.0,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Row 1: Status badge
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Color(0xFF10B981),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'ONGOING TRIP',
                    style: TextStyle(
                      color: isDark ? const Color(0xFF34D399) : const Color(0xFF059669),
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF261D35) : const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '~${trip.estimatedReachMinutes}m ETA',
                      style: TextStyle(
                        color: isDark ? const Color(0xFFC084FC) : const Color(0xFF2563EB),
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),

              // Row 2: Destination place prominent
              Row(
                children: [
                  Icon(
                    Icons.location_on_rounded,
                    size: 14,
                    color: isDark ? const Color(0xFFA78BFA) : const Color(0xFF7C3AED),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      destinationShort,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),

              // Row 3: Pickup -> Drop route summary
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '$pickupShort ➔ $destinationShort',
                      style: TextStyle(
                        color: themeColors.textSecondary,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    'Tap to expand ↗',
                    style: TextStyle(
                      color: themeColors.textMuted,
                      fontSize: 8.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
