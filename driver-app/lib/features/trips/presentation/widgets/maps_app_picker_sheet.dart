import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../application/navigation_launcher_service.dart';

class MapsAppPickerSheet extends ConsumerWidget {
  final double targetLat;
  final double targetLng;
  final VoidCallback? onAppSelected;

  const MapsAppPickerSheet({
    super.key,
    required this.targetLat,
    required this.targetLng,
    this.onAppSelected,
  });

  /// Static helper to display the sheet or launch directly if 0 or 1 app installed.
  static Future<void> show({
    required BuildContext context,
    required WidgetRef ref,
    required double targetLat,
    required double targetLng,
    bool forceShowSheet = false,
  }) async {
    final navService = ref.read(navigationLauncherServiceProvider);
    final installed = await navService.getInstalledMapsApps();

    if (!context.mounted) return;

    if (!forceShowSheet) {
      if (installed.isEmpty) {
        // No maps app installed: open browser directions directly
        await navService.launchNavigation(
          lat: targetLat,
          lng: targetLng,
          appType: MapsAppType.browser,
        );
        return;
      }

      if (installed.length == 1) {
        // Only one maps app installed: skip sheet and launch directly
        await navService.setPreferredApp(installed.first.type);
        await navService.launchNavigation(
          lat: targetLat,
          lng: targetLng,
          appType: installed.first.type,
        );
        return;
      }

      final preferred = navService.getPreferredApp();
      if (preferred != null && installed.any((e) => e.type == preferred)) {
        // Remembered app: launch directly
        await navService.launchNavigation(
          lat: targetLat,
          lng: targetLng,
          appType: preferred,
        );
        return;
      }
    }

    // Show small bottom sheet
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => MapsAppPickerSheet(
        targetLat: targetLat,
        targetLng: targetLng,
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeColors = context.appColors;
    final navService = ref.watch(navigationLauncherServiceProvider);

    return FutureBuilder<List<MapsAppOption>>(
      future: navService.getInstalledMapsApps(),
      builder: (context, snapshot) {
        final apps = snapshot.data ?? [];
        final preferred = navService.getPreferredApp();

        return Container(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          decoration: BoxDecoration(
            color: themeColors.cardBackground,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: themeColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Choose Navigation App',
                    style: TextStyle(
                      color: themeColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: themeColors.textMuted, size: 20),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              if (apps.isEmpty)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: themeColors.purpleTint,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.open_in_browser_rounded, color: themeColors.purpleAccent),
                  ),
                  title: Text(
                    'Open in Web Browser',
                    style: TextStyle(color: themeColors.textPrimary, fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(
                    'No navigation apps detected',
                    style: TextStyle(color: themeColors.textMuted, fontSize: 12),
                  ),
                  onTap: () async {
                    Navigator.of(context).pop();
                    await navService.setPreferredApp(MapsAppType.browser);
                    await navService.launchNavigation(
                      lat: targetLat,
                      lng: targetLng,
                      appType: MapsAppType.browser,
                    );
                    onAppSelected?.call();
                  },
                )
              else
                ...apps.map((app) {
                  final isSelected = preferred == app.type;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () async {
                          Navigator.of(context).pop();
                          await navService.setPreferredApp(app.type);
                          await navService.launchNavigation(
                            lat: targetLat,
                            lng: targetLng,
                            appType: app.type,
                          );
                          onAppSelected?.call();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: isSelected ? themeColors.purpleTint : themeColors.innerBox,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected ? themeColors.purpleAccent : themeColors.border,
                              width: isSelected ? 1.5 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: isSelected ? themeColors.purpleAccent : themeColors.purpleTint,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  app.icon,
                                  color: isSelected ? Colors.white : themeColors.purpleAccent,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  app.title,
                                  style: TextStyle(
                                    color: themeColors.textPrimary,
                                    fontSize: 15,
                                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                                  ),
                                ),
                              ),
                              if (isSelected)
                                Icon(
                                  Icons.check_circle_rounded,
                                  color: themeColors.purpleAccent,
                                  size: 20,
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }),
            ],
          ),
        );
      },
    );
  }
}
