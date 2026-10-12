import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../storage/local_cache_service.dart';

/// SharedPreferences key for persisting the user's theme selection.
const String kThemeModeKey = 'theme_mode';

/// Riverpod provider managing Light / Dark ThemeMode with SharedPreferences persistence.
final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(() {
  return ThemeModeNotifier();
});

class ThemeModeNotifier extends Notifier<ThemeMode> {
  SharedPreferences get _prefs => ref.read(sharedPreferencesProvider);

  @override
  ThemeMode build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    final saved = prefs.getString(kThemeModeKey);
    if (saved == 'dark') {
      return ThemeMode.dark;
    }
    // First launch defaults to Light mode
    return ThemeMode.light;
  }

  /// Toggles between Light and Dark mode instantly.
  Future<void> toggleTheme() async {
    final nextMode = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    state = nextMode;
    await _prefs.setString(kThemeModeKey, nextMode == ThemeMode.dark ? 'dark' : 'light');
  }

  /// Explicitly sets the theme mode.
  Future<void> setTheme(ThemeMode mode) async {
    state = mode;
    await _prefs.setString(kThemeModeKey, mode == ThemeMode.dark ? 'dark' : 'light');
  }
}
