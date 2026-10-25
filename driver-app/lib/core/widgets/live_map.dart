import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart' hide Path;
import '../config/maps_config.dart';
import '../location/driver_location_provider.dart';

/// Reusable LiveMap widget powered by OpenStreetMap, flutter_map, and a single shared GPS stream.
///
/// Features:
/// - Real-time driver position rendered as a blue dot with GPS accuracy circle
/// - Starting zoom level 16.0 with normal panning and zooming
/// - Auto-following camera that pauses on user drag, with a floating Recenter button
/// - MapOptions.onTap opens Google Maps at the tapped/driver coordinates
/// - Floating "Open in Google Maps" button
/// - Optional pickup (green) and dropoff (red) markers for trip navigation
/// - Tile error handling (errorTileCallback) displaying "Map needs internet"
/// - Handling for GPS disabled, permission denied, and position loading states
class LiveMap extends ConsumerStatefulWidget {
  final LatLng? pickupPosition;
  final LatLng? dropoffPosition;
  final String? pickupLabel;
  final String? dropoffLabel;
  final double height;
  final bool showControls;
  final bool showNavigateButton;
  final LatLng? initialCenter;
  final double initialZoom;

  const LiveMap({
    super.key,
    this.pickupPosition,
    this.dropoffPosition,
    this.pickupLabel,
    this.dropoffLabel,
    this.height = 220,
    this.showControls = true,
    this.showNavigateButton = true,
    this.initialCenter,
    this.initialZoom = 16.0,
  });

  @override
  ConsumerState<LiveMap> createState() => _LiveMapState();
}

class _LiveMapState extends ConsumerState<LiveMap> {
  late final MapController _mapController;
  bool _isFollowing = true;
  bool _hasTileError = false;

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  void _recenter(LatLng target) {
    setState(() => _isFollowing = true);
    _mapController.move(target, widget.initialZoom);
  }

