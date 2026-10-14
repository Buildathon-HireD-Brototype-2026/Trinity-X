import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/routing/route_names.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/widgets/app_loading_indicator.dart';
import '../domain/trip_model.dart';
import 'controllers/current_trip_provider.dart';

/// Professional Trips Listing screen displaying corporate orders
/// ordered chronologically (Today 9 AM first, 1 PM second, upcoming days below).
class TripsScreen extends ConsumerStatefulWidget {
  const TripsScreen({super.key});

  @override
  ConsumerState<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends ConsumerState<TripsScreen> {
  int _selectedFilterIndex = 0; // 0: All, 1: Today, 2: Upcoming

  String _formatTime(DateTime utcTime) {
    final kolkata = utcTime.add(const Duration(hours: 5, minutes: 30));
    return DateFormat('hh:mm a').format(kolkata);
  }

  String _getDateHeader(DateTime utcTime) {
    final kolkata = utcTime.add(const Duration(hours: 5, minutes: 30));
    final nowKolkata = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));

    final isToday = kolkata.year == nowKolkata.year &&
        kolkata.month == nowKolkata.month &&
        kolkata.day == nowKolkata.day;

    final tomorrow = nowKolkata.add(const Duration(days: 1));
    final isTomorrow = kolkata.year == tomorrow.year &&
        kolkata.month == tomorrow.month &&
        kolkata.day == tomorrow.day;

