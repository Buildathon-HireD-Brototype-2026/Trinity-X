import 'package:flutter/material.dart';

/// Legacy in-app floating card placeholder.
/// The application uses the Android native Floating Overlay Window exclusively.
class TripMiniFloatingCard extends StatelessWidget {
  const TripMiniFloatingCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink();
  }
}
