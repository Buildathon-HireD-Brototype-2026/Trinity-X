import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';

/// Configuration and helper utilities for OpenStreetMap and external navigation.
///
/// NOTE: No Google Maps API key, SDK, or billing is required. In-app map previews
/// use OpenStreetMap tiles via flutter_map, and turn-by-turn navigation opens the
/// user's preferred external maps application (such as Google Maps) using url_launcher.
class MapsConfig {
  MapsConfig._();

  /// OpenStreetMap tile URL template (standard OSM raster tiles)
  static const String osmTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  /// Required attribution text per OpenStreetMap tile usage policy
  static const String osmAttribution = '© OpenStreetMap contributors';

  /// User agent package name sent in tile HTTP requests
  static const String userAgentPackageName = 'com.hired.driver_app';

  /// Default center coordinates (Kochi, Kerala, India)
  static const double defaultLat = 9.9312;
  static const double defaultLng = 76.2673;

  /// Generate a plain Google Maps search URL (does not require an API key)
  static String getSearchUrl({
    required double lat,
    required double lng,
    String? query,
  }) {
    final q = query != null && query.isNotEmpty ? Uri.encodeComponent(query) : '$lat,$lng';
    return 'https://www.google.com/maps/search/?api=1&query=$q';
  }

  /// Generate a plain Google Maps directions URL (does not require an API key)
  static String getDirectionsUrl({
    required double destLat,
    required double destLng,
    double? originLat,
    double? originLng,
    String travelMode = 'driving',
  }) {
    final originParam = (originLat != null && originLng != null)
        ? '&origin=$originLat,$originLng'
        : '';
    return 'https://www.google.com/maps/dir/?api=1&destination=$destLat,$destLng$originParam&travelmode=$travelMode';
  }

  /// Launch external Google Maps to view a location
  static Future<bool> openInGoogleMaps({
    required double lat,
    required double lng,
    String? query,
  }) async {
    final url = getSearchUrl(lat: lat, lng: lng, query: query);
    final uri = Uri.parse(url);
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint('[MapsConfig] Could not launch maps URL $url: $e');
      return false;
    }
  }

  /// Launch external Google Maps or native maps app for turn-by-turn navigation
  static Future<bool> openNavigation({
    required double destLat,
    required double destLng,
    double? originLat,
    double? originLng,
  }) async {
    final url = getDirectionsUrl(
      destLat: destLat,
      destLng: destLng,
      originLat: originLat,
      originLng: originLng,
    );
    final uri = Uri.parse(url);
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint('[MapsConfig] Could not launch navigation URL $url: $e');
      return false;
    }
  }
}
