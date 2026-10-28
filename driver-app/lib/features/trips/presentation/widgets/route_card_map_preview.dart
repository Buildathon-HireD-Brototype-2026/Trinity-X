import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import '../../../../core/services/location_service.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../controllers/trip_mini_overlay_controller.dart';
import '../../domain/trip_model.dart';
import '../../application/navigation_launcher_service.dart';
import 'trip_map_view.dart';

/// Route Card Map Preview in Trip Details (PRD Ongoing Trip Route Card).
/// Automatically displays:
/// - Driver current location pin (live GPS)
/// - Target location pin: Pickup (when trip assigned) or Dropoff (when trip started after selfie)
/// - Route polyline connecting current location to that target
/// - Accurate time & km to target, and "Open map" navigation button.
class RouteCardMapPreview extends ConsumerStatefulWidget {
  final TripModel trip;

  const RouteCardMapPreview({
    super.key,
    required this.trip,
  });

  @override
  ConsumerState<RouteCardMapPreview> createState() => _RouteCardMapPreviewState();
}

class _RouteCardMapPreviewState extends ConsumerState<RouteCardMapPreview> {
  final MapController _mapController = MapController();
  LatLng? _deviceGpsLocation;

  bool get _isTripStarted => widget.trip.isAfterPickup;

  bool get _isTargetDropoff => _isTripStarted;
  String get _targetLabel => _isTargetDropoff ? 'Dropoff' : 'Pickup';

  bool get _isTest =>
      WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');

  @override
  void initState() {
    super.initState();
    _fetchLiveGps(animate: false);
  }

  Future<void> _fetchLiveGps({bool animate = false}) async {
    if (_isTest) return;
    try {
      final loc = await ref.read(locationServiceProvider).getCurrentLocation();
      if (mounted && loc != null) {
        setState(() {
          _deviceGpsLocation = loc;
        });
        if (animate) {
          try {
            _mapController.move(loc, 15.5);
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  LatLng? _getEffectiveTargetLocation() {
    final targetLat = widget.trip.stageTargetLatitude;
    final targetLng = widget.trip.stageTargetLongitude;
    if (targetLat == null || targetLng == null || targetLat == 0.0 || targetLng == 0.0) {
      return null;
    }
    return LatLng(targetLat, targetLng);
  }

  String _calculateEtaAndKm(LatLng targetPoint) {
    if (_deviceGpsLocation != null) {
      const Distance distanceCalc = Distance();
      final meters = distanceCalc(_deviceGpsLocation!, targetPoint);
      final km = meters / 1000.0;
      final mins = (km / 25.0 * 60.0).round().clamp(2, 120);
      return '$mins mins • ${km.toStringAsFixed(1)} km to $_targetLabel';
    }

    if (_isTargetDropoff) {
      final mins = widget.trip.estimatedReachMinutes > 0 ? widget.trip.estimatedReachMinutes : 15;
      return '$mins mins to Dropoff';
    } else {
      return 'To Pickup';
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final isLiteMode = ref.watch(tripMiniOverlayControllerProvider.select((s) => s.isLiteMode));

    final effectiveTarget = _getEffectiveTargetLocation();

    if (effectiveTarget == null) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 14.0),
        child: Container(
          height: 120,
          decoration: BoxDecoration(
            color: themeColors.innerBox,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: themeColors.border),
          ),
          alignment: Alignment.center,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.location_off_rounded,
                color: themeColors.textMuted,
                size: 28,
              ),
              const SizedBox(height: 8),
              Text(
                'Location not available',
                style: TextStyle(
                  color: themeColors.textSecondary,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      );
    }

    void handleOpenMap() async {
      await ref.read(navigationLauncherServiceProvider).launchNavigation(
        lat: effectiveTarget.latitude,
        lng: effectiveTarget.longitude,
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 14.0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 190,
          decoration: BoxDecoration(
            color: themeColors.innerBox,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: themeColors.border),
          ),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // 1. Live OpenStreetMap View in single target mode:
              // Driver Current Location + Active Target (Pickup or Dropoff) + Route path between them
              TripMapView(
                mode: TripMapMode.route,
                singleTargetMode: true,
                isTargetDropoff: _isTargetDropoff,
                pickupLat: !_isTargetDropoff ? effectiveTarget.latitude : null,
                pickupLng: !_isTargetDropoff ? effectiveTarget.longitude : null,
                dropoffLat: _isTargetDropoff ? effectiveTarget.latitude : null,
                dropoffLng: _isTargetDropoff ? effectiveTarget.longitude : null,
                driverLat: _deviceGpsLocation?.latitude,
                driverLng: _deviceGpsLocation?.longitude,
                height: 190,
                isLiteMode: isLiteMode,
                interactive: true,
                showMyLocationButton: true,
                mapController: _mapController,
                onMyLocationPressed: () => _fetchLiveGps(animate: true),
              ),

              // 2. Clickable gesture area (transparent layer for tests / tap fallback)
              Positioned.fill(
                child: IgnorePointer(
                  child: Container(key: const Key('route_card_map_preview_tap_area')),
                ),
              ),

              // 3. Top-Left: Clean Active Destination Status Pill
              Positioned(
                top: 10,
                left: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: themeColors.cardBackground.withValues(alpha: 0.94),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: themeColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isTargetDropoff ? Icons.flag_rounded : Icons.location_on_rounded,
                        size: 13,
                        color: _isTargetDropoff ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _isTargetDropoff ? 'To Dropoff' : 'To Pickup',
                        style: TextStyle(
                          color: themeColors.textPrimary,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 4. Bottom-Left: Clear ETA and Total KM to active target
              Positioned(
                left: 10,
                bottom: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: themeColors.cardBackground.withValues(alpha: 0.94),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: themeColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.schedule_rounded,
                        size: 13,
                        color: themeColors.purpleAccent,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        _calculateEtaAndKm(effectiveTarget),
                        style: TextStyle(
                          color: themeColors.textPrimary,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 5. Bottom-Right: "Open map" Pill for Google Maps navigation
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
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: themeColors.purpleAccent,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: themeColors.purpleAccent.withValues(alpha: 0.35),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.navigation_rounded,
                            size: 12,
                            color: Colors.white,
                          ),
                          SizedBox(width: 4),
                          Text(
                            'Open map',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(width: 2),
                          Icon(
                            Icons.chevron_right_rounded,
                            size: 14,
                            color: Colors.white,
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
