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
/// - [driver]: Authenticated driver model after successful verification.
/// - [isSuccess]: Flag indicating authentication succeeded and navigation can proceed.
class LoginState {
  final bool isLoading;
  final String? errorMessage;
  final String? warningMessage;
  final DriverModel? driver;
  final bool isSuccess;

  const LoginState({
    this.isLoading = false,
    this.errorMessage,
    this.warningMessage,
    this.driver,
    this.isSuccess = false,
  });

  LoginState copyWith({
    bool? isLoading,
    String? errorMessage,
    String? warningMessage,
    DriverModel? driver,
    bool? isSuccess,
    bool clearError = false,
    bool clearWarning = false,
  }) {
    return LoginState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      warningMessage: clearWarning ? null : (warningMessage ?? this.warningMessage),
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
/// and account activation checks.
class LoginController extends StateNotifier<LoginState> {
  final AuthRepository _authRepository;

  LoginController(this._authRepository) : super(const LoginState());

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

  DateTime? _lastSubmitTime;

  /// Executes driver login against [AuthRepository] (PRD D-01).
  ///
  /// - Guards against rapid multi-click submission spam (1200ms debounce).
  /// - Handles [AuthException] for wrong credentials and HTTP 429 rate limits.
  /// - If account is PENDING/INACTIVE, surfaces supportive banner guidance (TC-P01-06).
  Future<bool> login(String phone, String password) async {
    final now = DateTime.now();
    if (_lastSubmitTime != null && now.difference(_lastSubmitTime!).inMilliseconds < 1200) {
      return false; // Prevent rapid multi-clicks
    }
    _lastSubmitTime = now;

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
      );
      return true;
    } on AuthException catch (e) {
      final isRateLimited = e.message.contains('429') ||
          e.message.toLowerCase().contains('too many') ||
          e.message.toLowerCase().contains('rate limit');

      state = state.copyWith(
        isLoading: false,
        errorMessage: isRateLimited
            ? 'Too many login attempts. Please wait 60 seconds before trying again.'
            : e.message,
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Connection error. Please try again.',
      );
      return false;
    }
  }
}
