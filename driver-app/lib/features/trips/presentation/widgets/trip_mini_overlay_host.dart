import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/routing/route_names.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../controllers/current_trip_provider.dart';
import '../controllers/trip_mini_overlay_controller.dart';
import 'trip_mini_floating_card.dart';
import 'trip_pip_view.dart';

/// Wraps the root MaterialApp.router to inject the In-App Floating Mini Card
/// above all screens, track GoRouter navigation route changes, and monitor
/// app lifecycle transitions for native background service synchronization.
///
/// Implements PopScope back interception active ONLY while `tripRunning == true`.
class TripMiniOverlayHost extends ConsumerStatefulWidget {
  final Widget child;

  const TripMiniOverlayHost({super.key, required this.child});

  @override
  ConsumerState<TripMiniOverlayHost> createState() => _TripMiniOverlayHostState();
}

class _TripMiniOverlayHostState extends ConsumerState<TripMiniOverlayHost>
    with WidgetsBindingObserver {
  late final StreamSubscription<String?> _openSub;
  DateTime? _lastBackPressTime;
  static const _backDebounceDuration = Duration(milliseconds: 350);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _openSub = ref.read(tripNativeBridgeProvider).onOpenTripDetailsFromOverlay.listen((tripId) {
      if (!mounted) return;

      // Security check: Only navigate if user is not explicitly unauthenticated
      final authStatus = ref.read(authControllerProvider).status;
      if (authStatus == AuthStatus.unauthenticated) {
        return;
      }

      // Security check: Validate tripId against driver's available trips
      if (tripId != null) {
        final allTrips = ref.read(allTripsProvider).valueOrNull ?? [];
        if (allTrips.isNotEmpty) {
          final matchingTrip = allTrips.where((t) => t.tripId == tripId).firstOrNull;
          if (matchingTrip != null) {
            ref.read(selectedTripIdProvider.notifier).select(tripId);
          } else {
            // Unverified tripId passed from outside intent: fall back to active trip if any
            final ongoing = allTrips.where((t) => t.isOngoing).firstOrNull;
            if (ongoing != null) {
              ref.read(selectedTripIdProvider.notifier).select(ongoing.tripId);
            }
          }
        } else {
          ref.read(selectedTripIdProvider.notifier).select(tripId);
        }
      }

      try {
        final currentLoc = GoRouter.of(context).routeInformationProvider.value.uri.path;
        if (currentLoc == RouteNames.tripDetails || currentLoc == '/trip-details') {
          return;
        }
      } catch (_) {}
      context.push(RouteNames.tripDetails, extra: tripId);
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkRoute();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _openSub.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    ref.read(tripMiniOverlayControllerProvider.notifier).handleLifecycleChange(state);
  }

  @override
  Future<bool> didPopRoute() async {
    // Condition 1: Back-to-mini is active ONLY when tripRunning == true
    final isRunning = ref.read(tripMiniOverlayControllerProvider).tripRunning;
    if (!isRunning) {
      // No trip ongoing: allow normal pop everywhere and normal system exit at root
      return false;
    }

    // Condition 2: Back pops screens normally until the root.
    final navState = rootNavigatorKey.currentState;
    if (navState != null && navState.canPop()) {
      navState.pop();
      return true;
    }

    final localNav = Navigator.maybeOf(context);
    if (localNav != null && localNav.canPop()) {
      localNav.pop();
      return true;
    }

    final overlayState = ref.read(tripMiniOverlayControllerProvider);
    if (overlayState.isOnTripPage ||
        overlayState.currentRoute == RouteNames.tripDetails ||
        overlayState.currentRoute == '/trip-details') {
      context.go(RouteNames.home);
      return true;
    }

    // At the root with nothing left to pop!
    // Debounce rapid back taps (350ms)
    final now = DateTime.now();
    if (_lastBackPressTime != null &&
        now.difference(_lastBackPressTime!) < _backDebounceDuration) {
      return true; // debounced
    }
    _lastBackPressTime = now;

    // Send app to background (moveTaskToBack or PiP) and show outside-app mini view.
    // Trip keeps running, and app stays in Recents.
    ref.read(tripMiniOverlayControllerProvider.notifier).sendAppToBackgroundWithMini();
    return true;
  }

  void _checkRoute() {
    if (!mounted) return;
    try {
      final router = GoRouter.of(context);
      final location = router.routeInformationProvider.value.uri.path;
      ref.read(tripMiniOverlayControllerProvider.notifier).updateCurrentRoute(location);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    // Keep route updated on rebuilds
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkRoute());

    final isInPiP = ref.watch(
      tripMiniOverlayControllerProvider.select((s) => s.isInPiPMode),
    );

    if (isInPiP) {
      return const TripPiPView();
    }

    final shouldShow = ref.watch(
      tripMiniOverlayControllerProvider.select((s) => s.shouldShowInAppMiniCard),
    );

    // Single source of truth: back interception is active ONLY while a trip is running
    final isTripRunning = ref.watch(
      tripMiniOverlayControllerProvider.select((s) => s.tripRunning),
    );

    return PopScope(
      canPop: !isTripRunning,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;

        // Condition 3: Read single source of truth right now (never cached)
        final isRunningNow = ref.read(tripMiniOverlayControllerProvider).tripRunning;
        if (!isRunningNow) {
          // Trip ended while user is pressing back: skip mini view and exit normally!
          await SystemNavigator.pop();
          return;
        }

        // Debounce rapid back presses
        final now = DateTime.now();
        if (_lastBackPressTime != null &&
            now.difference(_lastBackPressTime!) < _backDebounceDuration) {
          return;
        }
        _lastBackPressTime = now;

        // Condition 2: Back pops screens normally until the root.
        final navState = rootNavigatorKey.currentState;
        if (navState != null && navState.canPop()) {
          navState.pop();
        } else {
          final localNav = Navigator.maybeOf(context);
          if (localNav != null && localNav.canPop()) {
            localNav.pop();
          } else {
            final overlayState = ref.read(tripMiniOverlayControllerProvider);
            if (overlayState.isOnTripPage ||
                overlayState.currentRoute == RouteNames.tripDetails ||
                overlayState.currentRoute == '/trip-details') {
              context.go(RouteNames.home);
              return;
            }
            // At root with nothing left to pop:
            // Send app to background (moveTaskToBack or PiP) and show outside-app mini view.
            // Trip keeps running, and app stays in Recents.
            ref.read(tripMiniOverlayControllerProvider.notifier).sendAppToBackgroundWithMini();
          }
        }
      },
      child: widget.child,
    );
  }
}
