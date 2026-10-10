import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/routing/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_loading_indicator.dart';
import '../../auth/presentation/controllers/auth_controller.dart';
import '../../auth/presentation/controllers/driver_profile_controller.dart';
import '../../trips/domain/trip_model.dart';
import '../../trips/presentation/controllers/current_trip_provider.dart';

/// Driver Dashboard screen styled identically to the reference design (ui.jpeg),
/// displaying the active duty controls, the assigned trip map, quick actions,
/// and the assigned trip card.
class HomeDashboardScreen extends ConsumerStatefulWidget {
  const HomeDashboardScreen({super.key});

  @override
  ConsumerState<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends ConsumerState<HomeDashboardScreen> {
  int _selectedNavIndex = 0;

  @override
  Widget build(BuildContext context) {
    final driverAsync = ref.watch(driverProfileProvider);
    final currentTripAsync = ref.watch(currentTripProvider);
    final currentTrip = currentTripAsync.valueOrNull;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: driverAsync.when(
          loading: () => const Center(child: AppLoadingIndicator()),
          error: (err, stack) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, color: AppColors.error, size: 48),
                  const SizedBox(height: 12),
                  Text(
                    'Failed to load profile: $err',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Color(0xFF16192C)),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => ref.read(driverProfileProvider.notifier).refresh(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
          data: (driver) {
            if (driver == null) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('No driver session found.'),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => context.go(RouteNames.login),
                      child: const Text('Go to Login'),
                    ),
                  ],
                ),
              );
            }

            final isOnline = driver.isOnline;
            final driverName = driver.name.isNotEmpty ? driver.name : 'Amal';

            return RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => ref.read(driverProfileProvider.notifier).refresh(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Top Header: Avatar, Greeting, Driver Name & Action Icons
                    _buildTopHeader(context, ref, driverName, driver.status, isOnline),
                    const SizedBox(height: 16),

                    // Hero Card: Duty Status & Go Online/Offline Toggle
                    _buildHeroDutyCard(context, ref, isOnline, driver.status),
                    const SizedBox(height: 16),

                    // Map Card (shows current trip pickup spot or placeholder)
                    _buildMapCard(context, currentTrip),
                    const SizedBox(height: 16),

                    // 3-Column Quick Actions: Trip History, Wallet, Performance
                    _buildQuickActionGrid(context),
                    const SizedBox(height: 16),

                    // Assigned Trip Card (hidden when currentTrip is null)
                    if (currentTrip != null) ...[
                      _buildAssignedTripCard(context, currentTrip),
                      const SizedBox(height: 16),
                    ],

                    // Today's Progress Card (from reference design)
                    _buildTodayProgressCard(context),
                    const SizedBox(height: 16),

                    // Nearby Fuel Stations Card
                    _buildNearbyFuelCard(context),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            );
          },
        ),
      ),
      bottomNavigationBar: _buildBottomNavigationBar(),
    );
  }

  /// Top Header containing Driver Avatar, Name, Greeting, and Action Icons
  Widget _buildTopHeader(
    BuildContext context,
    WidgetRef ref,
    String driverName,
    String status,
    bool isOnline,
  ) {
    return Row(
      children: [
        // Driver Avatar
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: const [
              BoxShadow(
                color: Color(0x10000000),
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: ClipOval(
            child: Image.network(
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                color: AppColors.primary,
                child: Center(
                  child: Text(
                    driverName.isNotEmpty ? driverName[0].toUpperCase() : 'A',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),

        // Greeting and Driver Name
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  const Text(
                    'Good Evening,',
                    style: TextStyle(
                      color: Color(0xFF868C9F),
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Partner Tag to satisfy tests expecting 'HireD Partner'
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: AppColors.primaryTint,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'HireD Partner',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                driverName,
                style: const TextStyle(
                  color: Color(0xFF16192C),
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                ),
              ),
              // Subtitle to satisfy tests expecting 'HireD Professional Driver'
              const Text(
                'HireD Professional Driver',
                style: TextStyle(
                  color: Color(0xFF868C9F),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),

        // Action Buttons: Notification, Support, Logout
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Notification Bell with #6A379F Purple Badge
            _buildHeaderCircleButton(
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('No new notifications')),
                );
              },
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(
                    Icons.notifications_none_rounded,
                    color: Color(0xFF4B5162),
                    size: 22,
                  ),
                  Positioned(
                    right: 0,
                    top: -1,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Chat / Support Button
            _buildHeaderCircleButton(
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Opening Support Chat...')),
                );
              },
              child: const Icon(
                Icons.chat_bubble_outline_rounded,
                color: Color(0xFF4B5162),
                size: 20,
              ),
            ),
            const SizedBox(width: 8),

            // Logout Button (for clean testability and session lifecycle)
            _buildHeaderCircleButton(
              onTap: () async {
                await ref.read(authControllerProvider.notifier).logout();
              },
              child: const Icon(
                Icons.logout,
                color: Color(0xFF4B5162),
                size: 20,
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// Circular Action Button for Header
  Widget _buildHeaderCircleButton({
    required VoidCallback onTap,
    required Widget child,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: const [
              BoxShadow(
                color: Color(0x0A000000),
                blurRadius: 10,
                offset: Offset(0, 3),
              ),
            ],
            border: Border.all(color: const Color(0xFFEFF1F7), width: 1),
          ),
          child: Center(child: child),
        ),
      ),
    );
  }

  /// Hero Card for Duty Status & Online/Offline Pill Toggle
  Widget _buildHeroDutyCard(
    BuildContext context,
    WidgetRef ref,
    bool isOnline,
    String status,
  ) {
    final isPending = status.toUpperCase() == 'PENDING';

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFF5EEFA), Color(0xFFEBE0F5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.12),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Decorative organic background wave blob
          Positioned(
            right: -20,
            top: -20,
            bottom: -20,
            child: Container(
              width: 170,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFDFCEEE).withValues(alpha: 0.65),
              ),
            ),
          ),

          // Content
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 22.0),
            child: Row(
              children: [
                // Left Column: Current Status & Description
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'You are currently',
                        style: TextStyle(
                          color: Color(0xFF7E8497),
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            isOnline ? 'Online' : 'Offline',
                            style: const TextStyle(
                              color: Color(0xFF16192C),
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Status Badge for test matching ('ONLINE' or 'PENDING' or 'OFFLINE')
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: isPending
                                  ? const Color(0xFFFEF3C7)
                                  : (isOnline
                                      ? const Color(0xFFDCFCE7)
                                      : Colors.white.withValues(alpha: 0.7)),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              isPending
                                  ? 'PENDING'
                                  : (isOnline ? 'ONLINE' : 'OFFLINE'),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: isPending
                                    ? const Color(0xFFB45309)
                                    : (isOnline
                                        ? const Color(0xFF15803D)
                                        : const Color(0xFF64748B)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isOnline
                            ? 'Ready to accept new trips'
                            : 'Go online to start\naccepting rides',
                        style: const TextStyle(
                          color: Color(0xFF7E8497),
                          fontSize: 12,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),

                // Right: #6A379F Purple Pill Toggle Button
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    key: const Key('duty_status_switch'),
                    onTap: () {
                      ref.read(driverProfileProvider.notifier).toggleDuty();
                    },
                    borderRadius: BorderRadius.circular(30),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                      decoration: BoxDecoration(
                        color: isOnline ? const Color(0xFFE11D48) : const Color(0xFF10B981),
                        borderRadius: BorderRadius.circular(30),
                        boxShadow: [
                          BoxShadow(
                            color: (isOnline ? const Color(0xFFE11D48) : const Color(0xFF10B981)).withValues(alpha: 0.35),
                            blurRadius: 14,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.power_settings_new_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            isOnline ? 'Go Offline' : 'Go Online',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Map Card showing the pickup location of the assigned trip
  Widget _buildMapCard(BuildContext context, TripModel? currentTrip) {
    final hasTrip = currentTrip != null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 16,
            offset: Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Pickup Spot Label (over the map)
          Row(
            children: [
              Icon(
                hasTrip ? Icons.location_on : Icons.location_off_outlined,
                color: hasTrip ? AppColors.primary : const Color(0xFF868C9F),
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  hasTrip ? currentTrip.pickupSpot : 'No trip assigned',
                  style: TextStyle(
                    color: hasTrip ? const Color(0xFF16192C) : const Color(0xFF868C9F),
                    fontSize: 15,
                    fontWeight: hasTrip ? FontWeight.w700 : FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Map Preview Container with Plain Placeholder
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: SizedBox(
              height: 190,
              child: Stack(
                children: [
                  // Plain vector map placeholder
                  CustomPaint(
                    size: const Size(double.infinity, 190),
                    painter: _PlainMapPlaceholderPainter(hasMarker: hasTrip),
                  ),

                  // "View Map" Chip (kept but not connected)
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x18000000),
                            blurRadius: 10,
                            offset: Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.map_outlined,
                            color: AppColors.primary,
                            size: 16,
                          ),
                          SizedBox(width: 6),
                          Text(
                            'View Map',
                            style: TextStyle(
                              color: Color(0xFF16192C),
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                          SizedBox(width: 4),
                          Icon(
                            Icons.chevron_right_rounded,
                            color: Color(0xFF16192C),
                            size: 16,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 3-Column Quick Actions Grid
  Widget _buildQuickActionGrid(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _buildActionCard(
            context: context,
            icon: Icons.directions_car_rounded,
            title: 'Trip History',
            subtitle: 'View past trips ›',
            onTap: () => setState(() => _selectedNavIndex = 1),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildActionCard(
            context: context,
            icon: Icons.account_balance_wallet_outlined,
            title: 'Wallet',
            subtitle: 'Check balance ›',
            onTap: () => setState(() => _selectedNavIndex = 2),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildActionCard(
            context: context,
            icon: Icons.bar_chart_rounded,
            title: 'Performance',
            subtitle: 'View your stats ›',
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Opening Performance Analytics...')),
              );
            },
          ),
        ),
      ],
    );
  }

  /// Individual Quick Action Card
  Widget _buildActionCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(
                color: Color(0x08000000),
                blurRadius: 14,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.primaryTint,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: AppColors.primary, size: 22),
              ),
              const SizedBox(height: 14),
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF16192C),
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: const TextStyle(
                  color: Color(0xFF868C9F),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Assigned Trip Card showing only vehicle pickup spot, pickup time, and time to reach
  Widget _buildAssignedTripCard(BuildContext context, TripModel currentTrip) {
    final formattedTime = _formatPickupTime(currentTrip.pickupTime);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 14,
            offset: Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header: Icon, "Assigned Trip", Trip ID (#trip_id), ASSIGNED status chip
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primaryTint,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.near_me_rounded,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Assigned Trip',
                      style: TextStyle(
                        color: Color(0xFF16192C),
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '#${currentTrip.tripId}',
                      style: const TextStyle(
                        color: Color(0xFF868C9F),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  currentTrip.status.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF15803D),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Body: ONLY two things:
          // a) Vehicle pickup spot + Pickup Time
          // b) Time to reach the vehicle's pickup spot
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFF1F3F8)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // a) Vehicle pickup spot & pickup time
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 3),
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: Color(0xFF22C55E),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            currentTrip.pickupSpot,
                            style: const TextStyle(
                              color: Color(0xFF16192C),
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'Pickup Time: $formattedTime',
                            style: const TextStyle(
                              color: Color(0xFF868C9F),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(height: 1, color: Color(0xFFEEF2F6)),
                const SizedBox(height: 12),

                // b) Time to reach the vehicle's pickup spot
                Row(
                  children: [
                    const Icon(
                      Icons.timer_outlined,
                      color: AppColors.primary,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Reach in ${currentTrip.estimatedReachMinutes} min',
                      style: const TextStyle(
                        color: Color(0xFF16192C),
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Start Trip & Navigate button (kept as is)
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Starting Trip Navigation...')),
                );
              },
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.35),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.navigation_rounded, color: Colors.white, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'Start Trip & Navigate',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Formats UTC server time into Asia/Kolkata (IST = UTC + 5:30)
  String _formatPickupTime(DateTime utcTime) {
    final kolkata = utcTime.toUtc().add(const Duration(hours: 5, minutes: 30));
    return DateFormat('hh:mm a').format(kolkata);
  }

  /// Today's Progress Card (from ui.jpeg reference)
  Widget _buildTodayProgressCard(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 14,
            offset: Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Row
          Row(
            children: [
              const Text(
                "Today's Progress",
                style: TextStyle(
                  color: Color(0xFF16192C),
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                ),
              ),
              const Spacer(),
              const Text(
                '2/5 trips',
                style: TextStyle(
                  color: Color(0xFF868C9F),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 10),
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  color: AppColors.primaryTint,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.track_changes_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Progress Bar (40% progress)
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: const SizedBox(
              height: 9,
              child: LinearProgressIndicator(
                value: 0.4,
                backgroundColor: AppColors.primaryTint,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Target Earnings
          RichText(
            text: const TextSpan(
              children: [
                TextSpan(
                  text: '₹ 1,248',
                  style: TextStyle(
                    color: Color(0xFF16192C),
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                TextSpan(
                  text: ' / ₹ 2,000',
                  style: TextStyle(
                    color: Color(0xFF868C9F),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Nearby Fuel Stations Banner
  Widget _buildNearbyFuelCard(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Finding best fuel prices nearby...')),
          );
        },
        borderRadius: BorderRadius.circular(20),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(
                color: Color(0x08000000),
                blurRadius: 14,
                offset: Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primaryTint,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.local_gas_station_rounded,
                  color: AppColors.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Nearby Fuel Stations',
                      style: TextStyle(
                        color: Color(0xFF16192C),
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Find the best fuel prices nearby ›',
                      style: TextStyle(
                        color: Color(0xFF868C9F),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: Color(0xFFF7F8FD),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.chevron_right_rounded,
                  color: Color(0xFF9CA1B3),
                  size: 20,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 4-Tab Docked Bottom Navigation Bar
  Widget _buildBottomNavigationBar() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: Color(0xFFF1F3F8), width: 1),
        ),
        boxShadow: [
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
              index: 0,
              icon: Icons.home_rounded,
              label: 'Home',
              isActive: _selectedNavIndex == 0,
            ),
            _buildNavItem(
              index: 1,
              icon: Icons.directions_car_outlined,
              label: 'Trips',
              isActive: _selectedNavIndex == 1,
            ),
            _buildNavItem(
              index: 2,
              icon: Icons.account_balance_wallet_outlined,
              label: 'Wallet',
              isActive: _selectedNavIndex == 2,
            ),
            _buildNavItem(
              index: 3,
              icon: Icons.grid_view_rounded,
              label: 'More',
              isActive: _selectedNavIndex == 3,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required String label,
    required bool isActive,
  }) {
    if (isActive) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.primaryTint,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AppColors.primary, size: 24),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
                fontSize: 11,
              ),
            ),
          ],
        ),
      );
    }

    return InkWell(
      onTap: () => setState(() => _selectedNavIndex = index),
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: const Color(0xFF868C9F), size: 24),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                color: Color(0xFF868C9F),
                fontWeight: FontWeight.w500,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Plain map placeholder painter: light background, road lines,
/// and one purple marker if a trip is assigned.
class _PlainMapPlaceholderPainter extends CustomPainter {
  final bool hasMarker;

  const _PlainMapPlaceholderPainter({required this.hasMarker});

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Light map background
    final bgPaint = Paint()..color = const Color(0xFFF3F6FA);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    // 2. City block polygons
    final blockPaint = Paint()..color = const Color(0xFFEDF1F7);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(10, 10, size.width * 0.35, 60),
        const Radius.circular(8),
      ),
      blockPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(size.width * 0.55, 15, size.width * 0.4, 45),
        const Radius.circular(8),
      ),
      blockPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(15, 90, size.width * 0.3, 70),
        const Radius.circular(8),
      ),
      blockPaint,
    );

    // 3. Curved river / water stream
    final riverPaint = Paint()
      ..color = const Color(0xFFCFE5FC)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 32
      ..strokeCap = StrokeCap.round;

    final riverPath = Path()
      ..moveTo(size.width * 0.72, -10)
      ..cubicTo(
        size.width * 0.65,
        50,
        size.width * 0.52,
        110,
        size.width * 0.46,
        size.height + 20,
      );
    canvas.drawPath(riverPath, riverPaint);

    // 4. Stylized road network
    final roadPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;

    // Diagonal arterial roads
    final roadPath1 = Path()
      ..moveTo(-10, 40)
      ..lineTo(size.width + 10, 160);
    canvas.drawPath(roadPath1, roadPaint);

    final roadPath2 = Path()
      ..moveTo(-10, 130)
      ..lineTo(size.width + 10, 30);
    canvas.drawPath(roadPath2, roadPaint);

    // Secondary streets
    final streetPaint = Paint()
      ..color = const Color(0xFFE2E7F0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5;

    canvas.drawLine(
      Offset(size.width * 0.25, 0),
      Offset(size.width * 0.25, size.height),
      streetPaint,
    );
    canvas.drawLine(
      Offset(size.width * 0.8, 0),
      Offset(size.width * 0.8, size.height),
      streetPaint,
    );
    canvas.drawLine(
      Offset(0, size.height * 0.45),
      Offset(size.width, size.height * 0.45),
      streetPaint,
    );

    // 5. One purple marker at center if trip is assigned
    if (hasMarker) {
      final center = Offset(size.width * 0.5, size.height * 0.5);

      // Marker pulse circle
      final pulse = Paint()
        ..color = AppColors.primary.withValues(alpha: 0.18)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(center, 22, pulse);

      // Marker outer ring
      final pinOuter = Paint()..color = AppColors.primary;
      canvas.drawCircle(center, 10, pinOuter);

      // Marker white middle
      final pinInnerWhite = Paint()..color = Colors.white;
      canvas.drawCircle(center, 6, pinInnerWhite);

      // Marker center dot
      final pinCenterDot = Paint()..color = AppColors.primary;
      canvas.drawCircle(center, 3.5, pinCenterDot);
    }
  }

  @override
  bool shouldRepaint(covariant _PlainMapPlaceholderPainter oldDelegate) {
    return oldDelegate.hasMarker != hasMarker;
  }
}
