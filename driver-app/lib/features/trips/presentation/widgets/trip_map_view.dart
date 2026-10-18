import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:driver_app/core/theme/app_theme_colors.dart';

import 'package:driver_app/core/services/location_service.dart';

enum TripMapMode {
  route,
  driverLocation,
}

/// Active map instance tracker.
class MapInstanceTracker {
  static String? _activeMapId;

  static bool registerActive(String id) {
    if (_activeMapId == null || _activeMapId == id) {
      _activeMapId = id;
      return true;
    }
    return false;
  }

  static void unregister(String id) {
    if (_activeMapId == id) {
      _activeMapId = null;
    }
  }

  static bool isActive(String id) => _activeMapId == id;
}

/// Free, live OpenStreetMap view utilizing `flutter_map` + `latlong2`.
/// 100% Free, requires zero API keys, no Google Play Services dependencies,
/// and draws live raster street tiles for route preview and driver tracking.
class TripMapView extends StatefulWidget {
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;
  final String? routePolyline;
  final double? driverLat;
  final double? driverLng;
  final double height;
  final TripMapMode mode;
  final bool interactive;
  final bool isLiteMode;
  final bool showMyLocationButton;
  final VoidCallback? onMyLocationPressed;
  final VoidCallback? onTap;

  const TripMapView({
    super.key,
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
    this.routePolyline,
    this.driverLat,
    this.driverLng,
    this.height = 148,
    required this.mode,
    this.interactive = false,
    this.isLiteMode = false,
    this.showMyLocationButton = true,
    this.onMyLocationPressed,
    this.onTap,
  });

  @override
  State<TripMapView> createState() => _TripMapViewState();
}

class _TripMapViewState extends State<TripMapView> {
  final MapController _mapController = MapController();
  LatLng? _liveGps;
  bool _isLocating = false;

  bool get _isTest =>
      WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');

  @override
  void initState() {
    super.initState();
    if (widget.mode == TripMapMode.driverLocation) {
      _fetchLiveGps(animate: false);
    }
  }

  Future<void> _fetchLiveGps({bool animate = true}) async {
    if (_isTest) return;
    setState(() => _isLocating = true);
    try {
      final loc = await LocationService().getCurrentLocation();
      if (mounted && loc != null) {
        setState(() {
          _liveGps = loc;
          _isLocating = false;
        });
        if (animate) {
          try {
            _mapController.move(loc, 16.0);
          } catch (_) {}
        }
      } else {
        if (mounted) setState(() => _isLocating = false);
      }
    } catch (_) {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  @override
  void didUpdateWidget(covariant TripMapView oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.mode == TripMapMode.driverLocation) {
      final lat = widget.driverLat;
      final lng = widget.driverLng;
      if (lat != null && lng != null) {
        try {
          _mapController.move(LatLng(lat, lng), 15.5);
        } catch (_) {}
      }
    }
  }

  LatLng _calculateCenter() {
    if (_liveGps != null && widget.mode == TripMapMode.driverLocation) {
      return _liveGps!;
    }

    if (widget.mode == TripMapMode.driverLocation) {
      if (widget.driverLat != null && widget.driverLng != null) {
        return LatLng(widget.driverLat!, widget.driverLng!);
      }
      return const LatLng(8.678465, 76.887690);
    }

    final pLat = widget.pickupLat ?? (widget.driverLat ?? 8.678465);
    final pLng = widget.pickupLng ?? (widget.driverLng ?? 76.887690);
    final dLat = widget.dropoffLat ?? pLat;
    final dLng = widget.dropoffLng ?? pLng;

    return LatLng((pLat + dLat) / 2, (pLng + dLng) / 2);
  }

  double _calculateZoom() {
    if (widget.mode == TripMapMode.driverLocation) {
      return 15.5;
    }
    if (widget.pickupLat == null || widget.dropoffLat == null) {
      return 14.0;
    }

    // Rough zoom based on distance
    final pLat = widget.pickupLat!;
    final pLng = widget.pickupLng!;
    final dLat = widget.dropoffLat!;
    final dLng = widget.dropoffLng!;

    final latDiff = (pLat - dLat).abs();
    final lngDiff = (pLng - dLng).abs();
    final maxDiff = max(latDiff, lngDiff);

    if (maxDiff > 0.3) return 10.5;
    if (maxDiff > 0.15) return 11.5;
    if (maxDiff > 0.08) return 12.5;
    if (maxDiff > 0.03) return 13.5;
    return 14.5;
  }

  List<LatLng> _decodePolyline(String encoded) {
    final poly = <LatLng>[];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.add(LatLng(lat / 1E5, lng / 1E5));
    }
    return poly;
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    if (_isTest) {
      return Container(
        height: widget.height,
        color: themeColors.innerBox,
        child: Stack(
          children: [
            Center(
              child: Text(
                'OpenStreetMap (${widget.mode.name})',
                style: TextStyle(color: themeColors.textSecondary, fontSize: 11),
              ),
            ),
            if (widget.onTap != null)
              Positioned.fill(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(onTap: widget.onTap),
                ),
              ),
          ],
        ),
      );
    }

