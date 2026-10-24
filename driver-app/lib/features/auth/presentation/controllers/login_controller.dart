import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/errors/app_error.dart';
import '../../../../core/errors/error_mapper.dart';
import '../../../../core/errors/error_messages.dart';
import '../../../../core/utils/phone_utils.dart';
import '../../data/auth_repository.dart';
import '../../domain/driver_model.dart';

/// Represents the immutable UI state of the Driver Login screen.
///
/// Follows standard Riverpod StateNotifier pattern:
/// - [isLoading]: Active network authentication request in flight.
/// - [errorMessage]: Actionable error displayed in the error banner.
/// - [warningMessage]: Supportive banner for PENDING/INACTIVE driver accounts (PRD D-01).
/// - [appError]: Strongly-typed application error with support reference code.
/// - [driver]: Authenticated driver model after successful verification.
/// - [isSuccess]: Flag indicating authentication succeeded and navigation can proceed.
class LoginState {
  final bool isLoading;
  final String? errorMessage;
  final String? warningMessage;
  final AppError? appError;
  final DriverModel? driver;
  final bool isSuccess;

  const LoginState({
    this.isLoading = false,
    this.errorMessage,
    this.warningMessage,
    this.appError,
    this.driver,
    this.isSuccess = false,
  });

  LoginState copyWith({
    bool? isLoading,
    String? errorMessage,
    String? warningMessage,
    AppError? appError,
    DriverModel? driver,
    bool? isSuccess,
    bool clearError = false,
    bool clearWarning = false,
  }) {
    return LoginState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      warningMessage: clearWarning ? null : (warningMessage ?? this.warningMessage),
      appError: clearError ? null : (appError ?? this.appError),
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
      return 'Enter a valid 10-digit phone number';
    }
    final clean = value.replaceAll(RegExp(r'\D'), '');
    if (clean.length < 10) {
      return 'Enter a valid 10-digit phone number';
    }
    if (!PhoneUtils.isValidIndianPhone(value)) {
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
      return ErrorMessages.validationPassword;
    }
    return null;
  }

  DateTime? _lastSubmitTime;

  /// Executes driver login against [AuthRepository] (PRD D-01).
  ///
  /// - Guards against rapid multi-click submission spam (1200ms debounce).
  /// - Uses [ErrorMapper] to map all network, auth, and server failures into typed [AppError].
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
      state = state.copyWith(
        errorMessage: phoneError,
        appError: AppError.validation(customMessage: phoneError),
      );
      return false;
    }
    if (passwordError != null) {
      state = state.copyWith(
        errorMessage: passwordError,
        appError: AppError.validation(customMessage: passwordError),
      );
      return false;
    }

    state = state.copyWith(isLoading: true, clearError: true, clearWarning: true);

    try {
      final result = await _authRepository.login(phone: phone, password: password);
      final driver = result.driver;

      if (!driver.isActive) {
        final err = AppError.authAccountInactive();
        state = state.copyWith(
          isLoading: false,
          warningMessage: driver.isPending
              ? 'Your account is awaiting admin activation.'
              : err.userMessage,
          appError: err,
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
    } catch (e) {
      final appErr = ErrorMapper.map(e, context: 'login');
      state = state.copyWith(
        isLoading: false,
        errorMessage: appErr.userMessage,
        appError: appErr,
      );
      return false;
    }
  }
}
