import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:path_provider/path_provider.dart';
import '../domain/trip_model.dart';

class StaticMapService {
  static final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 6),
    receiveTimeout: const Duration(seconds: 6),
  ));

  // In-memory cache to avoid disk I/O on every rebuild
  static final Map<String, Uint8List> _memCache = {};

  /// Retrieves cached map bytes or fetches and caches them to disk.
  static Future<Uint8List?> getStaticMapImage({
    required TripModel trip,
    required bool isDark,
  }) async {
    if (!trip.hasValidCoordinates ||
        trip.pickupLat == null ||
        trip.pickupLng == null ||
        trip.dropoffLat == null ||
        trip.dropoffLng == null) {
      return null;
    }

    final cacheKey = '${trip.tripId}_${isDark ? "dark" : "light"}';

    // 1. Check in-memory cache
    if (_memCache.containsKey(cacheKey)) {
      return _memCache[cacheKey];
    }

    // 2. Check disk cache
    File? cacheFile;
    try {
      final tempDir = await getTemporaryDirectory();
      final cacheDir = Directory('${tempDir.path}/maps_cache');
      if (!cacheDir.existsSync()) {
        cacheDir.createSync(recursive: true);
      }
      cacheFile = File('${cacheDir.path}/static_map_$cacheKey.png');
      if (cacheFile.existsSync()) {
        final bytes = await cacheFile.readAsBytes();
        if (bytes.isNotEmpty) {
          _memCache[cacheKey] = bytes;
          return bytes;
        }
      }
    } catch (_) {}

    // 3. Check for API key in dotenv
    final apiKey = dotenv.env['MAPS_API_KEY'] ?? dotenv.env['GOOGLE_MAPS_API_KEY'];
    if (apiKey == null || apiKey.isEmpty) {
      // No external API key provided: return null to display clean themed preview
      return null;
    }

    // 4. Fetch from Google Static Maps API
    final url = _buildGoogleStaticMapUrl(
      trip: trip,
      isDark: isDark,
      apiKey: apiKey,
    );

    try {
      final response = await _dio.get<List<int>>(
        url,
        options: Options(responseType: ResponseType.bytes),
      );

      if (response.statusCode == 200 && response.data != null) {
        final bytes = Uint8List.fromList(response.data!);
        _memCache[cacheKey] = bytes;

        // Save to disk asynchronously
        if (cacheFile != null) {
          cacheFile.writeAsBytes(bytes).catchError((_) => cacheFile!);
        }
        return bytes;
      }
    } catch (e) {
      debugPrint('[StaticMapService] Failed to load static map: $e');
    }

    return null;
  }

  static String _buildGoogleStaticMapUrl({
    required TripModel trip,
    required bool isDark,
    required String apiKey,
  }) {
    final pLat = trip.pickupLat!;
    final pLng = trip.pickupLng!;
    final dLat = trip.dropoffLat!;
    final dLng = trip.dropoffLng!;

    final buffer = StringBuffer('https://maps.googleapis.com/maps/api/staticmap?');
    buffer.write('size=600x320&scale=2&maptype=roadmap');

    // Pickup pin (Green #10B981) & Dropoff pin (Red #EF4444)
    buffer.write('&markers=color:0x10B981|label:P|$pLat,$pLng');
    buffer.write('&markers=color:0xEF4444|label:D|$dLat,$dLng');

    // Route line in app primary color (#6A379F)
    if (trip.routePolyline != null && trip.routePolyline!.isNotEmpty) {
      buffer.write('&path=color:0x6A379FFF|weight:4|enc:${trip.routePolyline!}');
    } else {
      buffer.write('&path=color:0x6A379FFF|weight:4|$pLat,$pLng|$dLat,$dLng');
    }

    // Dark style if dark mode
    if (isDark) {
      buffer.write('&style=element:geometry|color:0x242f3e');
      buffer.write('&style=element:labels.text.stroke|color:0x242f3e');
      buffer.write('&style=element:labels.text.fill|color:0x746855');
      buffer.write('&style=feature:road|element:geometry|color:0x38414e');
      buffer.write('&style=feature:road|element:geometry.stroke|color:0x212a37');
      buffer.write('&style=feature:water|element:geometry|color:0x17263c');
    }

    buffer.write('&key=$apiKey');
    return buffer.toString();
  }
}
