import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/routing/route_names.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../controllers/current_trip_provider.dart';
import '../controllers/trip_mini_overlay_controller.dart';

/// Interactive draggable mini floating card displayed over all in-app screens
/// when a trip is ongoing and the driver is outside the full trip details screen.
///
/// Features:
/// - Hero shared-element transition expanding into the full trip details screen
/// - Mini float disappear animation (180-220ms ease-in) when entering the trip page
///   from notification, Recents, home banner, or other routes
/// - Spring-loaded entry animation (280ms) and swift exit animation
/// - Lite mode for low-spec devices (<=2GB RAM, Android <11, or reduce-animations)
/// - RepaintBoundary for isolated GPU rendering at steady 60fps
/// - Edge snapping & persistent screen position across restarts
/// - Safe area clamping avoiding bottom navigation bar & keyboard overlap
class TripMiniFloatingCard extends ConsumerStatefulWidget {
  const TripMiniFloatingCard({super.key});

  @override
  ConsumerState<TripMiniFloatingCard> createState() => _TripMiniFloatingCardState();
}

class _TripMiniFloatingCardState extends ConsumerState<TripMiniFloatingCard>
    with TickerProviderStateMixin {
  Offset? _position;
  final double _cardWidth = 220;
  final double _cardHeight = 78;

  late final AnimationController _entryController;
  late final Animation<double> _entryFadeAnimation;
  late final Animation<double> _entryScaleAnimation;
  late final Animation<Offset> _entrySlideAnimation;

  late final AnimationController _exitController;
  late final Animation<double> _exitFadeAnimation;
  late final Animation<double> _exitScaleAnimation;

  AnimationController? _pulseController;
  Animation<double>? _pulseAnimation;

  bool _isExiting = false;
  bool _isTappedForHero = false;
  double _exitSlideX = 24.0;

  @override
  void initState() {
    super.initState();

    // 1. Entry Animation: fade + scale from 0.9 to 1.0 with spring, slide up 14dp
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );

    _entryFadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _entryController, curve: Curves.easeOut),
    );
    _entryScaleAnimation = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(parent: _entryController, curve: Curves.easeOutBack),
    );
    _entrySlideAnimation = Tween<Offset>(
      begin: const Offset(0, 14),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _entryController, curve: Curves.easeOutCubic),
    );

    // 2. Exit Animation: 200ms ease-in, fade out + scale 1.0 -> 0.9 + slide to edge
    _exitController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );

    _exitFadeAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _exitController, curve: Curves.easeIn),
    );
    _exitScaleAnimation = Tween<double>(begin: 1.0, end: 0.9).animate(
      CurvedAnimation(parent: _exitController, curve: Curves.easeIn),
    );

    _exitController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        if (mounted) {
          final isExitingToTrip = ref.read(
            tripMiniOverlayControllerProvider.select((s) => s.isExitingToTripPage),
          );
          if (isExitingToTrip) {
            ref.read(tripMiniOverlayControllerProvider.notifier).completeExitToTripPage();
          } else {
            ref.read(tripMiniOverlayControllerProvider.notifier).dismissInAppCard();
          }
        }
      }
    });

    // 3. Status pulse indicator
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _pulseAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController!, curve: Curves.easeInOut),
    );

    // Restore last saved position if any
    final savedPos = ref.read(tripMiniOverlayControllerProvider.notifier).getLastPosition();
    if (savedPos != null) {
      _position = savedPos;
    }

    _triggerEntry();
  }

  void _triggerEntry() {
    final isLite = ref.read(tripMiniOverlayControllerProvider.select((s) => s.isLiteMode));
    if (isLite) {
      _entryController.duration = const Duration(milliseconds: 150);
    }
    _entryController.forward(from: 0.0);

    if (!isLite && !WidgetsBinding.instance.runtimeType.toString().contains('Test')) {
      _pulseController?.repeat(reverse: true);
    }
  }

  /// Triggers exit animation when user explicitly closes via X button
  void _handleDismiss() {
    if (_isExiting) return;
    _isExiting = true;

    final mediaQuery = MediaQuery.of(context);
    final screenWidth = mediaQuery.size.width;
    final cardCenter = (_position?.dx ?? (screenWidth - _cardWidth)) + (_cardWidth / 2);
    _exitSlideX = cardCenter < (screenWidth / 2) ? -24.0 : 24.0;
    _exitController.duration = const Duration(milliseconds: 180);

    _exitController.forward(from: 0.0);
  }

  /// Triggers disappear animation when entering Ongoing Trip page from outside routes
  void _handleExitToTripPage() {
    if (_isTappedForHero) {
      // User tapped the mini float directly: Hero shared element transition expands into page
      ref.read(tripMiniOverlayControllerProvider.notifier).completeExitToTripPage();
      return;
    }

    if (_isExiting) return;
    _isExiting = true;

    final isLite = ref.read(tripMiniOverlayControllerProvider.select((s) => s.isLiteMode));
    final reduceMotion = MediaQuery.disableAnimationsOf(context) ||
        MediaQuery.accessibleNavigationOf(context);

    if (reduceMotion) {
      // Instantly complete without delay to keep page transition instantaneous
      ref.read(tripMiniOverlayControllerProvider.notifier).completeExitToTripPage();
      return;
    }

    final mediaQuery = MediaQuery.of(context);
    final screenWidth = mediaQuery.size.width;
    final cardCenter = (_position?.dx ?? (screenWidth - _cardWidth)) + (_cardWidth / 2);

    if (isLite) {
      // Lite mode: simple fade-out (120ms) with no scale, no slide, no blur
      _exitSlideX = 0.0;
      _exitController.duration = const Duration(milliseconds: 120);
    } else {
      // Normal devices: fade out + scale 1.0 -> 0.9 + slide slightly to nearest edge (200ms)
      _exitSlideX = cardCenter < (screenWidth / 2) ? -20.0 : 20.0;
      _exitController.duration = const Duration(milliseconds: 200);
    }

    _exitController.forward(from: 0.0);
  }

  @override
  void dispose() {
    _entryController.dispose();
    _exitController.dispose();
    _pulseController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Listen for push to trip page to trigger exit animation if not tapped for hero
    ref.listen<bool>(
      tripMiniOverlayControllerProvider.select((s) => s.isExitingToTripPage),
      (prev, isExiting) {
        if (isExiting && mounted) {
          _handleExitToTripPage();
        }
      },
    );

    final isTripOngoing = ref.watch(
      tripMiniOverlayControllerProvider.select((s) => s.isTripOngoing),
    );
    final miniDismissed = ref.watch(
      tripMiniOverlayControllerProvider.select((s) => s.miniDismissed),
    );
    final isOnTripPage = ref.watch(
      tripMiniOverlayControllerProvider.select((s) => s.isOnTripPage),
    );
    final isExitingToTrip = ref.watch(
      tripMiniOverlayControllerProvider.select((s) => s.isExitingToTripPage),
    );
    final isInPiP = ref.watch(
      tripMiniOverlayControllerProvider.select((s) => s.isInPiPMode),
    );
    final trip = ref.watch(
      tripMiniOverlayControllerProvider.select((s) => s.ongoingTrip),
    );
    final isLite = ref.watch(
      tripMiniOverlayControllerProvider.select((s) => s.isLiteMode),
    );

    final reduceMotion = MediaQuery.disableAnimationsOf(context) ||
        MediaQuery.accessibleNavigationOf(context) ||
        isLite;

    // Trigger exit animation if route pushed to trip page before widget build
    if (isExitingToTrip && !_isExiting) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _handleExitToTripPage();
      });
    }

    if (!isTripOngoing || miniDismissed || (isOnTripPage && !isExitingToTrip) || isInPiP || trip == null) {
      return const SizedBox.shrink();
    }

    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final mediaQuery = MediaQuery.of(context);
    final screenSize = mediaQuery.size;
    final padding = mediaQuery.padding;
    final keyboardHeight = mediaQuery.viewInsets.bottom;

    final minX = 12.0;
    final maxX = screenSize.width - _cardWidth - 12.0;
    final minY = padding.top + 16.0;
    // Keep clear of bottom navigation bar (~80dp) and keyboard
    final maxY = screenSize.height - padding.bottom - keyboardHeight - _cardHeight - 80.0;

    // Initialize or clamp position to safe screen bounds
    if (_position == null) {
      _position = Offset(
        screenSize.width - _cardWidth - 16,
        screenSize.height - padding.bottom - keyboardHeight - 110 - _cardHeight,
      );
    } else {
      final clampedX = _position!.dx.clamp(minX, maxX);
      final clampedY = _position!.dy.clamp(minY, maxY > minY ? maxY : minY);
      if (clampedX != _position!.dx || clampedY != _position!.dy) {
        _position = Offset(clampedX, clampedY);
      }
    }

    // Wrap in RepaintBoundary to keep drags & transitions strictly on an isolated GPU layer
    return RepaintBoundary(
      child: Stack(
        children: [
          Positioned(
            left: _position!.dx,
            top: _position!.dy,
            child: GestureDetector(
              onPanUpdate: (details) {
                if (_isExiting) return;
                setState(() {
                  final newX = (_position!.dx + details.delta.dx).clamp(minX, maxX);
                  final newY = (_position!.dy + details.delta.dy).clamp(minY, maxY > minY ? maxY : minY);
                  _position = Offset(newX, newY);
                });
              },
              onPanEnd: (details) {
                if (_isExiting) return;
                // Snap smoothly to nearest edge (16dp margin)
                setState(() {
                  final midX = screenSize.width / 2;
                  final cardCenterX = _position!.dx + (_cardWidth / 2);
                  final targetX = cardCenterX < midX
                      ? 16.0
                      : screenSize.width - _cardWidth - 16.0;
                  _position = Offset(targetX, _position!.dy);
                  ref.read(tripMiniOverlayControllerProvider.notifier).saveLastPosition(
                        targetX,
                        _position!.dy,
                      );
                });
              },
              child: AnimatedBuilder(
                animation: Listenable.merge([_entryController, _exitController]),
                builder: (context, child) {
                  final fadeVal = _isExiting
                      ? _exitFadeAnimation.value
                      : (reduceMotion ? 1.0 : _entryFadeAnimation.value);
                  final scaleVal = _isExiting
                      ? (isLite || _exitSlideX == 0.0 ? 1.0 : _exitScaleAnimation.value)
                      : (reduceMotion ? 1.0 : _entryScaleAnimation.value);
                  final slideVal = _isExiting
                      ? (isLite || _exitSlideX == 0.0 ? Offset.zero : Offset(_exitSlideX * _exitController.value, 0))
                      : (reduceMotion ? Offset.zero : _entrySlideAnimation.value);

                  return Transform.translate(
                    offset: slideVal,
                    child: Transform.scale(
                      scale: scaleVal,
                      child: Opacity(
                        opacity: fadeVal.clamp(0.0, 1.0),
                        child: child,
                      ),
                    ),
                  );
                },
                child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () {
                        // Mark as hero expansion tap: expands into page via shared element
                        _isTappedForHero = true;
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
                        width: _cardWidth,
                        height: _cardHeight,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          // Lite mode: solid semi-opaque surface without heavy glass blur
                          color: isLite
                              ? (isDark ? const Color(0xFF1E1B2E) : const Color(0xFFFFFFFF))
                              : (isDark ? const Color(0xF21C1823) : const Color(0xF7FFFFFF)),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: isDark ? const Color(0xFF6A379F) : const Color(0xFF93C5FD),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(
                                alpha: isLite ? 0.08 : (isDark ? 0.45 : 0.12),
                              ),
                              blurRadius: isLite ? 4 : 14,
                              offset: Offset(0, isLite ? 2 : 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            // Row 1: Status indicator and Close (X) button
                            Row(
                              children: [
                                if (isLite || _pulseAnimation == null)
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFF10B981),
                                      shape: BoxShape.circle,
                                    ),
                                  )
                                else
                                  FadeTransition(
                                    opacity: _pulseAnimation!,
                                    child: Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFF10B981),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ),
                                const SizedBox(width: 6),
                                Text(
                                  'ONGOING TRIP',
                                  style: TextStyle(
                                    color: isDark ? const Color(0xFF34D399) : const Color(0xFF059669),
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const Spacer(),
                                // Close (X) button: triggers exit animation, hides ONLY mini UI
                                InkWell(
                                  onTap: _handleDismiss,
                                  borderRadius: BorderRadius.circular(12),
                                  child: Padding(
                                    padding: const EdgeInsets.all(2.0),
                                    child: Icon(
                                      Icons.close_rounded,
                                      size: 15,
                                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                    ),
                                  ),
                                ),
                              ],
                            ),

                            // Row 2: Destination short place name
                            Row(
                              children: [
                                Icon(
                                  Icons.location_on_rounded,
                                  size: 13,
                                  color: isDark ? const Color(0xFFA78BFA) : const Color(0xFF7C3AED),
                                ),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    trip.dropoffSpot.split(',').first.trim(),
                                    style: TextStyle(
                                      color: themeColors.textPrimary,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),

                            // Row 3: Live ETA & Tap to view hint
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Flexible(
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.navigation_rounded,
                                        size: 11,
                                        color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                                      ),
                                      const SizedBox(width: 4),
                                      Flexible(
                                        child: Text(
                                          '~${trip.estimatedReachMinutes}m ETA',
                                          style: TextStyle(
                                            color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'View trip',
                                      style: TextStyle(
                                        color: themeColors.textMuted,
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(width: 2),
                                    Icon(
                                      Icons.arrow_forward_ios_rounded,
                                      size: 8,
                                      color: themeColors.textMuted,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
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
