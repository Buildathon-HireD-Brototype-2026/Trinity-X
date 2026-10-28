import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/trips/presentation/controllers/trip_mini_overlay_controller.dart';
import 'route_names.dart';

/// Navigation RouteObserver tracking when the Ongoing Trip page is pushed or popped.
/// Triggers entry animation only after the Ongoing Trip page's pop animation completes
/// so the two animations don't fight, avoiding timers and polling.
class TripRouteObserver extends NavigatorObserver {
  final Ref _ref;

  TripRouteObserver(this._ref);

  bool _isTripDetailsRoute(Route<dynamic>? route) {
    if (route == null) return false;
    final name = route.settings.name;
    return name == RouteNames.tripDetails || name == '/trip-details';
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    final routeName = route.settings.name;
    if (routeName != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _ref.read(tripMiniOverlayControllerProvider.notifier).updateCurrentRoute(routeName);
      });
    }
    if (_isTripDetailsRoute(route)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _ref.read(tripMiniOverlayControllerProvider.notifier).startExitToTripPage();
      });
    }
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    final prevName = previousRoute?.settings.name;
    if (prevName != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _ref.read(tripMiniOverlayControllerProvider.notifier).updateCurrentRoute(prevName);
      });
    }
    if (_isTripDetailsRoute(route)) {
      final anim = (route is TransitionRoute) ? route.animation : null;
      if (anim != null && !anim.isCompleted && !anim.isDismissed) {
        void statusListener(AnimationStatus status) {
          if (status == AnimationStatus.dismissed) {
            anim.removeStatusListener(statusListener);
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _ref.read(tripMiniOverlayControllerProvider.notifier).setTripPageForeground(false);
            });
          }
        }
        anim.addStatusListener(statusListener);
      } else {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _ref.read(tripMiniOverlayControllerProvider.notifier).setTripPageForeground(false);
        });
      }
    }
  }

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didRemove(route, previousRoute);
    if (_isTripDetailsRoute(route)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _ref.read(tripMiniOverlayControllerProvider.notifier).setTripPageForeground(false);
      });
    }
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    final newName = newRoute?.settings.name;
    if (newName != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _ref.read(tripMiniOverlayControllerProvider.notifier).updateCurrentRoute(newName);
      });
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_isTripDetailsRoute(oldRoute) && !_isTripDetailsRoute(newRoute)) {
        _ref.read(tripMiniOverlayControllerProvider.notifier).setTripPageForeground(false);
      } else if (_isTripDetailsRoute(newRoute)) {
        _ref.read(tripMiniOverlayControllerProvider.notifier).setTripPageForeground(true);
      }
    });
  }
}

final tripRouteObserverProvider = Provider<TripRouteObserver>((ref) {
  return TripRouteObserver(ref);
});
