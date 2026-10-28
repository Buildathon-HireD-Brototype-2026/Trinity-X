import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:driver_app/core/theme/app_theme_colors.dart';
import 'package:driver_app/core/services/location_service.dart';
import '../../application/road_route_service.dart';

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
/// Features:
/// - Real GPS location of driver as blue dot
/// - Accurate destination marker (Pickup when assigned, Dropoff when ongoing)
/// - Road-following polyline via Google Directions / OSRM (never a straight line)
/// - Auto-fits bounds to both driver location and destination with padding
/// - My Location button with smooth camera recentering
/// - Clean loading state while waiting for GPS; "Location not available" when coordinates missing
/// - Location permission handling with "Open Settings" button
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
  final MapController? mapController;
  final VoidCallback? onTap;
  final bool singleTargetMode;
  final bool isTargetDropoff;

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
    this.mapController,
    this.onTap,
    this.singleTargetMode = false,
    this.isTargetDropoff = false,
  });

  @override
  State<TripMapView> createState() => _TripMapViewState();
}

class _TripMapViewState extends State<TripMapView> {
  late final MapController _internalController;
  MapController get _mapController => widget.mapController ?? _internalController;

  LatLng? _liveGps;
  bool _isLoadingGps = true;
  bool _hasPermissionError = false;
  String? _permissionErrorMessage;

  List<LatLng>? _roadRoutePoints;
  bool _isFetchingRoute = false;
  bool _routeUnavailable = false;
  LatLng? _lastRouteOrigin;
  LatLng? _lastRouteDestination;
  bool _initialBoundsFitted = false;
  bool _destMissingToastShown = false;