  @override
  Widget build(BuildContext context) {
    final locationState = ref.watch(driverLocationProvider);

    // Coordinate resolution: Live GPS -> Trip Pickup -> Default Kerala coordinate
    final driverPos = locationState.currentLatLng;
    final centerPos = driverPos ??
        widget.initialCenter ??
        widget.pickupPosition ??
        widget.dropoffPosition ??
        const LatLng(MapsConfig.defaultLat, MapsConfig.defaultLng);

    // Auto-follow driver when active and position updates
    ref.listen<DriverLocationState>(driverLocationProvider, (previous, next) {
      if (_isFollowing && next.currentLatLng != null) {
        final prevPos = previous?.currentLatLng;
        if (prevPos == null ||
            prevPos.latitude != next.currentLatLng!.latitude ||
            prevPos.longitude != next.currentLatLng!.longitude) {
          _mapController.move(next.currentLatLng!, _mapController.camera.zoom);
        }
      }
    });

    final targetNavPoint = widget.pickupPosition ?? widget.dropoffPosition ?? centerPos;

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: SizedBox(
        height: widget.height,
        child: Stack(
          children: [
            // 1. OpenStreetMap Tile Engine
            FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: centerPos,
                initialZoom: widget.initialZoom,
                minZoom: 4.0,
                maxZoom: 18.0,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.all,
                ),
                onPositionChanged: (camera, hasGesture) {
                  if (hasGesture && _isFollowing) {
                    setState(() => _isFollowing = false);
                  }
                },
                // Tap on map opens Google Maps at driver's location without triggering on drag/pinch
                onTap: (tapPosition, point) {
                  final target = driverPos ?? point;
                  MapsConfig.openInGoogleMaps(
                    lat: target.latitude,
                    lng: target.longitude,
                    context: context,
                  );
                },
              ),
              children: [
                TileLayer(
                  urlTemplate: MapsConfig.osmTileUrl,
                  userAgentPackageName: MapsConfig.userAgentPackageName,
                  errorTileCallback: (tile, error, stackTrace) {
                    if (!_hasTileError && mounted) {
                      setState(() => _hasTileError = true);
                    }
                  },
                ),

                // 2. Accuracy circle around driver location (if GPS accuracy is available)
                if (driverPos != null &&
                    locationState.accuracy != null &&
                    locationState.accuracy! > 0)
                  CircleLayer(
                    circles: [
                      CircleMarker(
                        point: driverPos,
                        radius: math.min(locationState.accuracy!, 80.0),
                        useRadiusInMeter: true,
                        color: const Color(0x223B82F6),
                        borderColor: const Color(0x663B82F6),
                        borderStrokeWidth: 1.5,
                      ),
                    ],
                  ),

                // 3. Markers Layer
                MarkerLayer(
                  markers: [
                    // Driver Current Location: Solid blue dot with pulse ring
                    if (driverPos != null)
                      Marker(
                        point: driverPos,
                        width: 32,
                        height: 32,
                        child: Center(
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Container(
                                width: 26,
                                height: 26,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: const Color(0xFF3B82F6).withValues(alpha: 0.25),
                                ),
                              ),
                              Container(
                                width: 16,
                                height: 16,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: const Color(0xFF2563EB),
                                  border: Border.all(color: Colors.white, width: 2.5),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Colors.black26,
                                      blurRadius: 4,
                                      offset: Offset(0, 1),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                    // Pickup Marker (Green)
                    if (widget.pickupPosition != null)
                      Marker(
                        point: widget.pickupPosition!,
                        width: 36,
                        height: 36,
                        child: Tooltip(
                          message: widget.pickupLabel ?? 'Pickup',
                          child: Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.black26,
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.person_pin_circle_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        ),
                      ),

                    // Dropoff Marker (Red/Coral)
                    if (widget.dropoffPosition != null)
                      Marker(
                        point: widget.dropoffPosition!,
                        width: 36,
                        height: 36,
                        child: Tooltip(
                          message: widget.dropoffLabel ?? 'Dropoff',
                          child: Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.black26,
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.flag_rounded,
                              color: Colors.white,
                              size: 18,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),

                // 4. OpenStreetMap Attribution Widget
                const RichAttributionWidget(
                  attributions: [
                    TextSourceAttribution(
                      MapsConfig.osmAttribution,
                    ),
                  ],
                ),
              ],
            ),

            // Top-right action controls: Navigate & Open in Google Maps
            if (widget.showControls)
              Positioned(
                top: 10,
                right: 10,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Open in Google Maps Button
                    Material(
                      color: Colors.white,
                      elevation: 3,
                      borderRadius: BorderRadius.circular(20),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(20),
                        onTap: () {
                          final target = driverPos ?? centerPos;
                          MapsConfig.openInGoogleMaps(
                            lat: target.latitude,
                            lng: target.longitude,
                            context: context,
                          );
                        },
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.open_in_new_rounded, size: 14, color: Color(0xFF2563EB)),
                              SizedBox(width: 4),
                              Text(
                                'Maps',
                                style: TextStyle(
                                  color: Color(0xFF2563EB),
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    if (widget.showNavigateButton) ...[
                      const SizedBox(width: 6),
                      Material(
                        color: Colors.white,
                        elevation: 3,
                        borderRadius: BorderRadius.circular(20),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(20),
                          onTap: () {
                            MapsConfig.openNavigation(
                              destLat: targetNavPoint.latitude,
                              destLng: targetNavPoint.longitude,
                              originLat: driverPos?.latitude,
                              originLng: driverPos?.longitude,
                              context: context,
                            );
                          },
                          child: const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.navigation_rounded, size: 14, color: Color(0xFF6E2894)),
                                SizedBox(width: 4),
                                Text(
                                  'Navigate',
                                  style: TextStyle(
                                    color: Color(0xFF6E2894),
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),

            // Recenter Floating Button (shown when user panned away)
            if (!_isFollowing && driverPos != null)
              Positioned(
                bottom: 12,
                right: 10,
                child: FloatingActionButton.small(
                  heroTag: 'recenter_live_map',
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF2563EB),
                  elevation: 3,
                  onPressed: () => _recenter(driverPos),
                  child: const Icon(Icons.my_location_rounded, size: 20),
                ),
              ),

            // Banner: Tile Error / Offline State
            if (_hasTileError)
              Positioned(
                top: 10,
                left: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.black87,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.wifi_off_rounded, color: Colors.white70, size: 14),
                      SizedBox(width: 5),
                      Text(
                        'Map needs internet',
                        style: TextStyle(color: Colors.white, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ),

            // Banner: GPS Disabled Alert
            if (!locationState.isGpsEnabled)
              Positioned(
                bottom: 10,
                left: 10,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF59E0B)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.location_off_rounded, color: Color(0xFFD97706), size: 16),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'GPS is turned off. Turn on GPS for live tracking.',
                          style: TextStyle(color: Color(0xFF92400E), fontSize: 11.5),
                        ),
                      ),
                      TextButton(
                        onPressed: () => Geolocator.openLocationSettings(),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('ENABLE', style: TextStyle(fontSize: 11.5)),
                      ),
                    ],
                  ),
                ),
              )
            // Banner: Permission Denied Alert
            else if (!locationState.hasPermission && !locationState.isLoading)
              Positioned(
                bottom: 10,
                left: 10,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFEF4444)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.security_rounded, color: Color(0xFFDC2626), size: 16),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Location permission is required for map features.',
                          style: TextStyle(color: Color(0xFF991B1B), fontSize: 11.5),
                        ),
                      ),
                      TextButton(
                        onPressed: () => ref
                            .read(driverLocationProvider.notifier)
                            .checkAndRequestPermissions(),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('ALLOW', style: TextStyle(fontSize: 11.5)),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
