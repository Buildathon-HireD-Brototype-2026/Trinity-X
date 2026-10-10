import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/routing/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_loading_indicator.dart';
import '../../auth/presentation/controllers/driver_profile_controller.dart';

/// Driver Dashboard displaying live cached driver details and duty status toggle (Zomato-style).
class HomeDashboardScreen extends ConsumerWidget {
  const HomeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driverAsync = ref.watch(driverProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('HireD Partner'),
        actions: [
          IconButton(
            tooltip: 'Refresh details',
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(driverProfileProvider.notifier).refresh(),
          ),
          IconButton(
            tooltip: 'Logout',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(driverProfileProvider.notifier).logout();
              if (context.mounted) {
                context.go(RouteNames.login);
              }
            },
          ),
        ],
      ),
      body: driverAsync.when(
        loading: () => const Center(child: AppLoadingIndicator()),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: AppColors.error, size: 48),
              const SizedBox(height: 12),
              Text('Failed to load profile: $err'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.read(driverProfileProvider.notifier).refresh(),
                child: const Text('Retry'),
              ),
            ],
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

          return RefreshIndicator(
            onRefresh: () => ref.read(driverProfileProvider.notifier).refresh(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Top Status & Duty Toggle Card (Zomato delivery style)
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: isOnline
                            ? [AppColors.primary, AppColors.primaryDark]
                            : [const Color(0xFF475569), const Color(0xFF334155)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: (isOnline ? AppColors.primary : Colors.black).withValues(alpha: 0.25),
                          blurRadius: 12,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 28,
                              backgroundColor: Colors.white.withValues(alpha: 0.2),
                              child: Text(
                                driver.name.isNotEmpty ? driver.name[0].toUpperCase() : 'D',
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    driver.name,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'HireD Professional Driver',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.85),
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isOnline ? AppColors.dutyOnline : Colors.white24,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                isOnline ? 'ONLINE' : 'OFFLINE',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        const Divider(color: Colors.white24, height: 1),
                        const SizedBox(height: 14),

                        // Duty Toggle Switch
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              isOnline ? 'You are ready to accept trips' : 'Go online to receive trips',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.9),
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Switch.adaptive(
                              key: const Key('duty_status_switch'),
                              value: isOnline,
                              activeThumbColor: AppColors.dutyOnline,
                              onChanged: (_) =>
                                  ref.read(driverProfileProvider.notifier).toggleDuty(),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Quick Stats Row (Trips, Rating, Account Status)
                  Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          label: 'Rating',
                          value: '${driver.rating} ★',
                          icon: Icons.star,
                          iconColor: Colors.amber,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _StatCard(
                          label: 'Total Trips',
                          value: '${driver.totalTrips}',
                          icon: Icons.local_taxi,
                          iconColor: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _StatCard(
                          label: 'Account',
                          value: driver.status,
                          icon: driver.isActive ? Icons.verified : Icons.pending,
                          iconColor: driver.isActive ? AppColors.success : AppColors.warning,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Driver Profile Information Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.badge_outlined, color: AppColors.primary),
                              const SizedBox(width: 8),
                              Text('Driver Partner Information', style: AppTextStyles.titleMedium),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _DetailRow(
                            label: 'Driver ID',
                            value: 'DRV-${driver.id.toString().padLeft(4, '0')}',
                          ),
                          _DetailRow(
                            label: 'Registered Phone',
                            value: '+91 ${driver.phone}',
                          ),
                          _DetailRow(
                            label: 'Email',
                            value: driver.email ?? 'Not Provided',
                          ),
                          _DetailRow(
                            label: 'Account Status',
                            value: driver.status,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color iconColor;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Icon(icon, color: iconColor, size: 22),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}