    if (isToday) {
      return 'TODAY • ${DateFormat('d MMMM').format(kolkata).toUpperCase()}';
    } else if (isTomorrow) {
      return 'TOMORROW • ${DateFormat('d MMMM').format(kolkata).toUpperCase()}';
    } else {
      return DateFormat('EEEE • d MMMM').format(kolkata).toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final allTripsAsync = ref.watch(allTripsProvider);

    return Scaffold(
      backgroundColor: themeColors.pageBackground,
      appBar: AppBar(
        backgroundColor: themeColors.cardBackground,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: themeColors.textPrimary,
            size: 20,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Assigned Trips',
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        centerTitle: false,
      ),
      body: SafeArea(
        child: allTripsAsync.when(
          loading: () => const Center(child: AppLoadingIndicator()),
          error: (err, _) => Center(
            child: Text(
              'Failed to load trips: $err',
              style: TextStyle(color: themeColors.textPrimary),
            ),
          ),
          data: (trips) {
            if (trips.isEmpty) {
              return _buildEmptyState(context);
            }

            // Filter trips
            final nowKolkata = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
            final filteredTrips = trips.where((t) {
              final tripKolkata = t.pickupTime.add(const Duration(hours: 5, minutes: 30));
              final isToday = tripKolkata.year == nowKolkata.year &&
                  tripKolkata.month == nowKolkata.month &&
                  tripKolkata.day == nowKolkata.day;

              if (_selectedFilterIndex == 1) return isToday;
              if (_selectedFilterIndex == 2) return !isToday;
              return true;
            }).toList();

            // Group trips by date header
            final Map<String, List<TripModel>> grouped = {};
            for (final trip in filteredTrips) {
              final header = _getDateHeader(trip.pickupTime);
              grouped.putIfAbsent(header, () => []).add(trip);
            }

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Filter Switcher Bar
                Container(
                  color: themeColors.cardBackground,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: Row(
                    children: [
                      _buildFilterChip(label: 'All (${trips.length})', index: 0),
                      const SizedBox(width: 8),
                      _buildFilterChip(label: 'Today', index: 1),
                      const SizedBox(width: 8),
                      _buildFilterChip(label: 'Upcoming', index: 2),
                    ],
                  ),
                ),
                Divider(height: 1, color: themeColors.border),

                // Trips List grouped chronologically
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    itemCount: grouped.keys.length,
                    itemBuilder: (context, index) {
                      final header = grouped.keys.elementAt(index);
                      final groupTrips = grouped[header]!;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Section Header (e.g. TODAY • 14 OCTOBER)
                          Padding(
                            padding: const EdgeInsets.only(left: 4, bottom: 12, top: 8),
                            child: Row(
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: header.startsWith('TODAY')
                                        ? const Color(0xFF10B981)
                                        : themeColors.purpleAccent,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  header,
                                  style: TextStyle(
                                    color: header.startsWith('TODAY')
                                        ? (isDark ? const Color(0xFF34D399) : const Color(0xFF059669))
                                        : themeColors.textSecondary,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Cards in this group
                          ...groupTrips.map((trip) => _buildTripCard(context, trip)),
                          const SizedBox(height: 12),
                        ],
                      );
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildFilterChip({required String label, required int index}) {
    final themeColors = context.appColors;
    final isSelected = _selectedFilterIndex == index;

    return InkWell(
      onTap: () => setState(() => _selectedFilterIndex = index),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? themeColors.purpleAccent : themeColors.innerBox,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? themeColors.purpleAccent : themeColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : themeColors.textSecondary,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildTripCard(BuildContext context, TripModel trip) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14.0),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () {
            ref.read(selectedTripIdProvider.notifier).select(trip.tripId);
            context.push(RouteNames.tripDetails);
          },
          child: Container(
            decoration: BoxDecoration(
              color: themeColors.cardBackground,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: trip.isOngoing
                    ? (isDark ? const Color(0xFF2563EB) : const Color(0xFF93C5FD))
                    : themeColors.border,
                width: trip.isOngoing ? 1.5 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Row: Time, Company & Status Chip
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: trip.isOngoing
                                ? const Color(0xFF10B981)
                                : themeColors.purpleTint,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.access_time_filled_rounded,
                                size: 14,
                                color: trip.isOngoing ? Colors.white : themeColors.purpleAccent,
                              ),
                              const SizedBox(width: 5),
                              Text(
                                _formatTime(trip.pickupTime),
                                style: TextStyle(
                                  color: trip.isOngoing ? Colors.white : themeColors.purpleAccent,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          trip.companyName,
                          style: TextStyle(
                            color: themeColors.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: trip.isOngoing
                            ? (isDark ? const Color(0xFF1E3A8A) : const Color(0xFFDBEAFE))
                            : (isDark ? const Color(0xFF78350F) : const Color(0xFFFEF3C7)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        trip.isOngoing ? 'ONGOING' : 'ASSIGNED',
                        style: TextStyle(
                          color: trip.isOngoing
                              ? (isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8))
                              : (isDark ? const Color(0xFFFBBF24) : const Color(0xFFB45309)),
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Pickup location line
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      margin: const EdgeInsets.only(top: 4),
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        trip.pickupSpot,
                        style: TextStyle(
                          color: themeColors.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Dropoff location line
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      margin: const EdgeInsets.only(top: 4),
                      decoration: const BoxDecoration(
                        color: Color(0xFFEF4444),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        trip.dropoffSpot,
                        style: TextStyle(
                          color: themeColors.textSecondary,
                          fontSize: 12.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Divider(height: 1, color: themeColors.divider),
                const SizedBox(height: 12),

                // Bottom row: Passenger Name, Payout & Arrow
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.person_outline_rounded, size: 16, color: themeColors.textMuted),
                        const SizedBox(width: 6),
                        Text(
                          trip.contactName,
                          style: TextStyle(
                            color: themeColors.textSecondary,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          '₹${trip.driverShare.toStringAsFixed(0)}',
                          style: TextStyle(
                            color: themeColors.purpleAccent,
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          Icons.arrow_forward_ios_rounded,
                          size: 13,
                          color: themeColors.textMuted,
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final themeColors = context.appColors;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: themeColors.purpleTint,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.calendar_today_rounded,
                color: themeColors.purpleAccent,
                size: 36,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'No Scheduled Trips',
              style: TextStyle(
                color: themeColors.textPrimary,
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Corporate bookings assigned by the HireD operations admin will appear here in chronological order.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: themeColors.textSecondary,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
