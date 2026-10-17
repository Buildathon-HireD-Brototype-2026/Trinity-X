import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/routing/route_names.dart';
import '../../../../core/storage/local_cache_service.dart';
import '../../../auth/presentation/controllers/driver_profile_controller.dart';
import '../../../trips/data/trip_native_bridge.dart';
import '../../../trips/domain/trip_model.dart';
import '../../application/navigation_launcher_service.dart';
import 'current_trip_provider.dart';

class TripMiniOverlayState {
  final bool isTripOngoing; // tripRunning
  final TripModel? ongoingTrip;
  final int elapsedSeconds;
  final bool miniDismissed; // Independent dismissal flag for mini UI
  final bool isOnTripPage; // Independent flag: whether driver is on Ongoing Trip page
  final bool isInPiPMode;
  final bool isPipSupported;
  final bool hasOverlayPermission;
  final String currentRoute;
  final bool isForeground;
  final bool isLowSpecDevice;
  final bool manualReduceAnimations;
  final bool isExitingToTripPage;
  final bool hasMainPageLoaded;

  const TripMiniOverlayState({
    this.isTripOngoing = false,
    this.ongoingTrip,
    this.elapsedSeconds = 0,
    this.miniDismissed = false,
    this.isOnTripPage = false,
    this.isInPiPMode = false,
    this.isPipSupported = false,
    this.hasOverlayPermission = false,
    this.currentRoute = '',
    this.isForeground = true,
    this.isLowSpecDevice = false,
    this.manualReduceAnimations = false,
    this.isExitingToTripPage = false,
    this.hasMainPageLoaded = false,
  });

  /// Single Source of Truth rule:
  /// The In-App mini card is shown only when:
  /// 1. The main dashboard page has loaded (!splash, !login)
  /// 2. A trip is currently ongoing (isTripOngoing / tripRunning)
  /// 3. The driver is NOT on the full ongoing trip screen (!isOnTripPage),
  ///    OR it is currently performing the exit animation into the trip screen
  /// 4. The mini float is NOT dismissed (!miniDismissed)
  /// 5. The app is NOT currently in Android Picture-in-Picture mode
  bool get shouldShowInAppMiniCard {
    if (!hasMainPageLoaded) return false;
    if (!isTripOngoing) return false;
    if (isOnTripPage && !isExitingToTripPage) return false;
    if (miniDismissed) return false;
    if (isInPiPMode) return false;

    // Explicitly forbidden on splash, login, or trip-details
    final isBlockedRoute = currentRoute == RouteNames.splash ||
        currentRoute == '/splash' ||
        currentRoute == RouteNames.login ||
        currentRoute == '/login' ||
        currentRoute == RouteNames.tripDetails ||
        currentRoute == '/trip-details';
    if (isBlockedRoute) return false;

    return true;
  }

  /// External mini UI (PiP or Overlay) should show when:
  /// 1. Trip is currently ongoing
  /// 2. mini is NOT dismissed
  bool get tripRunning =>
      isTripOngoing && (ongoingTrip == null || ongoingTrip!.isOngoing);

  /// Lite Mode is enabled for low-RAM / low-spec devices, or when
  /// manual 'Reduce animations' is toggled on.
  bool get isLiteMode => isLowSpecDevice || manualReduceAnimations;

  // Backwards compatibility helpers
  bool get isInAppVisible => !miniDismissed;
  bool get isOutsideOverlayVisible => !miniDismissed;

