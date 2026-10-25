import 'package:flutter/material.dart';

/// ThemeExtension providing custom design tokens for Light and Dark modes.
class AppThemeColors extends ThemeExtension<AppThemeColors> {
  final Color pageBackground;
  final Color cardBackground;
  final Color innerBox;
  final Color border;
  final Color divider;
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;
  final Color unselectedIcon;
  final Color primaryButton;
  final Color purpleAccent;
  final Color purpleTint;
  final Color onlineBannerGradientStart;
  final Color onlineBannerGradientEnd;
  final Color statusAssignedBg;
  final Color statusAssignedText;
  final Color statusOnlineBg;
  final Color statusOnlineText;
  final Color statusOfflineBtn;
  final Color mapBg;
  final Color mapBlocks;
  final Color mapRoads;
  final Color mapRiver;
  final Color mapMarker;
  final Color stepperActive;
  final Color stepperInactive;
  final Color stepperInactiveLine;
  final Color taskbarBg;
  final Color taskbarBorder;
  final Color logoutBg;
  final Color logoutBorder;
  final Color logoutText;

  const AppThemeColors({
    required this.pageBackground,
    required this.cardBackground,
    required this.innerBox,
    required this.border,
    required this.divider,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.unselectedIcon,
    required this.primaryButton,
    required this.purpleAccent,
    required this.purpleTint,
    required this.onlineBannerGradientStart,
    required this.onlineBannerGradientEnd,
    required this.statusAssignedBg,
    required this.statusAssignedText,
    required this.statusOnlineBg,
    required this.statusOnlineText,
    required this.statusOfflineBtn,
    required this.mapBg,
    required this.mapBlocks,
    required this.mapRoads,
    required this.mapRiver,
    required this.mapMarker,
    required this.stepperActive,
    required this.stepperInactive,
    required this.stepperInactiveLine,
    required this.taskbarBg,
    required this.taskbarBorder,
    required this.logoutBg,
    required this.logoutBorder,
    required this.logoutText,
  });

  /// Light theme tokens (preserving 100% of the existing colors)
  static const AppThemeColors light = AppThemeColors(
    pageBackground: Color(0xFFF8FAFC),
    cardBackground: Colors.white,
    innerBox: Colors.white,
    border: Color(0xFFE2E8F0),
    divider: Color(0xFFF1F5F9),
    textPrimary: Color(0xFF0F172A),
    textSecondary: Color(0xFF64748B),
    textMuted: Color(0xFF94A3B8),
    unselectedIcon: Color(0xFF868C9F),
    primaryButton: Color(0xFF6A379F),
    purpleAccent: Color(0xFF6A379F),
    purpleTint: Color(0xFFF3EDF9),
    onlineBannerGradientStart: Color(0xFF6A379F),
    onlineBannerGradientEnd: Color(0xFF8651BC),
    statusAssignedBg: Color(0xFFDCFCE7),
    statusAssignedText: Color(0xFF15803D),
    statusOnlineBg: Color(0xFFDCFCE7),
    statusOnlineText: Color(0xFF16A34A),
    statusOfflineBtn: Color(0xFFE11D48),
    mapBg: Color(0xFFE9EDF5),
    mapBlocks: Color(0xFFDFE4EE),
    mapRoads: Color(0xFFCBD5E1),
    mapRiver: Color(0xFFBFDBFE),
    mapMarker: Color(0xFF6A379F),
    stepperActive: Color(0xFF6A379F),
    stepperInactive: Color(0xFF6A379F),
    stepperInactiveLine: Color(0xFFCBD5E1),
    taskbarBg: Color(0xF6FFFFFF),
    taskbarBorder: Color(0x336A379F),
    logoutBg: Colors.white,
    logoutBorder: Color(0xFFE2E8F0),
    logoutText: Color(0xFFB91C1C),
  );

