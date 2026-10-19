import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../config/maps_config.dart';

/// Reusable OpenStreetMap view using flutter_map and latlong2.
/// Displays driver live location, pickup spot, and dropoff spot markers with
/// OpenStreetMap tile attribution and "Open in Google Maps" / "Navigate" button.
class TripOsmMapWidget extends StatelessWidget {
  final LatLng? driverPosition;
  final LatLng? pickupPosition;
  final LatLng? dropoffPosition;
  final String? pickupLabel;
  final String? dropoffLabel;
  final double height;
  final bool showControls;
  final bool interactive;

  const TripOsmMapWidget({
    super.key,
    this.driverPosition,
    this.pickupPosition,
    this.dropoffPosition,
    this.pickupLabel,
    this.dropoffLabel,
    this.height = 200,
    this.showControls = true,
    this.interactive = true,
  });

  @override
  Widget build(BuildContext context) {
    final center = driverPosition ??
        pickupPosition ??
        dropoffPosition ??
        const LatLng(MapsConfig.defaultLat, MapsConfig.defaultLng);

    final markers = <Marker>[];

    // 1. Pickup Marker (Green)
    if (pickupPosition != null) {
      markers.add(
        Marker(
          point: pickupPosition!,
          width: 36,
          height: 36,
          child: Tooltip(
            message: pickupLabel ?? 'Pickup',
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
      );
    }

    // 2. Dropoff Marker (Red/Coral)
    if (dropoffPosition != null) {
      markers.add(
        Marker(
          point: dropoffPosition!,
          width: 36,
          height: 36,
          child: Tooltip(
            message: dropoffLabel ?? 'Dropoff',
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
      );
    }

    // 3. Driver Live Position Marker (HireD Brand Purple)
    if (driverPosition != null) {
      markers.add(
        Marker(
          point: driverPosition!,
          width: 42,
          height: 42,
          child: Tooltip(
            message: 'Your Location',
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF6E2894),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2.5),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x666E2894),
                    blurRadius: 8,
                    spreadRadius: 2,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.navigation_rounded,
                color: Colors.white,
                size: 22,
              ),
            ),
          ),
        ),
      );
    }

    final targetNavPoint = pickupPosition ?? dropoffPosition ?? center;

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: SizedBox(
        height: height,
        child: Stack(
          children: [
            FlutterMap(
              options: MapOptions(
                initialCenter: center,
                initialZoom: 13.0,
                minZoom: 4.0,
                maxZoom: 18.0,
                interactionOptions: InteractionOptions(
                  flags: interactive
                      ? InteractiveFlag.all
                      : InteractiveFlag.none,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: MapsConfig.osmTileUrl,
                  userAgentPackageName: MapsConfig.userAgentPackageName,
                ),
                if (markers.isNotEmpty) MarkerLayer(markers: markers),
                const RichAttributionWidget(
                  attributions: [
                    TextSourceAttribution(
                      MapsConfig.osmAttribution,
                    ),
                  ],
                ),
              ],
            ),

            // Top-right action button: "Open in Google Maps" / "Navigate"
            if (showControls)
              Positioned(
                top: 10,
                right: 10,
                child: Material(
                  color: Colors.white,
                  elevation: 3,
                  borderRadius: BorderRadius.circular(20),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () {
                      MapsConfig.openNavigation(
                        destLat: targetNavPoint.latitude,
                        destLng: targetNavPoint.longitude,
                        originLat: driverPosition?.latitude,
                        originLng: driverPosition?.longitude,
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.directions_outlined,
                            size: 16,
                            color: const Color(0xFF6E2894),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Navigate',
                            style: TextStyle(
                              color: const Color(0xFF6E2894),
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
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
    );
  }
}