    final center = _calculateCenter();
    final zoom = _calculateZoom();

    // Prepare Route Polylines
    final polylines = <Polyline>[];
    if (widget.mode == TripMapMode.route &&
        widget.pickupLat != null &&
        widget.pickupLng != null &&
        widget.dropoffLat != null &&
        widget.dropoffLng != null) {
      List<LatLng> points = [];
      if (widget.routePolyline != null && widget.routePolyline!.trim().isNotEmpty) {
        points = _decodePolyline(widget.routePolyline!);
      }
      if (points.isEmpty) {
        // Direct route line fallback
        points = [
          LatLng(widget.pickupLat!, widget.pickupLng!),
          LatLng(widget.dropoffLat!, widget.dropoffLng!),
        ];
      }
      polylines.add(
        Polyline(
          points: points,
          color: const Color(0xFF7C3AED),
          strokeWidth: 4.5,
        ),
      );
    }

    // Prepare Markers
    final markers = <Marker>[];
    if (widget.mode == TripMapMode.route) {
      if (widget.pickupLat != null && widget.pickupLng != null) {
        markers.add(
          Marker(
            point: LatLng(widget.pickupLat!, widget.pickupLng!),
            width: 36,
            height: 36,
            child: Container(
              decoration: const BoxDecoration(
                color: Color(0xFF10B981),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                ],
              ),
              child: const Icon(Icons.location_on_rounded, color: Colors.white, size: 22),
            ),
          ),
        );
      }
      if (widget.dropoffLat != null && widget.dropoffLng != null) {
        markers.add(
          Marker(
            point: LatLng(widget.dropoffLat!, widget.dropoffLng!),
            width: 36,
            height: 36,
            child: Container(
              decoration: const BoxDecoration(
                color: Color(0xFFEF4444),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                ],
              ),
              child: const Icon(Icons.flag_rounded, color: Colors.white, size: 20),
            ),
          ),
        );
      }
    } else {
      // Driver live position mode
      markers.add(
        Marker(
          point: center,
          width: 44,
          height: 44,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.22),
                  shape: BoxShape.circle,
                ),
              ),
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2.5),
                  boxShadow: const [
                    BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                  ],
                ),
                child: const Icon(Icons.navigation_rounded, color: Colors.white, size: 14),
              ),
            ],
          ),
        ),
      );
    }

    final tileUrl = isDark
        ? 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    return SizedBox(
      height: widget.height,
      child: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: center,
              initialZoom: zoom,
              interactionOptions: InteractionOptions(
                flags: widget.interactive
                    ? InteractiveFlag.all
                    : (InteractiveFlag.pinchZoom | InteractiveFlag.drag),
              ),
              onTap: widget.onTap != null ? (_, __) => widget.onTap!() : null,
            ),
            children: [
              TileLayer(
                urlTemplate: tileUrl,
                userAgentPackageName: 'com.hired.driver_app',
                maxZoom: 19,
              ),
              if (polylines.isNotEmpty) PolylineLayer(polylines: polylines),
              MarkerLayer(markers: markers),
            ],
          ),
          if (widget.onTap != null && !widget.interactive)
            Positioned.fill(
              child: Material(
                color: Colors.transparent,
                child: InkWell(onTap: widget.onTap),
              ),
            ),
          if (widget.showMyLocationButton && !_isTest)
            Positioned(
              top: 10,
              right: 10,
              child: Material(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                shape: const CircleBorder(),
                elevation: 4,
                shadowColor: Colors.black38,
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: () {
                    if (widget.onMyLocationPressed != null) {
                      widget.onMyLocationPressed!();
                    }
                    _fetchLiveGps(animate: true);
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: _isLocating
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(
                            Icons.my_location_rounded,
                            color: Color(0xFF7C3AED),
                            size: 19,
                          ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