  /// Dark theme tokens matching the exact specifications
  static const AppThemeColors dark = AppThemeColors(
    pageBackground: Color(0xFF121016),
    cardBackground: Color(0xFF1C1823),
    innerBox: Color(0xFF25202E),
    border: Color(0xFF342D40),
    divider: Color(0xFF342D40),
    textPrimary: Color(0xFFF2EEF6),
    textSecondary: Color(0xFFB9B0C6),
    textMuted: Color(0xFF8E849C),
    unselectedIcon: Color(0xFF8E849C),
    primaryButton: Color(0xFF6A379F),
    purpleAccent: Color(0xFF6A379F),
    purpleTint: Color(0xFF2D2040),
    onlineBannerGradientStart: Color(0xFF2D2040),
    onlineBannerGradientEnd: Color(0xFF3A2656),
    statusAssignedBg: Color(0xFF12301F),
    statusAssignedText: Color(0xFF6EE7A0),
    statusOnlineBg: Color(0xFF12301F),
    statusOnlineText: Color(0xFF6EE7A0),
    statusOfflineBtn: Color(0xFFE11D48),
    mapBg: Color(0xFF1E1B27),
    mapBlocks: Color(0xFF25212F),
    mapRoads: Color(0xFF2F2A3A),
    mapRiver: Color(0xFF1F3A5F),
    mapMarker: Color(0xFF6A379F),
    stepperActive: Color(0xFF6A379F),
    stepperInactive: Color(0xFF6A379F),
    stepperInactiveLine: Color(0xFF342D40),
    taskbarBg: Color(0xF01C1823),
    taskbarBorder: Color(0x336A379F),
    logoutBg: Color(0xFF25202E),
    logoutBorder: Color(0xFF342D40),
    logoutText: Color(0xFFF87171),
  );

  @override
  AppThemeColors copyWith({
    Color? pageBackground,
    Color? cardBackground,
    Color? innerBox,
    Color? border,
    Color? divider,
    Color? textPrimary,
    Color? textSecondary,
    Color? textMuted,
    Color? unselectedIcon,
    Color? primaryButton,
    Color? purpleAccent,
    Color? purpleTint,
    Color? onlineBannerGradientStart,
    Color? onlineBannerGradientEnd,
    Color? statusAssignedBg,
    Color? statusAssignedText,
    Color? statusOnlineBg,
    Color? statusOnlineText,
    Color? statusOfflineBtn,
    Color? mapBg,
    Color? mapBlocks,
    Color? mapRoads,
    Color? mapRiver,
    Color? mapMarker,
    Color? stepperActive,
    Color? stepperInactive,
    Color? stepperInactiveLine,
    Color? taskbarBg,
    Color? taskbarBorder,
    Color? logoutBg,
    Color? logoutBorder,
    Color? logoutText,
  }) {
    return AppThemeColors(
      pageBackground: pageBackground ?? this.pageBackground,
      cardBackground: cardBackground ?? this.cardBackground,
      innerBox: innerBox ?? this.innerBox,
      border: border ?? this.border,
      divider: divider ?? this.divider,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted: textMuted ?? this.textMuted,
      unselectedIcon: unselectedIcon ?? this.unselectedIcon,
      primaryButton: primaryButton ?? this.primaryButton,
      purpleAccent: purpleAccent ?? this.purpleAccent,
      purpleTint: purpleTint ?? this.purpleTint,
      onlineBannerGradientStart: onlineBannerGradientStart ?? this.onlineBannerGradientStart,
      onlineBannerGradientEnd: onlineBannerGradientEnd ?? this.onlineBannerGradientEnd,
      statusAssignedBg: statusAssignedBg ?? this.statusAssignedBg,
      statusAssignedText: statusAssignedText ?? this.statusAssignedText,
      statusOnlineBg: statusOnlineBg ?? this.statusOnlineBg,
      statusOnlineText: statusOnlineText ?? this.statusOnlineText,
      statusOfflineBtn: statusOfflineBtn ?? this.statusOfflineBtn,
      mapBg: mapBg ?? this.mapBg,
      mapBlocks: mapBlocks ?? this.mapBlocks,
      mapRoads: mapRoads ?? this.mapRoads,
      mapRiver: mapRiver ?? this.mapRiver,
      mapMarker: mapMarker ?? this.mapMarker,
      stepperActive: stepperActive ?? this.stepperActive,
      stepperInactive: stepperInactive ?? this.stepperInactive,
      stepperInactiveLine: stepperInactiveLine ?? this.stepperInactiveLine,
      taskbarBg: taskbarBg ?? this.taskbarBg,
      taskbarBorder: taskbarBorder ?? this.taskbarBorder,
      logoutBg: logoutBg ?? this.logoutBg,
      logoutBorder: logoutBorder ?? this.logoutBorder,
      logoutText: logoutText ?? this.logoutText,
    );
  }

