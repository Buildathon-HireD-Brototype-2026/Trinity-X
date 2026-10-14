import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/storage/local_cache_service.dart';
import '../../features/auth/presentation/controllers/auth_controller.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/home/presentation/home_dashboard_screen.dart';
import '../../features/profile/presentation/documents_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/trips/presentation/trip_details_screen.dart';
import '../../features/trips/presentation/trips_screen.dart';
import 'route_names.dart';

/// Bridges Riverpod AuthState updates to GoRouter's refreshListenable.
class AuthRouterListenable extends ChangeNotifier {
  final Ref _ref;

  AuthRouterListenable(this._ref) {
    _ref.listen<AuthState>(authControllerProvider, (_, __) {
      notifyListeners();
    });
  }
}

final authRouterListenableProvider = Provider<AuthRouterListenable>((ref) {
  return AuthRouterListenable(ref);
});

final appRouterProvider = Provider<GoRouter>((ref) {
  final refreshListenable = ref.watch(authRouterListenableProvider);
  final prefs = ref.watch(sharedPreferencesProvider);

  return GoRouter(
    initialLocation: RouteNames.splash,
    refreshListenable: refreshListenable,
    redirect: (BuildContext context, GoRouterState state) {
      final authState = ref.read(authControllerProvider);
      final currentLoc = state.uri.path;
      final isSplash = currentLoc == RouteNames.splash;
      final isLogin = currentLoc == RouteNames.login;
      final isAuthRoute = isSplash || isLogin;

      switch (authState.status) {
        case AuthStatus.unknown:
          // Stay on splash while checking session asynchronously (no flicker)
          return isSplash ? null : RouteNames.splash;

        case AuthStatus.authenticated:
          // Authenticated: check if returning from camera or document upload
          if (isAuthRoute) {
            final pendingDoc = prefs.getString('pending_upload_doc_type');
            final activeRoute = prefs.getString('active_route');
            if (pendingDoc != null || activeRoute == RouteNames.documents) {
              return RouteNames.documents;
            }
            return RouteNames.home;
          }
          return null;

        case AuthStatus.unauthenticated:
          // Unauthenticated: any protected route redirects to /login
          if (!isLogin) {
            return RouteNames.login;
          }
          return null;
      }
    },
    routes: [
      GoRoute(
        path: RouteNames.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RouteNames.home,
        builder: (context, state) => const HomeDashboardScreen(),
      ),
      GoRoute(
        path: RouteNames.profile,
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: RouteNames.documents,
        builder: (context, state) => const DocumentsScreen(),
      ),
      GoRoute(
        path: RouteNames.trips,
        builder: (context, state) => const TripsScreen(),
      ),
      GoRoute(
        path: RouteNames.tripDetails,
        builder: (context, state) => const TripDetailsScreen(),
      ),
    ],
  );
});
