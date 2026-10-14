import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/routing/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/theme_provider.dart';
import '../../auth/presentation/controllers/auth_controller.dart';
import '../../auth/presentation/controllers/driver_profile_controller.dart';
import 'controllers/driver_documents_provider.dart';

/// Driver Profile Screen styled identically to the reference design (Profile ui.jpeg)
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  @override
  Widget build(BuildContext context) {
    final driverAsync = ref.watch(driverProfileProvider);
    final driver = driverAsync.valueOrNull;

    final driverName = driver != null && driver.name.isNotEmpty
        ? driver.name
        : 'Rajesh Kumar';
    final driverPhone = driver != null && driver.phone.isNotEmpty
        ? (driver.phone.startsWith('+91') ? driver.phone : '+91 ${driver.phone}')
        : '+91 98765 43210';
    final driverId = driver != null
        ? 'HD-${driver.id.toString().padLeft(5, '0')}'
        : 'HD-94821';

    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: themeColors.pageBackground,
      drawerScrimColor: Colors.black.withValues(alpha: 0.35),
      drawer: _buildDrawerTaskbar(context, ref),
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar: 3-Bar Menu Icon & Dark/Light Theme Switch Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () {
                        _scaffoldKey.currentState?.openDrawer();
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(6.0),
                        child: Icon(
                          Icons.menu_rounded,
                          color: themeColors.textPrimary,
                          size: 26,
                        ),
                      ),
                    ),
                  ),
                  Tooltip(
                    message: isDark ? 'Light mode' : 'Dark mode',
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        key: const Key('theme_mode_toggle_button'),
                        borderRadius: BorderRadius.circular(20),
                        onTap: () {
                          ref.read(themeModeProvider.notifier).toggleTheme();
                        },
                        child: Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: themeColors.cardBackground,
                            shape: BoxShape.circle,
                            border: Border.all(color: themeColors.border),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.05),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                            size: 20,
                            color: isDark ? themeColors.purpleAccent : const Color(0xFF4B5162),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 8),

                    // Top Profile Card
                    _buildProfileCard(
                      context: context,
                      driverName: driverName,
                      driverPhone: driverPhone,
                      driverId: driverId,
                      photoPath: driver?.photoPath,
                    ),

                    const SizedBox(height: 20),

                    // Request & Leave Status Section Card
                    _buildRequestAndLeaveCard(context),

                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNavigationBar(context),
    );
  }

  /// Profile Summary Card with avatar, name, badge, ID, contact and zone
  Widget _buildProfileCard({
    required BuildContext context,
    required String driverName,
    required String driverPhone,
    required String driverId,
    String? photoPath,
  }) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Container(
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: themeColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
      child: Column(
        children: [
          // Circular Avatar with prominent purple ring
          Container(
            width: 86,
            height: 86,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: themeColors.purpleAccent, width: 3.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipOval(
              child: Image.network(
                photoPath != null && photoPath.isNotEmpty
                    ? photoPath
                    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                fit: BoxFit.cover,
                cacheWidth: 160,
                cacheHeight: 160,
                errorBuilder: (_, __, ___) => Container(
                  color: themeColors.primaryButton,
                  child: Center(
                    child: Text(
                      driverName.isNotEmpty ? driverName[0].toUpperCase() : 'R',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Driver Name
          Text(
            driverName,
            style: TextStyle(
              color: themeColors.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 6),

          // HireD Partner Badge Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 3.5),
            decoration: BoxDecoration(
              color: themeColors.purpleTint,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: themeColors.border),
            ),
            child: Text(
              'HireD Partner',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: themeColors.purpleAccent,
              ),
            ),
          ),
          const SizedBox(height: 8),

          // ID and Active Status Subtitle
          Text(
            'ID: #$driverId • Active Partner',
            style: TextStyle(
              color: themeColors.textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 18),

          // Horizontal Divider
          Divider(height: 1, color: themeColors.divider),
          const SizedBox(height: 16),

          // Contact & Zone Info Tiles
          Row(
            children: [
              // Contact Tile
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: themeColors.purpleTint,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        Icons.phone_rounded,
                        color: themeColors.purpleAccent,
                        size: 19,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Contact',
                            style: TextStyle(
                              color: themeColors.textSecondary,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            driverPhone,
                            style: TextStyle(
                              color: themeColors.textPrimary,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Vertical Divider
              Container(
                width: 1,
                height: 40,
                color: themeColors.divider,
                margin: const EdgeInsets.symmetric(horizontal: 10),
              ),

              // Zone Tile
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: themeColors.purpleTint,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        Icons.location_on_rounded,
                        color: themeColors.purpleAccent,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Zone',
                            style: TextStyle(
                              color: themeColors.textSecondary,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Electronic City, BLR',
                            style: TextStyle(
                              color: themeColors.textPrimary,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Request & Leave Status Section Card
  Widget _buildRequestAndLeaveCard(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final docsState = ref.watch(driverDocumentsProvider);

    return Container(
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: themeColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Title
          Text(
            'OPERATIONS',
            style: TextStyle(
              color: themeColors.textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 16),

          // 1. Apply for Leave
          _buildActionRow(
            context: context,
            icon: Icons.flight_takeoff_rounded,
            title: 'Apply for Leave',
            onTap: () {},
          ),
          Divider(height: 24, color: themeColors.divider),

          // 2. Documents
          _buildActionRow(
            context: context,
            icon: Icons.description_rounded,
            title: 'Documents',
            badge: Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3.5),
              decoration: BoxDecoration(
                color: docsState.isAllUploaded
                    ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5))
                    : (isDark ? const Color(0xFF451A03) : const Color(0xFFFEF3C7)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                docsState.isAllUploaded
                    ? 'Verified'
                    : '${docsState.uploadedCount}/4 Uploaded',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: docsState.isAllUploaded
                      ? (isDark ? const Color(0xFF34D399) : const Color(0xFF059669))
                      : (isDark ? const Color(0xFFFBBF24) : const Color(0xFFD97706)),
                ),
              ),
            ),
            onTap: () => context.push(RouteNames.documents),
          ),
        ],
      ),
    );
  }

  /// Reusable row item for settings and action lists
  Widget _buildActionRow({
    required BuildContext context,
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Widget? badge,
  }) {
    final themeColors = context.appColors;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4.0),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: themeColors.purpleTint,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  icon,
                  color: themeColors.purpleAccent,
                  size: 21,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: themeColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (badge != null) ...[
                badge,
                const SizedBox(width: 6),
              ],
              Icon(
                Icons.chevron_right_rounded,
                color: themeColors.unselectedIcon,
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 3-Tab Bottom Navigation Bar (Home, Trips, Wallet) matching dashboard
  Widget _buildBottomNavigationBar(BuildContext context) {
    final themeColors = context.appColors;

    return Container(
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        border: Border(
          top: BorderSide(color: themeColors.border, width: 1),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0D000000),
            blurRadius: 16,
            offset: Offset(0, -4),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(
              context: context,
              icon: Icons.home_outlined,
              label: 'Home',
              onTap: () {
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go(RouteNames.home);
                }
              },
            ),
            _buildNavItem(
              context: context,
              icon: Icons.directions_car_outlined,
              label: 'Trips',
              onTap: () {
                context.push(RouteNames.tripDetails);
              },
            ),
            _buildNavItem(
              context: context,
              icon: Icons.account_balance_wallet_outlined,
              label: 'Wallet',
              onTap: () {
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go(RouteNames.home);
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required BuildContext context,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    final themeColors = context.appColors;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: themeColors.unselectedIcon,
              size: 24,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: themeColors.unselectedIcon,
                fontWeight: FontWeight.w500,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Side Taskbar Drawer: Frosted glass half-transparent design
  /// following the exact App UI Brand Colors (#6A379F / AppColors.primary)
  /// with Logout button located at the bottom-left.
  Widget _buildDrawerTaskbar(
    BuildContext context,
    WidgetRef ref,
  ) {
    // Compact, minimal width (60% of screen) so it feels like a sleek floating side panel
    final drawerWidth = MediaQuery.of(context).size.width * 0.60;
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Drawer(
      backgroundColor: Colors.transparent,
      elevation: 0,
      width: drawerWidth,
      child: ClipRRect(
        borderRadius: const BorderRadius.horizontal(
          right: Radius.circular(28),
        ),
        child: Container(
          decoration: BoxDecoration(
            // Half-transparent frosted look following App UI color theme without expensive live-blur shader
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isDark
                  ? [
                      themeColors.cardBackground.withValues(alpha: 0.98),
                      themeColors.innerBox.withValues(alpha: 0.98),
                    ]
                  : const [
                      Color(0xFAFFFFFF),
                      Color(0xF5F6EDFD), // Subtle app primary tint #F3EDF9
                    ],
            ),
            border: Border(
              right: BorderSide(
                color: themeColors.taskbarBorder,
                width: 1.5,
              ),
            ),
            boxShadow: [
              BoxShadow(
                color: isDark
                    ? Colors.black.withValues(alpha: 0.3)
                    : AppColors.primary.withValues(alpha: 0.06),
                blurRadius: 10,
                offset: const Offset(3, 0),
              ),
            ],
          ),
          child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 18),

                  // Menu navigation items (My Trips, Earnings & Wallet, Support & Help)
                  _buildDrawerItem(
                    context: context,
                    icon: Icons.directions_car_rounded,
                    label: 'My Trips',
                    onTap: () {
                      Navigator.of(context).pop();
                    },
                  ),
                  _buildDrawerItem(
                    context: context,
                    icon: Icons.account_balance_wallet_rounded,
                    label: 'Earnings & Wallet',
                    onTap: () {
                      Navigator.of(context).pop();
                    },
                  ),
                  _buildDrawerItem(
                    context: context,
                    icon: Icons.description_rounded,
                    label: 'My Documents',
                    onTap: () {
                      Navigator.of(context).pop();
                      context.push(RouteNames.documents);
                    },
                  ),
                  _buildDrawerItem(
                    context: context,
                    icon: Icons.headset_mic_rounded,
                    label: 'Support & Help',
                    onTap: () {
                      Navigator.of(context).pop();
                    },
                  ),

                  const Spacer(),

                  // Bottom Left Professional Logout Button (Clean, Non-fluorescent)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 22),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () async {
                            Navigator.of(context).pop();
                            await ref.read(authControllerProvider.notifier).logout();
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: themeColors.logoutBg,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: themeColors.logoutBorder,
                                width: 1.2,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.power_settings_new_rounded,
                                  color: themeColors.logoutText,
                                  size: 19,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Logout',
                                  style: TextStyle(
                                    color: themeColors.logoutText,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 0.2,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

  Widget _buildDrawerItem({
    required BuildContext context,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool isSelected = false,
  }) {
    final themeColors = context.appColors;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
      child: Material(
        color: isSelected ? themeColors.purpleTint : Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            child: Row(
              children: [
                if (isSelected)
                  Container(
                    width: 3.5,
                    height: 18,
                    margin: const EdgeInsets.only(right: 10),
                    decoration: BoxDecoration(
                      color: themeColors.purpleAccent,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                Icon(
                  icon,
                  size: 21,
                  color: isSelected ? themeColors.purpleAccent : themeColors.textSecondary,
                ),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: TextStyle(
                    color: isSelected ? themeColors.purpleAccent : themeColors.textPrimary,
                    fontSize: 14,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
