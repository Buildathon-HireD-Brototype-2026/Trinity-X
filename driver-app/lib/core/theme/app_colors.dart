import 'package:flutter/material.dart';

/// HireD Brand Colors extracted from logo and Admin Design Reference.
/// Main Brand Purple: #6E2894
class AppColors {
  AppColors._();

  // Primary Brand Colors (#605DBA)
  static const Color primary = Color(0xFF605DBA);
  static const Color primaryDark = Color(0xFF484594);
  static const Color primaryLight = Color(0xFF7E7BD0);
  static const Color primaryTint = Color(0xFFEEEDF9);

  // Secondary & Accents
  static const Color secondary = Color(0xFF2C3E50);
  static const Color accent = Color(0xFF8E44AD);

  // Status & Alerts
  static const Color success = Color(0xFF22C55E);
  static const Color successBg = Color(0xFFDCFCE7);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningBg = Color(0xFFFEF3C7);
  static const Color error = Color(0xFFEF4444);
  static const Color errorBg = Color(0xFFFEE2E2);
  static const Color info = Color(0xFF3B82F6);
  static const Color infoBg = Color(0xFFDBEAFE);

  // Neutrals / Surfaces
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Colors.white;
  static const Color cardBg = Colors.white;
  static const Color border = Color(0xFFE2E8F0);
  static const Color divider = Color(0xFFEEF2F6);

  // Typography
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textOnPrimary = Colors.white;

  // Duty Status Colors
  static const Color dutyOnline = Color(0xFF10B981);
  static const Color dutyOffline = Color(0xFF64748B);
}
