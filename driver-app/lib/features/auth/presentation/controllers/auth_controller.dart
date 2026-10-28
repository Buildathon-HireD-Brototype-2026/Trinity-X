import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../data/auth_repository.dart';
import '../../domain/driver_model.dart';

/// The 3 distinct states of authentication required by PRD & task specifications.
enum AuthStatus {
  /// App is reading stored session from secure storage (cold-start / bootstrap).
  unknown,

  /// Valid driver session exists in secure storage.
  authenticated,

  /// No valid session, logged out, corrupted session, or server 401 rejection.
  unauthenticated,
}

/// Represents the global authentication state of the application.
class AuthState {
  final AuthStatus status;
  final DriverModel? driver;
  final String? accessToken;
  final String? sessionExpiredMessage;

  const AuthState({
    required this.status,
    this.driver,
    this.accessToken,
    this.sessionExpiredMessage,
  });

  const AuthState.unknown() : this(status: AuthStatus.unknown);

  const AuthState.authenticated({
    required DriverModel driver,
    required String accessToken,
  }) : this(
          status: AuthStatus.authenticated,
          driver: driver,
          accessToken: accessToken,
        );

  const AuthState.unauthenticated({String? sessionExpiredMessage})
      : this(
          status: AuthStatus.unauthenticated,
          sessionExpiredMessage: sessionExpiredMessage,
        );

  bool get isUnknown => status == AuthStatus.unknown;
  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isUnauthenticated => status == AuthStatus.unauthenticated;
}

/// Global provider for AuthController managing session lifecycle.
final authControllerProvider = NotifierProvider<AuthController, AuthState>(() {
  return AuthController();
});

/// Manages cold-start session bootstrap, login state, 401 session expiry, and logout.
class AuthController extends Notifier<AuthState> {
  SecureStorageService get _secureStorage => ref.read(secureStorageServiceProvider);
  AuthRepository get _authRepository => ref.read(authRepositoryProvider);

  @override
  AuthState build() {
    // Start in unknown state on launch
    Future.microtask(() => bootstrap());
    return const AuthState.unknown();
  }

  /// Cold-start bootstrap: reads secure storage asynchronously and sets auth state.
  Future<void> bootstrap() async {
    try {
      final session = await _secureStorage.getStoredSession();
      if (session == null) {
        state = const AuthState.unauthenticated();
        return;
      }

      // Valid session found: hydrate driver profile
      DriverModel? driver = await _authRepository.getCachedDriver();
      if (driver == null || driver.id != session.driverId) {
        try {
          driver = await _authRepository.fetchRemoteDriver(session.driverId);
        } catch (_) {
          // Fallback if offline: create baseline model from securely stored session
          driver = DriverModel(
            id: session.driverId,
            name: session.driverName,
            phone: '',
            status: 'ACTIVE',
            isOnline: true,
            rating: 5.0,
            totalTrips: 0,
          );
        }
      }

      state = AuthState.authenticated(
        driver: driver,
        accessToken: session.accessToken,
      );
    } catch (_) {
      // Any error during bootstrap treats session as unauthenticated without crashing
      state = const AuthState.unauthenticated();
    }
  }

  /// Sets authenticated state after successful login.
  void setAuthenticated({
    required DriverModel driver,
    required String accessToken,
  }) {
    state = AuthState.authenticated(
      driver: driver,
      accessToken: accessToken,
    );
  }

  /// Clears secure storage, clears cache, and resets state to unauthenticated.
  Future<void> logout() async {
    await _authRepository.logout();
    state = const AuthState.unauthenticated();
  }

  /// Attempts silent background refresh of session tokens using stored refresh_token.
  /// Returns the new access token if successful, or null if refresh token is expired/revoked.
  Future<String?> refreshSession() async {
    try {
      final session = await _secureStorage.getStoredSession();
      if (session == null || session.refreshToken.isEmpty) {
        await handleSessionExpired('Active session expired. Please log in again.');
        return null;
      }

      final newTokens = await _authRepository.refreshSession(session.refreshToken);
      if (state.driver != null) {
        state = AuthState.authenticated(
          driver: state.driver!,
          accessToken: newTokens.accessToken,
        );
      }
      return newTokens.accessToken;
    } catch (_) {
      await handleSessionExpired('Active session expired. Please log in again.');
      return null;
    }
  }

  /// Handles 401 server rejection / session revocation per user specification.
  Future<void> handleSessionExpired([
    String message = 'Active session expired. Please log in again.',
  ]) async {
    await _authRepository.logout();
    state = AuthState.unauthenticated(sessionExpiredMessage: message);
  }
}
