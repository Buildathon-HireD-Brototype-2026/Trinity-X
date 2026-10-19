import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart' hide Path;
import '../../../core/config/maps_config.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/widgets/live_map.dart';
import '../../trips/presentation/controllers/current_trip_provider.dart';

/// Place search result item without requiring Google Places API or billing
class PlaceSearchResult {
  final String title;
  final String subtitle;
  final double lat;
  final double lng;
  final IconData icon;

  const PlaceSearchResult({
    required this.title,
    required this.subtitle,
    required this.lat,
    required this.lng,
    required this.icon,
  });
}

/// Trip Details Screen featuring:
/// 1. OpenStreetMap preview via flutter_map + latlong2 with "© OpenStreetMap contributors"
/// 2. Driver position, pickup, and dropoff markers
/// 3. "Open in Google Maps" and "Navigate" buttons using url_launcher
/// 4. Integrated place search with zero Google API keys or billing
class TripDetailsScreen extends ConsumerStatefulWidget {
  const TripDetailsScreen({super.key});

  @override
  ConsumerState<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends ConsumerState<TripDetailsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  // Preset quick navigation points for Kochi & Kerala driver hubs (zero API key)
  static const List<PlaceSearchResult> _knownPlaces = [
    PlaceSearchResult(
      title: 'Infopark Phase 1 & 2',
      subtitle: 'Kakkanad, Kochi, Kerala 682042',
      lat: 10.0158,
      lng: 76.3638,
      icon: Icons.business_rounded,
    ),
    PlaceSearchResult(
      title: 'Cochin International Airport (COK)',
      subtitle: 'Airport Rd, Nedumbassery, Kochi 683111',
      lat: 10.1518,
      lng: 76.4019,
      icon: Icons.flight_takeoff_rounded,
    ),
    PlaceSearchResult(
      title: 'Ernakulam South Railway Station',
      subtitle: 'South Railway Station Rd, Ernakulam 682016',
      lat: 9.9676,
      lng: 76.2894,
      icon: Icons.train_rounded,
    ),
    PlaceSearchResult(
      title: 'Lulu International Shopping Mall',
      subtitle: '34/1000, Old NH 47, Edappally, Kochi 682024',
      lat: 10.0274,
      lng: 76.3081,
      icon: Icons.local_mall_rounded,
    ),
    PlaceSearchResult(
      title: 'Marine Drive Walkway & Jetty',
      subtitle: 'Shanmugham Rd, Menaka, Kochi 682031',
      lat: 9.9816,
      lng: 76.2758,
      icon: Icons.directions_boat_rounded,
    ),
    PlaceSearchResult(
      title: 'Kakkanad Civil Station',
      subtitle: 'Civil Station, Kakkanad, Kochi 682030',
      lat: 10.0211,
      lng: 76.3533,
      icon: Icons.account_balance_rounded,
    ),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<PlaceSearchResult> get _filteredPlaces {
    if (_searchQuery.trim().isEmpty) {
      return _knownPlaces;
    }
    final q = _searchQuery.toLowerCase();
    return _knownPlaces.where((p) {
      return p.title.toLowerCase().contains(q) ||
          p.subtitle.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final selectedTrip = ref.watch(selectedTripProvider);
    final assignedTrips = ref.watch(assignedTripsProvider).valueOrNull ?? [];

    // Fallback coordinates for preview
    final LatLng driverPos = const LatLng(9.9981, 76.3575);
    final LatLng pickupPos = selectedTrip != null &&
            assignedTrips.isNotEmpty &&
            selectedTrip.tripId == assignedTrips.first.tripId
        ? const LatLng(10.0158, 76.3418)
        : const LatLng(9.9312, 76.2673);
    final LatLng dropoffPos = selectedTrip != null &&
            assignedTrips.isNotEmpty &&
            selectedTrip.tripId == assignedTrips.first.tripId
        ? const LatLng(10.1518, 76.4019)
        : const LatLng(9.9816, 76.2999);

    final pickupTitle = selectedTrip?.pickupSpot ?? 'Tech Park Gate 2, Electronic City';
    final dropoffTitle = selectedTrip?.dropoffSpot ?? 'Prestige Cloud Hub, Terminal 1';

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
          selectedTrip != null ? 'Trip #${selectedTrip.tripId}' : 'Trip Details',
          style: TextStyle(
            color: themeColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          if (selectedTrip != null)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: selectedTrip.isOngoing
                        ? (isDark ? const Color(0xFF1E3A8A) : const Color(0xFFDBEAFE))
                        : themeColors.purpleTint,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    selectedTrip.status,
                    style: TextStyle(
                      color: selectedTrip.isOngoing
                          ? (isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8))
                          : themeColors.purpleAccent,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. OpenStreetMap live preview with flutter_map + latlong2 & attribution
            LiveMap(
              height: 240,
              pickupPosition: pickupPos,
              dropoffPosition: dropoffPos,
              pickupLabel: pickupTitle,
              dropoffLabel: dropoffTitle,
              showControls: true,
              initialZoom: 16.0,
            ),
            const SizedBox(height: 16),

            // 2. Primary Quick-Navigation Buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: themeColors.purpleAccent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 2,
                    ),
                    onPressed: () {
                      MapsConfig.openNavigation(
                        destLat: pickupPos.latitude,
                        destLng: pickupPos.longitude,
                        originLat: driverPos.latitude,
                        originLng: driverPos.longitude,
                      );
                    },
                    icon: const Icon(Icons.navigation_rounded, size: 18),
                    label: const Text(
                      'Navigate (Pickup)',
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: themeColors.purpleAccent,
                      side: BorderSide(color: themeColors.purpleAccent, width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () {
                      MapsConfig.openInGoogleMaps(
                        lat: dropoffPos.latitude,
                        lng: dropoffPos.longitude,
                        query: dropoffTitle,
                      );
                    },
                    icon: const Icon(Icons.map_rounded, size: 18),
                    label: const Text(
                      'Open in Maps',
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // 3. Location Details Card (Pickup & Dropoff)
            _buildLocationCard(
              context: context,
              themeColors: themeColors,
              isDark: isDark,
              pickupTitle: pickupTitle,
              dropoffTitle: dropoffTitle,
              pickupPos: pickupPos,
              dropoffPos: dropoffPos,
              driverPos: driverPos,
              pickupTime: selectedTrip?.pickupTime,
            ),
            const SizedBox(height: 20),

            // 4. Place Search & Waypoint Explorer (Zero API Key)
            _buildPlaceSearchSection(
              context: context,
              themeColors: themeColors,
              isDark: isDark,
              driverPos: driverPos,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationCard({
    required BuildContext context,
    required AppThemeColors themeColors,
    required bool isDark,
    required String pickupTitle,
    required String dropoffTitle,
    required LatLng pickupPos,
    required LatLng dropoffPos,
    required LatLng driverPos,
    DateTime? pickupTime,
  }) {
    final timeStr = pickupTime != null
        ? DateFormat('hh:mm a').format(pickupTime.toLocal())
        : '10:30 AM';

    return Container(
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: themeColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Route Stops',
            style: TextStyle(
              color: themeColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),

          // Pickup Point Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: Color(0xFF10B981),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.person_pin_circle_rounded, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'PICKUP SPOT',
                          style: TextStyle(
                            color: const Color(0xFF10B981),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '• $timeStr',
                          style: TextStyle(
                            color: themeColors.textSecondary,
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      pickupTitle,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildMiniActionButton(
                          icon: Icons.navigation_outlined,
                          label: 'Navigate',
                          color: const Color(0xFF10B981),
                          onTap: () => MapsConfig.openNavigation(
                            destLat: pickupPos.latitude,
                            destLng: pickupPos.longitude,
                            originLat: driverPos.latitude,
                            originLng: driverPos.longitude,
                          ),
                        ),
                        const SizedBox(width: 8),
                        _buildMiniActionButton(
                          icon: Icons.map_outlined,
                          label: 'Open in Google Maps',
                          color: themeColors.textSecondary,
                          onTap: () => MapsConfig.openInGoogleMaps(
                            lat: pickupPos.latitude,
                            lng: pickupPos.longitude,
                            query: pickupTitle,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          Padding(
            padding: const EdgeInsets.only(left: 15, top: 4, bottom: 4),
            child: SizedBox(
              height: 20,
              child: VerticalDivider(
                color: themeColors.border,
                thickness: 2,
              ),
            ),
          ),

          // Dropoff Point Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: Color(0xFFEF4444),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.flag_rounded, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'DROPOFF SPOT',
                      style: TextStyle(
                        color: const Color(0xFFEF4444),
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      dropoffTitle,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildMiniActionButton(
                          icon: Icons.navigation_outlined,
                          label: 'Navigate',
                          color: const Color(0xFFEF4444),
                          onTap: () => MapsConfig.openNavigation(
                            destLat: dropoffPos.latitude,
                            destLng: dropoffPos.longitude,
                            originLat: driverPos.latitude,
                            originLng: driverPos.longitude,
                          ),
                        ),
                        const SizedBox(width: 8),
                        _buildMiniActionButton(
                          icon: Icons.map_outlined,
                          label: 'Open in Google Maps',
                          color: themeColors.textSecondary,
                          onTap: () => MapsConfig.openInGoogleMaps(
                            lat: dropoffPos.latitude,
                            lng: dropoffPos.longitude,
                            query: dropoffTitle,
                          ),
                        ),
                      ],
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

  Widget _buildMiniActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: color.withValues(alpha: 0.4)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 13, color: color),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceSearchSection({
    required BuildContext context,
    required AppThemeColors themeColors,
    required bool isDark,
    required LatLng driverPos,
  }) {
    final places = _filteredPlaces;

    return Container(
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: themeColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.search_rounded, color: themeColors.purpleAccent, size: 20),
              const SizedBox(width: 8),
              Text(
                'Place Search & Navigation',
                style: TextStyle(
                  color: themeColors.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Search destinations or landmarks. Open in Google Maps or launch navigation without API keys.',
            style: TextStyle(
              color: themeColors.textSecondary,
              fontSize: 12,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 14),

          // Search Input Bar
          TextField(
            controller: _searchController,
            onChanged: (val) => setState(() => _searchQuery = val),
            style: TextStyle(color: themeColors.textPrimary, fontSize: 13.5),
            decoration: InputDecoration(
              hintText: 'Search place, airport, terminal, tech park...',
              hintStyle: TextStyle(color: themeColors.unselectedIcon, fontSize: 13),
              prefixIcon: Icon(Icons.travel_explore_rounded, color: themeColors.purpleAccent, size: 20),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              filled: true,
              fillColor: isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Place Search Results List
          if (places.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Text(
                  'No matching places found for "$_searchQuery".',
                  style: TextStyle(color: themeColors.textSecondary, fontSize: 13),
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: places.length,
              separatorBuilder: (_, __) => Divider(color: themeColors.border, height: 1),
              itemBuilder: (context, index) {
                final place = places[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: themeColors.purpleTint,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(place.icon, color: themeColors.purpleAccent, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              place.title,
                              style: TextStyle(
                                color: themeColors.textPrimary,
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              place.subtitle,
                              style: TextStyle(
                                color: themeColors.textSecondary,
                                fontSize: 11.5,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 6,
                              children: [
                                _buildMiniActionButton(
                                  icon: Icons.navigation_rounded,
                                  label: 'Navigate',
                                  color: themeColors.purpleAccent,
                                  onTap: () => MapsConfig.openNavigation(
                                    destLat: place.lat,
                                    destLng: place.lng,
                                    originLat: driverPos.latitude,
                                    originLng: driverPos.longitude,
                                  ),
                                ),
                                _buildMiniActionButton(
                                  icon: Icons.open_in_new_rounded,
                                  label: 'Open in Google Maps',
                                  color: themeColors.textSecondary,
                                  onTap: () => MapsConfig.openInGoogleMaps(
                                    lat: place.lat,
                                    lng: place.lng,
                                    query: place.title,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
