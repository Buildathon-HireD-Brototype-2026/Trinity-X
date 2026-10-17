import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../controllers/trip_mini_overlay_controller.dart';
import '../../domain/trip_model.dart';
import '../../data/static_map_service.dart';
import 'maps_app_picker_sheet.dart';

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
  Uint8List? _mapBytes;
  bool _isLoading = true;
  String? _loadedKey;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _loadMap();
  }

  @override
  void didUpdateWidget(covariant RouteCardMapPreview oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.trip.tripId != widget.trip.tripId) {
      _loadMap();
    }
  }

  Future<void> _loadMap() async {
    final isDark = context.isDarkMode;
    final key = '${widget.trip.tripId}_$isDark';
    if (_loadedKey == key && _mapBytes != null) return;

    if (mounted) setState(() => _isLoading = true);

    final bytes = await StaticMapService.getStaticMapImage(
      trip: widget.trip,
      isDark: isDark,
    );

    if (mounted) {
      setState(() {
        _mapBytes = bytes;
        _isLoading = false;
        _loadedKey = key;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.trip.hasValidCoordinates) {
      // Missing or invalid pickup/dropoff coordinates: hide the map preview
      return const SizedBox.shrink();
    }

    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final isLiteMode = ref.watch(tripMiniOverlayControllerProvider.select((s) => s.isLiteMode));

    // Current target pin: before trip start = pickup, after trip start = dropoff
    final isOngoing = widget.trip.isOngoing;
    final targetLat = (isOngoing ? widget.trip.dropoffLat : widget.trip.pickupLat) ?? widget.trip.pickupLat!;
    final targetLng = (isOngoing ? widget.trip.dropoffLng : widget.trip.pickupLng) ?? widget.trip.pickupLng!;

    // Reload if theme changed
    final currentKey = '${widget.trip.tripId}_$isDark';
    if (_loadedKey != currentKey && !_isLoading) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadMap());
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
              // 1. Static Image or Themed Offline Route Canvas (Plain surface block while loading/offline)
              if (_mapBytes != null)
                Image.memory(
                  _mapBytes!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _buildThemedPlaceholder(themeColors, isLiteMode),
                )
              else if (_isLoading)
                // While loading show a plain placeholder block in a theme surface color
                Container(color: themeColors.innerBox)
              else
                // Failed or offline: clean theme surface block with crisp vector route
                _buildThemedPlaceholder(themeColors, isLiteMode),

              // 2. Clickable overlay over entire map preview
              Positioned.fill(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    key: const Key('route_card_map_preview_tap_area'),
                    onTap: () async {
                      await MapsAppPickerSheet.show(
                        context: context,
                        ref: ref,
                        targetLat: targetLat,
                        targetLng: targetLng,
                      );
                    },
                  ),
                ),
              ),

              // 3. "Open in Maps" Pill with Arrow Icon
              Positioned(
                right: 10,
                bottom: 10,
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    key: const Key('route_card_open_in_maps_pill'),
                    borderRadius: BorderRadius.circular(20),
                    onTap: () async {
                      await MapsAppPickerSheet.show(
                        context: context,
                        ref: ref,
                        targetLat: targetLat,
                        targetLng: targetLng,
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: isLiteMode
                            ? themeColors.cardBackground
                            : themeColors.cardBackground.withValues(alpha: 0.92),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: themeColors.border),
                        boxShadow: isLiteMode
                            ? null
                            : [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.12),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Open in Maps',
                            style: TextStyle(
                              color: themeColors.textPrimary,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.2,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.arrow_outward_rounded,
                            size: 13,
                            color: themeColors.textPrimary,
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

  /// Clean vector route preview rendered purely from theme tokens for offline/placeholder state
  Widget _buildThemedPlaceholder(AppThemeColors themeColors, bool isLiteMode) {
    return CustomPaint(
      painter: _OfflineRoutePainter(
        bgColor: themeColors.mapBg,
        roadColor: themeColors.mapRoads,
        routeColor: themeColors.primaryButton,
        pickupColor: const Color(0xFF10B981),
        dropoffColor: const Color(0xFFEF4444),
      ),
    );
  }
}

class _OfflineRoutePainter extends CustomPainter {
  final Color bgColor;
  final Color roadColor;
  final Color routeColor;
  final Color pickupColor;
  final Color dropoffColor;

  _OfflineRoutePainter({
    required this.bgColor,
    required this.roadColor,
    required this.routeColor,
    required this.pickupColor,
    required this.dropoffColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Background fill
    final bgPaint = Paint()..color = bgColor;
    canvas.drawRect(Offset.zero & size, bgPaint);

    // Subtle decorative grid roads
    final roadPaint = Paint()
      ..color = roadColor
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    canvas.drawLine(Offset(0, size.height * 0.35), Offset(size.width, size.height * 0.35), roadPaint);
    canvas.drawLine(Offset(0, size.height * 0.72), Offset(size.width, size.height * 0.72), roadPaint);
    canvas.drawLine(Offset(size.width * 0.25, 0), Offset(size.width * 0.25, size.height), roadPaint);
    canvas.drawLine(Offset(size.width * 0.75, 0), Offset(size.width * 0.75, size.height), roadPaint);

    // Smooth connecting Route line
    final start = Offset(size.width * 0.22, size.height * 0.68);
    final end = Offset(size.width * 0.78, size.height * 0.32);

    final routePath = Path()
      ..moveTo(start.dx, start.dy)
      ..cubicTo(
        size.width * 0.40,
        size.height * 0.75,
        size.width * 0.55,
        size.height * 0.25,
        end.dx,
        end.dy,
      );

    final routePaint = Paint()
      ..color = routeColor
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    canvas.drawPath(routePath, routePaint);

    // Pickup Pin (Green)
    final pickupPaint = Paint()..color = pickupColor;
    canvas.drawCircle(start, 6.0, pickupPaint);
    canvas.drawCircle(start, 2.5, Paint()..color = Colors.white);

    // Dropoff Pin (Red)
    final dropoffPaint = Paint()..color = dropoffColor;
    canvas.drawCircle(end, 6.0, dropoffPaint);
    canvas.drawCircle(end, 2.5, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant _OfflineRoutePainter oldDelegate) {
    return oldDelegate.bgColor != bgColor ||
        oldDelegate.roadColor != roadColor ||
        oldDelegate.routeColor != routeColor;
  }
}