  String get formattedTime {
    final hrs = elapsedSeconds ~/ 3600;
    final mins = (elapsedSeconds % 3600) ~/ 60;
    final secs = elapsedSeconds % 60;
    if (hrs > 0) {
      return '${hrs.toString().padLeft(2, '0')}:${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
    }
    return '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  TripMiniOverlayState copyWith({
    bool? isTripOngoing,
    TripModel? ongoingTrip,
    int? elapsedSeconds,
    bool? miniDismissed,
    bool? isOnTripPage,
    bool? isInPiPMode,
    bool? isPipSupported,
    bool? hasOverlayPermission,
    String? currentRoute,
    bool? isForeground,
    bool? isLowSpecDevice,
    bool? manualReduceAnimations,
    bool? isExitingToTripPage,
    bool? hasMainPageLoaded,
  }) {
    return TripMiniOverlayState(
      isTripOngoing: isTripOngoing ?? this.isTripOngoing,
      ongoingTrip: ongoingTrip ?? this.ongoingTrip,
      elapsedSeconds: elapsedSeconds ?? this.elapsedSeconds,
      miniDismissed: miniDismissed ?? this.miniDismissed,
      isOnTripPage: isOnTripPage ?? this.isOnTripPage,
      isInPiPMode: isInPiPMode ?? this.isInPiPMode,
      isPipSupported: isPipSupported ?? this.isPipSupported,
      hasOverlayPermission: hasOverlayPermission ?? this.hasOverlayPermission,
      currentRoute: currentRoute ?? this.currentRoute,
      isForeground: isForeground ?? this.isForeground,
      isLowSpecDevice: isLowSpecDevice ?? this.isLowSpecDevice,
      manualReduceAnimations: manualReduceAnimations ?? this.manualReduceAnimations,
      isExitingToTripPage: isExitingToTripPage ?? this.isExitingToTripPage,
      hasMainPageLoaded: hasMainPageLoaded ?? this.hasMainPageLoaded,
    );
  }
}

final tripNativeBridgeProvider = Provider<TripNativeBridge>((ref) {
  final bridge = TripNativeBridge();
  ref.onDispose(() => bridge.dispose());
  return bridge;
});

class TripMiniOverlayNotifier extends StateNotifier<TripMiniOverlayState> {
  final Ref _ref;
  final SharedPreferences _prefs;
  final TripNativeBridge _bridge;

  Timer? _ticker;
  StreamSubscription? _overlayClosedSub;
  StreamSubscription? _openTripDetailsSub;
  StreamSubscription? _pipModeSub;

  static const _keyOngoingTripId = 'ongoing_trip_id_persistent';
  static const _keyOngoingStartedAt = 'ongoing_trip_started_at_ms';
  static const _keyMiniDismissed = 'ongoing_trip_mini_dismissed';
  static const _keyIsOnTripPage = 'ongoing_trip_is_on_trip_page';
  static const _keyReduceAnimations = 'reduce_animations_setting';
  static const _keyLastPosX = 'mini_float_pos_x';
  static const _keyLastPosY = 'mini_float_pos_y';

  TripMiniOverlayNotifier(this._ref, this._prefs, this._bridge)
      : super(const TripMiniOverlayState()) {
    _init();
  }

  Future<void> _init() async {
    // Check overlay and PiP hardware & permission status
    final hasPerm = await _bridge.checkOverlayPermission();
    final pipSupported = await _bridge.isPipSupported();
    if (!mounted) return;
    state = state.copyWith(
      hasOverlayPermission: hasPerm,
      isPipSupported: pipSupported,
    );

    // Detect device capabilities (low-RAM / old SDK) and stored reduce-animation setting
    await _checkDeviceCapabilities();
    if (!mounted) return;

    // Listen to outside overlay close events from Android native side
    _overlayClosedSub = _bridge.onOverlayClosedByUser.listen((_) {
      // User tapped 'X' on outside overlay: Close UI ONLY!
      // Trip, tracking, and ongoing notification remain completely active.
      debugPrint('[TripMiniOverlay] Outside overlay UI closed by user. Trip keeps running.');
      dismissInAppCard();
    });

    // Listen to tap on overlay or notification requesting to bring app to front
    _openTripDetailsSub = _bridge.onOpenTripDetailsFromOverlay.listen((_) {});

    // Listen to Picture-in-Picture mode transitions
    _pipModeSub = _bridge.onPictureInPictureModeChanged.listen((inPiP) {
      debugPrint('[TripMiniOverlay] Picture-in-Picture mode changed: $inPiP');
      state = state.copyWith(isInPiPMode: inPiP);
    });

    // Listen to all trips to detect ongoing status changes
    _ref.listen<AsyncValue<List<TripModel>>>(allTripsProvider, (_, next) {
      final trips = next.valueOrNull ?? [];
      _handleTripsUpdate(trips);
    }, fireImmediately: true);

    // Restore any persistent ongoing trip session (across process restart)
    _restoreOngoingTripSession();
  }