  @override
  AppThemeColors lerp(ThemeExtension<AppThemeColors>? other, double t) {
    if (other is! AppThemeColors) return this;
    return AppThemeColors(
      pageBackground: Color.lerp(pageBackground, other.pageBackground, t)!,
      cardBackground: Color.lerp(cardBackground, other.cardBackground, t)!,
      innerBox: Color.lerp(innerBox, other.innerBox, t)!,
      border: Color.lerp(border, other.border, t)!,
      divider: Color.lerp(divider, other.divider, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      unselectedIcon: Color.lerp(unselectedIcon, other.unselectedIcon, t)!,
      primaryButton: Color.lerp(primaryButton, other.primaryButton, t)!,
      purpleAccent: Color.lerp(purpleAccent, other.purpleAccent, t)!,
      purpleTint: Color.lerp(purpleTint, other.purpleTint, t)!,
      onlineBannerGradientStart: Color.lerp(onlineBannerGradientStart, other.onlineBannerGradientStart, t)!,
      onlineBannerGradientEnd: Color.lerp(onlineBannerGradientEnd, other.onlineBannerGradientEnd, t)!,
      statusAssignedBg: Color.lerp(statusAssignedBg, other.statusAssignedBg, t)!,
      statusAssignedText: Color.lerp(statusAssignedText, other.statusAssignedText, t)!,
      statusOnlineBg: Color.lerp(statusOnlineBg, other.statusOnlineBg, t)!,
      statusOnlineText: Color.lerp(statusOnlineText, other.statusOnlineText, t)!,
      statusOfflineBtn: Color.lerp(statusOfflineBtn, other.statusOfflineBtn, t)!,
      mapBg: Color.lerp(mapBg, other.mapBg, t)!,
      mapBlocks: Color.lerp(mapBlocks, other.mapBlocks, t)!,
      mapRoads: Color.lerp(mapRoads, other.mapRoads, t)!,
      mapRiver: Color.lerp(mapRiver, other.mapRiver, t)!,
      mapMarker: Color.lerp(mapMarker, other.mapMarker, t)!,
      stepperActive: Color.lerp(stepperActive, other.stepperActive, t)!,
      stepperInactive: Color.lerp(stepperInactive, other.stepperInactive, t)!,
      stepperInactiveLine: Color.lerp(stepperInactiveLine, other.stepperInactiveLine, t)!,
      taskbarBg: Color.lerp(taskbarBg, other.taskbarBg, t)!,
      taskbarBorder: Color.lerp(taskbarBorder, other.taskbarBorder, t)!,
      logoutBg: Color.lerp(logoutBg, other.logoutBg, t)!,
      logoutBorder: Color.lerp(logoutBorder, other.logoutBorder, t)!,
      logoutText: Color.lerp(logoutText, other.logoutText, t)!,
    );
  }
}

/// Convenience extension on BuildContext to quickly access design tokens.
extension AppThemeContext on BuildContext {
  AppThemeColors get appColors =>
      Theme.of(this).extension<AppThemeColors>() ?? AppThemeColors.light;
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;
}
