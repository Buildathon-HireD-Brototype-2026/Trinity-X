import 'package:flutter/material.dart';
import '../errors/app_error.dart';
import '../errors/error_mapper.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Full-screen or container error presentation widget.
///
/// Features:
/// - Friendly user message in plain English.
/// - Unobtrusive grey support reference code (e.g., "Ref: HD-NET-01").
/// - Actionable Retry button (when [AppError.canRetry] is true).
/// - Guaranteed zero technical leaks (no URLs, ports, status codes, JSON).
class AppErrorView extends StatelessWidget {
  final AppError error;
  final VoidCallback? onRetry;
  final String? retryLabel;

  const AppErrorView({
    super.key,
    required this.error,
    this.onRetry,
    this.retryLabel = 'Try Again',
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Safe Error Icon
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.errorBg,
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.error.withValues(alpha: 0.25),
                  width: 1.5,
                ),
              ),
              child: const Icon(
                Icons.error_outline_rounded,
                color: AppColors.error,
                size: 34,
              ),
            ),
            const SizedBox(height: 20),

            // Friendly User Message
            Text(
              error.userMessage,
              textAlign: TextAlign.center,
              style: AppTextStyles.bodyLarge.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 8),

            // Support Reference Code
            Text(
              error.formattedRef,
              key: const Key('app_error_ref_code'),
              textAlign: TextAlign.center,
              style: AppTextStyles.bodySmall.copyWith(
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 24),

            // Retry Button
            if (error.canRetry && onRetry != null)
              ElevatedButton.icon(
                key: const Key('app_error_retry_button'),
                onPressed: onRetry,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 0,
                ),
                icon: const Icon(Icons.refresh_rounded, size: 20),
                label: Text(
                  retryLabel ?? 'Try Again',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Centralized SnackBar helper for small ephemeral errors.
class AppSnackBar {
  AppSnackBar._();

  static void showError(
    BuildContext context,
    AppError error, {
    VoidCallback? onRetry,
    Duration duration = const Duration(seconds: 4),
  }) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;

    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF1F2937),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(color: AppColors.error.withValues(alpha: 0.4)),
        ),
        margin: const EdgeInsets.all(16),
        duration: duration,
        content: Row(
          children: [
            const Icon(Icons.info_outline_rounded, color: AppColors.error, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    error.userMessage,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    error.formattedRef,
                    style: TextStyle(
                      color: Colors.grey.shade400,
                      fontSize: 11,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        action: (error.canRetry && onRetry != null)
            ? SnackBarAction(
                label: 'Retry',
                textColor: AppColors.primaryLight,
                onPressed: onRetry,
              )
            : null,
      ),
    );
  }

  /// Convenience overload taking any dynamic error and mapping it before displaying.
  static void show(
    BuildContext context,
    dynamic error, {
    String? contextTag,
    VoidCallback? onRetry,
  }) {
    final appErr = error is AppError ? error : ErrorMapper.map(error, context: contextTag);
    showError(context, appErr, onRetry: onRetry);
  }
}