  Future<void> _checkDeviceCapabilities() async {
    final isLowRam = await _bridge.isLowRamDevice();
    if (!mounted) return;
    final manualReduce = _prefs.getBool(_keyReduceAnimations) ?? false;
    state = state.copyWith(
      isLowSpecDevice: isLowRam,
      manualReduceAnimations: manualReduce,
    );
  }

  void setReduceAnimations(bool reduce) {
    _prefs.setBool(_keyReduceAnimations, reduce);
    state = state.copyWith(manualReduceAnimations: reduce);
  }

  void _restoreOngoingTripSession() {
    final savedTripId = _prefs.getString(_keyOngoingTripId);
    final savedStartedAt = _prefs.getInt(_keyOngoingStartedAt);
    final savedDismissed = _prefs.getBool(_keyMiniDismissed) ?? false;
    final savedOnTripPage = _prefs.getBool(_keyIsOnTripPage) ?? false;

    if (savedTripId != null && savedStartedAt != null) {
      final elapsed = ((DateTime.now().millisecondsSinceEpoch - savedStartedAt) / 1000).floor();
      state = state.copyWith(
        elapsedSeconds: elapsed > 0 ? elapsed : 0,
        miniDismissed: savedDismissed,
        isOnTripPage: savedOnTripPage,
      );
    }
  }

  void _syncNativeTripState() {
    if (state.isTripOngoing) {
      _bridge.updateTripState(
        isTripRunning: state.isTripOngoing,
        miniDismissed: state.miniDismissed,
      );
      _bridge.setAutoEnterPiP(!state.miniDismissed);
    }
  }

  bool _hasInitialTripsLoaded = false;

  void _handleTripsUpdate(List<TripModel> trips) {
    // Find if any trip is ONGOING
    final ongoing = trips.where((t) => t.isOngoing).firstOrNull;

    if (ongoing != null) {
      // Rule: Ongoing trip automatically links duty to Online
      _ref.read(driverProfileProvider.notifier).setOnline(true);

      final isFirstLoad = !_hasInitialTripsLoaded;
      _hasInitialTripsLoaded = true;

      final wasOngoing = state.isTripOngoing;
      final isNewTrip = state.ongoingTrip?.tripId != ongoing.tripId;

      if (!wasOngoing || isNewTrip) {
        // Start tracking
        final startedAtMs = ongoing.startedAt?.millisecondsSinceEpoch ??
            DateTime.now().millisecondsSinceEpoch;
        _prefs.setString(_keyOngoingTripId, ongoing.tripId);
        _prefs.setInt(_keyOngoingStartedAt, startedAtMs);

        final initialElapsed = ((DateTime.now().millisecondsSinceEpoch - startedAtMs) / 1000).floor();

        state = state.copyWith(
          isTripOngoing: true,
          ongoingTrip: ongoing,
          elapsedSeconds: initialElapsed > 0 ? initialElapsed : 0,
          miniDismissed: false,
          hasMainPageLoaded: false,
        );
        _prefs.setBool(_keyMiniDismissed, false);

        _startTicker();

        // Start native foreground service without showing outside overlay while app is foreground
        _bridge.startTripService(
          trip: ongoing,
          elapsedSeconds: state.elapsedSeconds,
          overlayVisible: false,
        );
        _syncNativeTripState();

        // Auto-open navigation only on live transition observed while app is active
        if (isFirstLoad) {
          _ref.read(navigationLauncherServiceProvider).markAutoOpenedForTrip(ongoing.tripId);
        } else {
          _ref.read(navigationLauncherServiceProvider).handleTripStarted(ongoing);
        }
      } else {
        // Update ongoing trip details
        state = state.copyWith(ongoingTrip: ongoing);
        _bridge.updateTripService(
          trip: ongoing,
          elapsedSeconds: state.elapsedSeconds,
        );
      }
    } else {
      // No ongoing trip: If we were previously tracking, shut down cleanly
      if (state.isTripOngoing) {
        _stopTracking();
      }
    }
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!state.isTripOngoing) {
        _ticker?.cancel();
        return;
      }

      // Performance rule: Pause updates when app in background without overlay
      if (!state.isForeground && (state.miniDismissed || !state.hasOverlayPermission)) {
        return;
      }

      final newSeconds = state.elapsedSeconds + 1;
      state = state.copyWith(elapsedSeconds: newSeconds);

