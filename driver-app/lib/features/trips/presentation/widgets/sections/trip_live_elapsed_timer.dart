import 'dart:async';
import 'package:flutter/material.dart';

/// Scoped live elapsed timer widget that updates once per second
/// without triggering rebuilds of parent or page widgets.
class TripLiveElapsedTimer extends StatefulWidget {
  final DateTime startedAt;
  final TextStyle? style;

  const TripLiveElapsedTimer({
    super.key,
    required this.startedAt,
    this.style,
  });

  @override
  State<TripLiveElapsedTimer> createState() => _TripLiveElapsedTimerState();
}

class _TripLiveElapsedTimerState extends State<TripLiveElapsedTimer> {
  Timer? _timer;
  late Duration _elapsed;

  @override
  void initState() {
    super.initState();
    _computeElapsed();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _computeElapsed();
        });
      }
    });
  }

  void _computeElapsed() {
    final now = DateTime.now().toUtc();
    final diff = now.difference(widget.startedAt);
    _elapsed = diff.isNegative ? Duration.zero : diff;
  }

  @override
  void didUpdateWidget(covariant TripLiveElapsedTimer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.startedAt != widget.startedAt) {
      _computeElapsed();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final h = _elapsed.inHours;
    final m = _elapsed.inMinutes.remainder(60);
    final s = _elapsed.inSeconds.remainder(60);

    final String text;
    if (h > 0) {
      text = '${h}h ${m}m ${s.toString().padLeft(2, '0')}s';
    } else {
      text = '${m}m ${s.toString().padLeft(2, '0')}s';
    }

    return Text(
      text,
      style: widget.style,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}