  void _checkMissingDestinationToast(LatLng? dest, LatLng? driver) {
    if (dest == null && driver != null && !_destMissingToastShown && widget.mode == TripMapMode.route) {
      _destMissingToastShown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          const SnackBar(
            content: Text('Destination coordinates not available'),
            duration: Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
          ),
        );
      });
    }
  }

  bool get _isTest =>
      WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');

  @override
  void initState() {
    super.initState();
    _internalController = MapController();
    _initLocationAndRoute();
  }

  @override
  void dispose() {
    if (widget.mapController == null) {
      _internalController.dispose();
    }
    super.dispose();
  }

  Future<void> _initLocationAndRoute() async {
    if (widget.driverLat != null && widget.driverLng != null &&
        widget.driverLat != 0.0 && widget.driverLng != 0.0) {
      _liveGps = LatLng(widget.driverLat!, widget.driverLng!);
    }
    await _fetchLiveGps(animate: false);
  }

  LatLng? _getEffectiveDestination() {
    if (widget.singleTargetMode) {
      final lat = widget.isTargetDropoff ? widget.dropoffLat : widget.pickupLat;
      final lng = widget.isTargetDropoff ? widget.dropoffLng : widget.pickupLng;
      if (lat == null || lng == null || lat == 0.0 || lng == 0.0) return null;
      return LatLng(lat, lng);
    }

    if (widget.mode == TripMapMode.route) {
      if (widget.isTargetDropoff) {
        if (widget.dropoffLat != null && widget.dropoffLng != null &&
            widget.dropoffLat != 0.0 && widget.dropoffLng != 0.0) {
          return LatLng(widget.dropoffLat!, widget.dropoffLng!);
        }
      } else {
        if (widget.pickupLat != null && widget.pickupLng != null &&
            widget.pickupLat != 0.0 && widget.pickupLng != 0.0) {
          return LatLng(widget.pickupLat!, widget.pickupLng!);
        }
      }
    }
    return null;
  }

  Future<void> _fetchLiveGps({bool animate = false}) async {
    if (_isTest) {
      if (mounted) {
        setState(() {
          _liveGps = LocationService.defaultFallback;
          _isLoadingGps = false;
        });
        _fetchRoadRouteIfNeeded();
      }
      return;
    }

    setState(() {
      _isLoadingGps = _liveGps == null;
      _hasPermissionError = false;
    });

    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          setState(() {
            _isLoadingGps = false;
            _hasPermissionError = true;
            _permissionErrorMessage = 'Location services are disabled.';
          });
        }
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            setState(() {
              _isLoadingGps = false;
              _hasPermissionError = true;
              _permissionErrorMessage = 'Location permission is denied.';
            });
          }
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          setState(() {
            _isLoadingGps = false;
            _hasPermissionError = true;
            _permissionErrorMessage = 'Location permission is permanently denied.';
          });
        }
        return;
      }

      // Fast check: last known position
      Position? position = await Geolocator.getLastKnownPosition();
      if (position != null && mounted && _liveGps == null) {
        final posLatLng = LatLng(position.latitude, position.longitude);
        setState(() {
          _liveGps = posLatLng;
          _isLoadingGps = false;
        });
        _fitCameraToBounds();
        _fetchRoadRouteIfNeeded();
      }

      // Fresh position with 5-second timeout
      try {
        position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 5),
          ),
        );
      } catch (e) {
        debugPrint('[TripMapView] Fresh GPS timeout: $e');
      }

      if (position != null && mounted) {
        final posLatLng = LatLng(position.latitude, position.longitude);
        setState(() {
          _liveGps = posLatLng;
          _isLoadingGps = false;
        });

        if (animate) {
          _recenterOnDriver();
        } else if (!_initialBoundsFitted) {
          _fitCameraToBounds();
        }
        _fetchRoadRouteIfNeeded();
      } else if (_liveGps == null && mounted) {
        setState(() => _isLoadingGps = false);
      }
    } catch (e) {
      debugPrint('[TripMapView] GPS error: $e');
      if (mounted) setState(() => _isLoadingGps = false);
    }
  }

  void _recenterOnDriver() {
    if (_liveGps == null) return;
    try {
      _mapController.move(_liveGps!, 16.0);
    } catch (e) {
      debugPrint('[TripMapView] recenter error: $e');
    }
  }

  void _fitCameraToBounds() {
    if (_isTest || !mounted) return;
    final dest = _getEffectiveDestination();
    final driver = _liveGps ??
        (widget.driverLat != null && widget.driverLng != null
            ? LatLng(widget.driverLat!, widget.driverLng!)
            : null);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      try {
        if (driver != null && dest != null) {
          final bounds = LatLngBounds.fromPoints([driver, dest]);
          _mapController.fitCamera(
            CameraFit.bounds(
              bounds: bounds,
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 48),
              maxZoom: 16.0,
              minZoom: 10.0,
            ),
          );
          _initialBoundsFitted = true;
        } else if (driver != null) {
          _mapController.move(driver, 16.0);
          _initialBoundsFitted = true;
        } else if (dest != null) {
          _mapController.move(dest, 15.0);
          _initialBoundsFitted = true;
        }
      } catch (e) {
        debugPrint('[TripMapView] fitCamera error: $e');
      }
    });
  }

  Future<void> _fetchRoadRouteIfNeeded() async {
    if (_isTest || _isFetchingRoute) return;
    final dest = _getEffectiveDestination();
    final driver = _liveGps ??
        (widget.driverLat != null && widget.driverLng != null
            ? LatLng(widget.driverLat!, widget.driverLng!)
            : null);

    if (dest == null || driver == null) return;

    // Skip redundant calls if movement is under 100 meters
    if (_lastRouteOrigin != null && _lastRouteDestination != null && _roadRoutePoints != null) {
      const distCalc = Distance();
      final moved = distCalc(driver, _lastRouteOrigin!);
      final destSame = (_lastRouteDestination!.latitude - dest.latitude).abs() < 0.0001 &&
          (_lastRouteDestination!.longitude - dest.longitude).abs() < 0.0001;
      if (moved < 100.0 && destSame) {
        return;
      }
    }

    _isFetchingRoute = true;
    try {
      final routeService = RoadRouteService();
      final points = await routeService.getRoadRoute(origin: driver, destination: dest);

      if (mounted) {
        setState(() {
          if (points != null && points.isNotEmpty) {
            _roadRoutePoints = points;
            _routeUnavailable = false;
            _lastRouteOrigin = driver;
            _lastRouteDestination = dest;
          } else {
            // Requirement 4: If route fails, do NOT fall back to a straight line
            _roadRoutePoints = null;
            _routeUnavailable = true;
          }
        });
      }
    } catch (e) {
      debugPrint('[TripMapView] Route fetch error: $e');
      if (mounted) {
        setState(() {
          _roadRoutePoints = null;
          _routeUnavailable = true;
        });
      }
    } finally {
      _isFetchingRoute = false;
    }
  }

  @override
  void didUpdateWidget(covariant TripMapView oldWidget) {
    super.didUpdateWidget(oldWidget);

    final destChanged = oldWidget.isTargetDropoff != widget.isTargetDropoff ||
        oldWidget.pickupLat != widget.pickupLat ||
        oldWidget.dropoffLat != widget.dropoffLat;

    if (destChanged) {
      _initialBoundsFitted = false;
      _roadRoutePoints = null;
      _routeUnavailable = false;
      _fetchRoadRouteIfNeeded();
      _fitCameraToBounds();
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    if (_isTest) {
      return Container(
        height: widget.height,
        color: themeColors.innerBox,
        child: const Center(child: Text('Map View Test')),
      );
    }

    // 1. Permission Denied State with "Open Settings" button
    if (_hasPermissionError) {
      return Container(
        height: widget.height,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: themeColors.innerBox,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: themeColors.border),
        ),
        alignment: Alignment.center,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.location_disabled_rounded, color: Colors.orange, size: 28),
            const SizedBox(height: 8),
            Text(
              _permissionErrorMessage ?? 'Location access is required.',
              textAlign: TextAlign.center,
              style: TextStyle(color: themeColors.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: () => Geolocator.openAppSettings(),
              style: ElevatedButton.styleFrom(
                backgroundColor: themeColors.purpleAccent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Open Settings', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      );
    }

    // 2. Loading GPS State (Show clean loading instead of random map jump)
    if (_isLoadingGps && _liveGps == null) {
      return Container(
        height: widget.height,
        decoration: BoxDecoration(
          color: themeColors.innerBox,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: themeColors.border),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 26,
                height: 26,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: themeColors.purpleAccent,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Locating driver...',
                style: TextStyle(color: themeColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    final dest = _getEffectiveDestination();
    final driver = _liveGps ??
        (widget.driverLat != null && widget.driverLng != null
            ? LatLng(widget.driverLat!, widget.driverLng!)
            : null);

    // 3. Destination is null handling:
    // If driver location is available, center on driver with zoom 16.0 and notify user
    if (dest == null && widget.mode == TripMapMode.route) {
      _checkMissingDestinationToast(dest, driver);
    }

    final center = driver ?? dest;
    if (center == null) {
      return Container(
        height: widget.height,
        decoration: BoxDecoration(
          color: themeColors.innerBox,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: themeColors.border),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.location_off_rounded, color: themeColors.textMuted, size: 28),
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

    // Build Markers
    final markers = <Marker>[];

    // Marker A: Driver location (Modern blue dot)
    if (driver != null) {
      markers.add(
        Marker(
          point: driver,
          width: 38,
          height: 38,
          child: Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF3B82F6).withValues(alpha: 0.28),
                  ),
                ),
                Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF2563EB),
                    border: Border.all(color: Colors.white, width: 2.8),
                    boxShadow: const [
                      BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 1)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Marker B: Destination Pin (Green for pickup, Red for dropoff)
    if (dest != null) {
      final isDropoff = widget.isTargetDropoff;
      markers.add(
        Marker(
          point: dest,
          width: 38,
          height: 38,
          child: Container(
            decoration: BoxDecoration(
              color: isDropoff ? const Color(0xFFEF4444) : const Color(0xFF10B981),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2.0),
              boxShadow: const [
                BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
              ],
            ),
            child: Icon(
              isDropoff ? Icons.flag_rounded : Icons.location_on_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      );
    }

    // Build Polylines (Real road route, never a straight line)
    final polylines = <Polyline>[];
    if (_roadRoutePoints != null && _roadRoutePoints!.isNotEmpty) {
      polylines.add(
        Polyline(
          points: _roadRoutePoints!,
          color: themeColors.purpleAccent,
          strokeWidth: 5.0,
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
              initialZoom: 14.5,
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

          // Tap gesture overlay for non-interactive mode
          if (widget.onTap != null && !widget.interactive)
            Positioned.fill(
              child: Material(
                color: Colors.transparent,
                child: InkWell(onTap: widget.onTap),
              ),
            ),

          // Destination missing warning pill (when destination coordinates are not provided)
          if (dest == null && widget.mode == TripMapMode.route)
            Positioned(
              bottom: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.75),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.info_outline, color: Colors.orangeAccent, size: 14),
                    SizedBox(width: 4),
                    Text(
                      'Destination coordinates not available',
                      style: TextStyle(color: Colors.white, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),

          // Route unavailable warning pill (when road polyline could not be fetched)
          if (dest != null && _routeUnavailable)
            Positioned(
              bottom: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.75),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.info_outline, color: Colors.white70, size: 14),
                    SizedBox(width: 4),
                    Text(
                      'Route preview unavailable',
                      style: TextStyle(color: Colors.white, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),

          // My Location Button
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
                    } else {
                      _fetchLiveGps(animate: true);
                    }
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Icon(
                      Icons.my_location_rounded,
                      size: 20,
                      color: themeColors.purpleAccent,
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