      // Periodically sync with native service every 5 seconds if running in foreground
      if (newSeconds % 5 == 0 && state.ongoingTrip != null && state.isForeground) {
        _bridge.updateTripService(
          trip: state.ongoingTrip!,
          elapsedSeconds: newSeconds,
        );
      }
    });
  }

  void _stopTracking() {
    _ticker?.cancel();
    _ticker = null;

    _prefs.remove(_keyOngoingTripId);
    _prefs.remove(_keyOngoingStartedAt);
    _prefs.remove(_keyMiniDismissed);
    _prefs.remove(_keyIsOnTripPage);

    state = state.copyWith(
      isTripOngoing: false,
      ongoingTrip: null,
      elapsedSeconds: 0,
      miniDismissed: false,
      isOnTripPage: false,
      isExitingToTripPage: false,
      isInPiPMode: false,
    );

    // Stop native foreground service, removing overlay, PiP, & notification
    _bridge.setAutoEnterPiP(false);
    _bridge.updateTripState(isTripRunning: false, miniDismissed: false);
    _bridge.stopTripService();
  }

  /// Triggered as soon as a push to the Ongoing Trip page begins.
  /// Triggered as soon as a push to the Ongoing Trip page begins.
  /// If mini was dismissed (X): do nothing visible, set isOnTripPage = true.
  /// If mini was visible: trigger exit animation with isExitingToTripPage = true.
  void startExitToTripPage() {
    if (state.miniDismissed) {
      state = state.copyWith(
        isOnTripPage: true,
        isExitingToTripPage: false,
      );
      _prefs.setBool(_keyIsOnTripPage, true);
      _syncNativeTripState();
      return;
    }

    if (state.isOnTripPage && !state.isExitingToTripPage) {
      return;
    }

    state = state.copyWith(
      isOnTripPage: true,
      isExitingToTripPage: true,
    );
    _prefs.setBool(_keyIsOnTripPage, true);
    _syncNativeTripState();
  }

  /// Called when the exit animation finishes to cleanly remove the widget from the tree.
  void completeExitToTripPage() {
    if (state.isExitingToTripPage) {
      state = state.copyWith(isExitingToTripPage: false);
    }
  }

  /// Called when the Ongoing Trip page is pushed or popped.
  /// On push: set isOnTripPage = true, hide floating overlay.
  /// On pop: set isOnTripPage = false; if tripRunning and not dismissed, the mini float appears.
  void setTripPageForeground(bool inForeground) {
    if (inForeground) {
      state = state.copyWith(
        isOnTripPage: true,
        isExitingToTripPage: false,
      );
      _prefs.setBool(_keyIsOnTripPage, true);
      _syncNativeTripState();
      // Floating overlay is NOT needed while viewing full Ongoing Trip Details screen
      _bridge.setOverlayVisible(false);
    } else {
      state = state.copyWith(
        isOnTripPage: false,
        isExitingToTripPage: false,
        hasMainPageLoaded: true,
      );
      _prefs.setBool(_keyIsOnTripPage, false);
      // Floating overlay stays hidden while app is open in foreground.
      // It only appears outside the app when in background.
      if (!state.isForeground && state.isTripOngoing && !state.miniDismissed) {
        _bridge.setOverlayVisible(true);
      }
    }
  }

  /// Updates on-trip-page state without un-dismissing mini float
  void resetDismissedState() {
    state = state.copyWith(
      isOnTripPage: true,
      isExitingToTripPage: false,
    );
    _prefs.setBool(_keyIsOnTripPage, true);
    _syncNativeTripState();
    _bridge.setOverlayVisible(false);
  }

  /// Called whenever the GoRouter navigation changes.
  void updateCurrentRoute(String route) {
    final isSplashOrLogin = route.isEmpty ||
        route == RouteNames.splash ||
        route == '/splash' ||
        route == RouteNames.login ||
        route == '/login';
    final isHome = route == RouteNames.home || route == '/home';

    state = state.copyWith(
      currentRoute: route,
      hasMainPageLoaded: isSplashOrLogin ? false : (state.hasMainPageLoaded || isHome),
    );
    if (route == '/trip-details' || route == RouteNames.tripDetails) {
      setTripPageForeground(true);
    } else if (state.isOnTripPage && route != '/trip-details' && route != RouteNames.tripDetails) {
      setTripPageForeground(false);
    }
  }

  /// Explicitly marks that the main dashboard page has completed loading its data.
  void setMainPageLoaded(bool loaded) {
    if (state.hasMainPageLoaded != loaded) {
      state = state.copyWith(hasMainPageLoaded: loaded);
    }
  }

  /// Called on AppLifecycleState changes (foreground/background transitions).
  void handleLifecycleChange(AppLifecycleState lifecycle) {
    if (!mounted || lifecycle == AppLifecycleState.detached) return;
    final isFg = lifecycle == AppLifecycleState.resumed;
    state = state.copyWith(isForeground: isFg);

    if (state.isTripOngoing && state.ongoingTrip != null) {
      if (isFg) {
        // When app is open / foreground: mini float must disappear!
        _bridge.setOverlayVisible(false);
        checkOverlayPermission();
        _syncNativeTripState();
      } else {
        // App is moving to background (Home gesture, app switch, etc.):
        _bridge.updateTripService(
          trip: state.ongoingTrip!,
          elapsedSeconds: state.elapsedSeconds,
        );

        // When leaving the app during an ongoing trip, floating overlay appears outside unless dismissed by user
        if (!state.miniDismissed) {
          _bridge.setOverlayVisible(true);
        }
      }
    }
  }

  /// Closes ONLY the mini UI (trip, tracking, and notification keep running).
  void dismissInAppCard() {
    state = state.copyWith(miniDismissed: true);
    _prefs.setBool(_keyMiniDismissed, true);
    _syncNativeTripState();
    _bridge.setOverlayVisible(false);
  }

  /// Alias for dismissing any mini float UI
  void dismissMiniFloat() => dismissInAppCard();

  /// Restores mini float visibility.
  void showInAppCard() {
    state = state.copyWith(miniDismissed: false);
    _prefs.setBool(_keyMiniDismissed, false);
    _syncNativeTripState();
  }

  /// Save and load last dragged screen position for persistence across app restarts
  void saveLastPosition(double dx, double dy) {
    _prefs.setDouble(_keyLastPosX, dx);
    _prefs.setDouble(_keyLastPosY, dy);
  }

  Offset? getLastPosition() {
    final x = _prefs.getDouble(_keyLastPosX);
    final y = _prefs.getDouble(_keyLastPosY);
    if (x != null && y != null) {
      return Offset(x, y);
    }
    return null;
  }

  /// Controls the outside overlay UI visibility.
  Future<void> setOutsideOverlayVisible(bool visible) async {
    state = state.copyWith(miniDismissed: !visible);
    _prefs.setBool(_keyMiniDismissed, !visible);
    _syncNativeTripState();
    if (state.isTripOngoing) {
      await _bridge.setOverlayVisible(visible);
    }
  }

  Future<bool> checkOverlayPermission() async {
    final granted = await _bridge.checkOverlayPermission();
    state = state.copyWith(hasOverlayPermission: granted);
    return granted;
  }

  Future<bool> requestOverlayPermission() async {
    final res = await _bridge.requestOverlayPermission();
    await checkOverlayPermission();
    return res;
  }

  /// When Back is pressed at root while tripRunning == true:
  /// Sends the app to the background (moveTaskToBack or PiP) and shows outside mini view.
  /// Trip keeps running and app stays in Recents.
  /// If tripRunning is false, normal system exit occurs.
  Future<void> sendAppToBackgroundWithMini() async {
    // Single source of truth check right now (never from stale copy)
    if (!state.tripRunning) {
      await SystemNavigator.pop();
      return;
    }

    // When backing out from any page to close/minimize app during an ongoing trip:
    // Always show outside floating overlay and send to background
    await _bridge.sendToBackgroundWithMini();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _overlayClosedSub?.cancel();
    _openTripDetailsSub?.cancel();
    _pipModeSub?.cancel();
    super.dispose();
  }
}

final tripMiniOverlayControllerProvider =
    StateNotifierProvider<TripMiniOverlayNotifier, TripMiniOverlayState>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  final bridge = ref.watch(tripNativeBridgeProvider);
  return TripMiniOverlayNotifier(ref, prefs, bridge);
});
