import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/auth_repository.dart';
import '../../domain/driver_model.dart';

/// Represents the immutable UI state of the Driver Login screen.
///
/// Follows standard Riverpod StateNotifier pattern:
/// - [isLoading]: Active network authentication request in flight.
/// - [errorMessage]: Actionable error displayed in the red error banner.
/// - [warningMessage]: Supportive banner for PENDING/INACTIVE driver accounts (PRD D-01).
/// - [failedAttempts]: Counter tracking consecutive password failures (PRD security rule).
/// - [lockoutUntil]: Timestamp until which login is strictly locked (15-min lockout on 5th failure).
/// - [driver]: Authenticated driver model after successful verification.
/// - [isSuccess]: Flag indicating authentication succeeded and navigation can proceed.
class LoginState {
  final bool isLoading;
  final String? errorMessage;
  final String? warningMessage;
  final int failedAttempts;
  final DateTime? lockoutUntil;
  final DriverModel? driver;
  final bool isSuccess;

  const LoginState({
    this.isLoading = false,
    this.errorMessage,
    this.warningMessage,
    this.failedAttempts = 0,
    this.lockoutUntil,
    this.driver,
    this.isSuccess = false,
  });

  /// Returns true if the account is currently within an active 15-minute security lockout window.
  bool get isLockedOut {
    if (lockoutUntil == null) return false;
    return DateTime.now().isBefore(lockoutUntil!);
  }

  /// Calculates remaining seconds in the lockout window for the live UI countdown timer.
  int get remainingLockoutSeconds {
    if (lockoutUntil == null) return 0;
    final diff = lockoutUntil!.difference(DateTime.now()).inSeconds;
    return diff > 0 ? diff : 0;
  }

  LoginState copyWith({
    bool? isLoading,
    String? errorMessage,
    String? warningMessage,
    int? failedAttempts,
    DateTime? lockoutUntil,
    DriverModel? driver,
    bool? isSuccess,
    bool clearError = false,
    bool clearWarning = false,
  }) {
    return LoginState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      warningMessage: clearWarning ? null : (warningMessage ?? this.warningMessage),
      failedAttempts: failedAttempts ?? this.failedAttempts,
      lockoutUntil: lockoutUntil ?? this.lockoutUntil,
      driver: driver ?? this.driver,
      isSuccess: isSuccess ?? this.isSuccess,
    );
  }
}

/// Dependency injection provider for the login state controller.
final loginControllerProvider = StateNotifierProvider<LoginController, LoginState>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);
  return LoginController(authRepository);
});

/// Manages Driver Login business logic, phone & password validations,
/// 5-attempt brute-force lockout, and account activation checks.
class LoginController extends StateNotifier<LoginState> {
  final AuthRepository _authRepository;
  Timer? _lockoutTimer;

  LoginController(this._authRepository) : super(const LoginState());

  @override
  void dispose() {
    _lockoutTimer?.cancel();
    super.dispose();
  }

  /// Validates standard Indian 10-digit mobile phone number (PRD TC-P01-03).
  String? validatePhone(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter your phone number';
    }
    final clean = value.replaceAll(RegExp(r'\D'), '');
    if (clean.length != 10) {
      return 'Enter a valid 10-digit phone number';
    }
    return null;
  }

  /// Enforces minimum 6-character password constraint.
  String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please enter your password';
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  }

  /// Executes driver login against [AuthRepository] (PRD D-01).
  ///
  /// - Enforces 15-minute lockout if [state.isLockedOut] is true.
  /// - Handles [AuthException] for wrong credentials and increments failed attempts counter.
  /// - Automatically triggers 15-minute lockout on the 5th consecutive failure.
  /// - If account is PENDING/INACTIVE, surfaces supportive banner guidance (TC-P01-06).
  Future<bool> login(String phone, String password) async {
    if (state.isLockedOut) {
      return false;
    }

    final phoneError = validatePhone(phone);
    final passwordError = validatePassword(password);
    if (phoneError != null) {
      state = state.copyWith(errorMessage: phoneError);
      return false;
    }
    if (passwordError != null) {
      state = state.copyWith(errorMessage: passwordError);
      return false;
    }

    state = state.copyWith(isLoading: true, clearError: true, clearWarning: true);

    try {
      final result = await _authRepository.login(phone: phone, password: password);
      final driver = result.driver;

      if (!driver.isActive) {
        state = state.copyWith(
          isLoading: false,
          warningMessage: driver.isPending
              ? 'Your account is awaiting admin activation.'
              : 'Your account is inactive. Please contact support.',
          driver: driver,
          isSuccess: true, // Still allow authenticated viewing of their documents & status
        );
        return true;
      }

      state = state.copyWith(
        isLoading: false,
        driver: driver,
        isSuccess: true,
        failedAttempts: 0,
      );
      return true;
    } on AuthException catch (e) {
      final newAttempts = state.failedAttempts + 1;
      if (newAttempts >= 5) {
        final lockUntil = DateTime.now().add(const Duration(minutes: 15));
        state = state.copyWith(
          isLoading: false,
          failedAttempts: newAttempts,
          lockoutUntil: lockUntil,
          errorMessage: 'Account locked for 15 minutes due to 5 failed attempts.',
        );
        _startLockoutTimer();
      } else {
        state = state.copyWith(
          isLoading: false,
          failedAttempts: newAttempts,
          errorMessage: e.message.contains('password')
              ? 'Incorrect password. Attempt $newAttempts of 5 before lockout.'
              : e.message,
        );
      }
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Connection error. Please try again.',
      );
      return false;
    }
  }

  void _startLockoutTimer() {
    _lockoutTimer?.cancel();
    _lockoutTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!state.isLockedOut) {
        timer.cancel();
        state = state.copyWith(
          failedAttempts: 0,
          lockoutUntil: null,
          clearError: true,
        );
      } else {
        // Trigger state refresh for countdown
        state = state.copyWith();
      }
    });
  }

  void resetLockoutForTesting() {
    _lockoutTimer?.cancel();
    state = const LoginState();
  }
}
