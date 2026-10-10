import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/routing/route_names.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_loading_indicator.dart';
import 'controllers/auth_controller.dart';
import 'controllers/login_controller.dart';
import 'controllers/driver_profile_controller.dart';

/// Page 1: Driver Partner Login Screen (`PRD D-01`).
///
/// Ergonomically designed for mobile drivers:
/// - 10-digit phone input with fixed +91 prefix and numeric keypad constraint.
/// - Obscured password input with visibility toggle (TC-P01-07).
/// - 5-attempt security lockout banner with live countdown timer (TC-P01-05).
/// - Supportive guidance banner for PENDING / INACTIVE accounts (TC-P01-06).
/// - Large 52dp touch target styled with HireD brand theme (#605DBA).
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  // Global form key for client-side field validation triggers
  final _formKey = GlobalKey<FormState>();
  
  // Controllers for form fields
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  // State variable controlling password visibility toggle
  bool _obscurePassword = true;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onLoginPressed() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final success = await ref.read(loginControllerProvider.notifier).login(
          _phoneController.text.trim(),
          _passwordController.text,
        );

    if (success && mounted) {
      final session = await ref.read(secureStorageServiceProvider).getStoredSession();
      final driver = ref.read(loginControllerProvider).driver;
      if (session != null && driver != null) {
        ref.read(authControllerProvider.notifier).setAuthenticated(
              driver: driver,
              accessToken: session.accessToken,
            );
      }
      // Re-initialize driver profile provider with new session
      await ref.read(driverProfileProvider.notifier).initProfile();
      if (!mounted) return;
      context.go(RouteNames.home);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final loginState = ref.watch(loginControllerProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Brand Logo
                    Center(
                      child: Image.asset(
                        'assets/images/logo.png',
                        height: 72,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) {
                          return const Text(
                            'HireD',
                            style: TextStyle(
                              fontSize: 38,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                              letterSpacing: -0.5,
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Title & Subtitle
                    Text(
                      'Driver Partner Login',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.headlineSmall.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Welcome back! Enter your registered details.',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Session Expired Banner (Server 401 Rejection)
                    if (authState.sessionExpiredMessage != null) ...[
                      Container(
                        key: const Key('session_expired_banner'),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.errorBg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 24),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                authState.sessionExpiredMessage!,
                                style: const TextStyle(
                                  color: AppColors.error,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Inactive / Pending Account Banner
                    if (loginState.warningMessage != null) ...[
                      Container(
                        key: const Key('warning_banner'),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.warningBg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline, color: AppColors.warning, size: 24),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                loginState.warningMessage!,
                                style: const TextStyle(
                                  color: Color(0xFF92400E),
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // General Error Banner
                    if (loginState.errorMessage != null) ...[
                      Container(
                        key: const Key('error_banner'),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.errorBg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: AppColors.error, size: 22),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                loginState.errorMessage!,
                                style: const TextStyle(
                                  color: AppColors.error,
                                  fontWeight: FontWeight.w500,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Phone Number Input Card
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Phone Field Label
                          const Text(
                            'Phone Number',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 8),

                          TextFormField(
                            key: const Key('phone_input_field'),
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            textInputAction: TextInputAction.next,
                            enabled: !loginState.isLoading,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(10),
                            ],
                            decoration: InputDecoration(
                              hintText: '98765 43210',
                              prefixIcon: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                child: const Text(
                                  '+91',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                              prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
                              suffixIcon: const Icon(Icons.phone_android, color: AppColors.textMuted),
                            ),
                            validator: (value) =>
                                ref.read(loginControllerProvider.notifier).validatePhone(value),
                          ),
                          const SizedBox(height: 20),

                          // Password Field Label
                          const Text(
                            'Password',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 8),

                          TextFormField(
                            key: const Key('password_input_field'),
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            textInputAction: TextInputAction.done,
                            enabled: !loginState.isLoading,
                            onFieldSubmitted: (_) => _onLoginPressed(),
                            decoration: InputDecoration(
                              hintText: '••••••••',
                              prefixIcon: const Icon(Icons.lock_outline, color: AppColors.textMuted),
                              suffixIcon: IconButton(
                                key: const Key('toggle_password_visibility_button'),
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                  color: AppColors.textMuted,
                                ),
                                onPressed: () {
                                  setState(() {
                                    _obscurePassword = !_obscurePassword;
                                  });
                                },
                              ),
                            ),
                            validator: (value) =>
                                ref.read(loginControllerProvider.notifier).validatePassword(value),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Submit Button
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        key: const Key('login_submit_button'),
                        onPressed: loginState.isLoading ? null : _onLoginPressed,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: loginState.isLoading
                            ? const AppLoadingIndicator(
                                size: 24,
                                color: Colors.white,
                              )
                            : const Text(
                                'Log In',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Demo Helper Credentials
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primaryTint,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Demo Partner Credentials:',
                            style: AppTextStyles.labelSmall.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '• Active: 9876543210 | Driver@123\n• Pending: 9876543211 | Driver@123',
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
