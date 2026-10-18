import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:driver_app/core/config/maps_config.dart';
import 'package:driver_app/core/theme/app_theme_colors.dart';

enum TripMapMode {
  route,
  driverLocation,
}

/// Active map instance tracker ensuring never more than one live GoogleMap exists at a time.
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

/// Shared Trip Map View utilizing Google Maps SDK (Free Native SDK, no paid API calls).
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
    this.onTap,
  });

  @override
  State<TripMapView> createState() => _TripMapViewState();
}

class _TripMapViewState extends State<TripMapView> {
  late final String _instanceId;
  GoogleMapController? _controller;
  bool _isKeyConfigured = false;
  bool _hasCheckedKey = false;

  // Driver follow throttling
  DateTime? _lastCameraMoveTime;
  LatLng? _lastCameraPosition;

  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};

  @override
  void initState() {
    super.initState();
    _instanceId = 'map_${identityHashCode(this)}_${DateTime.now().microsecondsSinceEpoch}';
    _checkKeyStatus();
  }

  Future<void> _checkKeyStatus() async {
    final valid = await MapsConfig.isKeyConfigured();
    if (mounted) {
      setState(() {
        _isKeyConfigured = valid;
        _hasCheckedKey = true;
      });
    }
  }

  @override
  void didUpdateWidget(covariant TripMapView oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.mode == TripMapMode.driverLocation) {
      _updateDriverLocation();
    } else {
      _updateRouteElements();
    }
  }

  @override
  void dispose() {
    MapInstanceTracker.unregister(_instanceId);
    _controller?.dispose();
    _controller = null;
    super.dispose();
  }

  void _onMapCreated(GoogleMapController controller) {
    _controller = controller;
    MapInstanceTracker.registerActive(_instanceId);

    if (widget.mode == TripMapMode.route) {
      _updateRouteElements();
      _fitRouteBounds();
    } else {
      _updateDriverLocation(forceCamera: true);
    }
  }

  void _fitRouteBounds() {
    if (_controller == null) return;
    if (widget.pickupLat == null || widget.pickupLng == null || widget.dropoffLat == null || widget.dropoffLng == null) return;

    final southWest = LatLng(
      min(widget.pickupLat!, widget.dropoffLat!),
      min(widget.pickupLng!, widget.dropoffLng!),
    );
    final northEast = LatLng(
      max(widget.pickupLat!, widget.dropoffLat!),
      max(widget.pickupLng!, widget.dropoffLng!),
    );

    final bounds = LatLngBounds(southwest: southWest, northeast: northEast);
    _controller?.animateCamera(CameraUpdate.newLatLngBounds(bounds, 36));
  }

  void _updateRouteElements() {
    if (widget.pickupLat == null || widget.pickupLng == null || widget.dropoffLat == null || widget.dropoffLng == null) {
      return;
    }

    final pLat = widget.pickupLat!;
    final pLng = widget.pickupLng!;
    final dLat = widget.dropoffLat!;
    final dLng = widget.dropoffLng!;

    final newMarkers = <Marker>{
      Marker(
        markerId: const MarkerId('pickup_marker'),
        position: LatLng(pLat, pLng),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: const InfoWindow(title: 'Pickup'),
      ),
      Marker(
        markerId: const MarkerId('dropoff_marker'),
        position: LatLng(dLat, dLng),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: const InfoWindow(title: 'Dropoff'),
      ),
    };

    final newPolylines = <Polyline>{};
    if (widget.routePolyline != null && widget.routePolyline!.trim().isNotEmpty) {
      final points = _decodePolyline(widget.routePolyline!);
      if (points.isNotEmpty) {
        newPolylines.add(
          Polyline(
            polylineId: const PolylineId('trip_route_line'),
            points: points,
            color: const Color(0xFF7C3AED),
            width: 4,
          ),
        );
      }
    }

    setState(() {
      _markers = newMarkers;
      _polylines = newPolylines;
    });
  }

  void _updateDriverLocation({bool forceCamera = false}) {
    if (widget.driverLat == null || widget.driverLng == null) return;

    final driverPos = LatLng(widget.driverLat!, widget.driverLng!);

    final newMarkers = <Marker>{
      Marker(
        markerId: const MarkerId('driver_marker'),
        position: driverPos,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        anchor: const Offset(0.5, 0.5),
        flat: true,
      ),
    };

    setState(() {
      _markers = newMarkers;
    });

    if (_controller == null) return;

    final now = DateTime.now();
    final moveThreshold = widget.isLiteMode
        ? MapsConfig.liteMoveThresholdMeters
        : MapsConfig.normalMoveThresholdMeters;
    final throttle = widget.isLiteMode
        ? MapsConfig.liteThrottleDuration
        : MapsConfig.normalThrottleDuration;

    bool shouldMove = forceCamera;
    if (!shouldMove) {
      if (_lastCameraPosition == null) {
        shouldMove = true;
      } else {
        final dist = _calculateDistance(
          _lastCameraPosition!.latitude,
          _lastCameraPosition!.longitude,
          driverPos.latitude,
          driverPos.longitude,
        );
        final elapsed = _lastCameraMoveTime == null ? throttle : now.difference(_lastCameraMoveTime!);
        if (dist >= moveThreshold || elapsed >= throttle) {
          shouldMove = true;
        }
      }
    }

    if (shouldMove) {
      _lastCameraPosition = driverPos;
      _lastCameraMoveTime = now;
      _controller?.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(
            target: driverPos,
            zoom: MapsConfig.driverLocationZoom,
          ),
        ),
      );
    }
  }

  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const p = 0.017453292519943295; // Math.PI / 180
    final a = 0.5 - cos((lat2 - lat1) * p) / 2 +
        cos(lat1 * p) * cos(lat2 * p) * (1 - cos((lon2 - lon1) * p)) / 2;
    return 12742000 * asin(sqrt(a));
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

    // Check if coordinates exist
    final hasRouteCoords = widget.pickupLat != null &&
        widget.pickupLng != null &&
        widget.dropoffLat != null &&
        widget.dropoffLng != null;
    final hasDriverCoords = widget.driverLat != null && widget.driverLng != null;

    if (widget.mode == TripMapMode.route && !hasRouteCoords) {
      return const SizedBox.shrink();
    }
    if (widget.mode == TripMapMode.driverLocation && !hasDriverCoords) {
      return _buildPlaceholder(themeColors, isDark);
    }

    // If key is not configured, still placeholder, or in test environment:
    // show clean styled placeholder block without crashing
    if (!_hasCheckedKey || !_isKeyConfigured) {
      return _buildPlaceholder(themeColors, isDark);
    }

    // Only allow one active map at a time
    if (!MapInstanceTracker.registerActive(_instanceId)) {
      return _buildPlaceholder(themeColors, isDark);
    }

    final initialTarget = widget.mode == TripMapMode.route
        ? LatLng(widget.pickupLat!, widget.pickupLng!)
        : LatLng(widget.driverLat!, widget.driverLng!);

    final mapWidget = GoogleMap(
      key: ValueKey(_instanceId),
      style: isDark ? MapsConfig.darkMapStyle : null,
      initialCameraPosition: CameraPosition(
        target: initialTarget,
        zoom: widget.mode == TripMapMode.driverLocation ? MapsConfig.driverLocationZoom : 12.0,
      ),
      onMapCreated: _onMapCreated,
      markers: _markers,
      polylines: _polylines,
      liteModeEnabled: !widget.interactive && Platform.isAndroid,
      scrollGesturesEnabled: widget.interactive,
      zoomGesturesEnabled: widget.interactive,
      rotateGesturesEnabled: widget.interactive,
      tiltGesturesEnabled: widget.interactive,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
      myLocationButtonEnabled: false,
      compassEnabled: false,
      onTap: widget.onTap != null ? (_) => widget.onTap!() : null,
    );

    return SizedBox(
      height: widget.height,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            Positioned.fill(child: mapWidget),
            if (widget.onTap != null && !widget.interactive)
              Positioned.fill(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: widget.onTap,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder(AppThemeColors themeColors, bool isDark) {
    return SizedBox(
      height: widget.height,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          color: themeColors.innerBox,
          child: Stack(
            fit: StackFit.expand,
            children: [
              CustomPaint(
                painter: _PlainPlaceholderRoadsPainter(
                  isDark: isDark,
                  colors: themeColors,
                ),
              ),
              if (widget.onTap != null)
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: widget.onTap,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlainPlaceholderRoadsPainter extends CustomPainter {
  final bool isDark;
  final AppThemeColors colors;

  const _PlainPlaceholderRoadsPainter({
    required this.isDark,
    required this.colors,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = colors.innerBox;
    canvas.drawRect(Offset.zero & size, bgPaint);

    final roadPaint = Paint()
      ..color = isDark ? const Color(0xFF261F35) : const Color(0xFFE2E8F0)
      ..strokeWidth = 6.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path1 = Path()
      ..moveTo(0, size.height * 0.3)
      ..lineTo(size.width, size.height * 0.7);
    canvas.drawPath(path1, roadPaint);

    final path2 = Path()
      ..moveTo(size.width * 0.2, 0)
      ..lineTo(size.width * 0.8, size.height);
    canvas.drawPath(path2, roadPaint);

    // Subtle route dot in center
    final dotPaint = Paint()
      ..color = const Color(0xFF10B981)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(size.width * 0.5, size.height * 0.5), 5.0, dotPaint);
  }

  @override
  bool shouldRepaint(covariant _PlainPlaceholderRoadsPainter oldDelegate) {
    return oldDelegate.isDark != isDark || oldDelegate.colors != colors;
  }
}
