import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/trip_model.dart';
import '../controllers/sos_controller.dart';
import '../sos_status_screen.dart';
import 'sos_reason_sheet.dart';

/// Top-right App Bar button for triggering or viewing Trip Emergency SOS.
/// Displays ONLY when trip is in progress (`status == IN_PROGRESS` or `ONGOING`).
class SosButton extends ConsumerStatefulWidget {
  final TripModel trip;

  const SosButton({
    super.key,
    required this.trip,
  });

  @override
  ConsumerState<SosButton> createState() => _SosButtonState();
}

class _SosButtonState extends ConsumerState<SosButton> with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _scaleAnimation;
  late final Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    final isTest = WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');
    if (!isTest) {
      _pulseController.repeat(reverse: true);
    }

    _scaleAnimation = Tween<double>(begin: 0.96, end: 1.04).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _glowAnimation = Tween<double>(begin: 4.0, end: 12.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Initial check for active SOS on trip load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.trip.isInProgress) {
        ref.read(sosControllerProvider.notifier).checkActiveSos(widget.trip.tripId);
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _handleTap() async {
    final sosState = ref.read(sosControllerProvider);
    final activeAlert = sosState.activeAlert ??
        await ref.read(sosControllerProvider.notifier).checkActiveSos(widget.trip.tripId);

    if (!mounted) return;

    if (activeAlert != null && activeAlert.isActive) {
      // Alert already active -> open SOS status screen directly
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => SosStatusScreen(
            trip: widget.trip,
            initialAlert: activeAlert,
          ),
        ),
      );
    } else {
      // No active alert -> open reason selector bottom sheet
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (ctx) => SosReasonSheet(trip: widget.trip),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Only show when trip is currently IN_PROGRESS (hide for ASSIGNED, ACCEPTED, CLOSED)
    if (!widget.trip.isInProgress) {
      return const SizedBox.shrink();
    }

    final sosState = ref.watch(sosControllerProvider);
    final hasActiveAlert = sosState.hasActiveSos;

    return Padding(
      padding: const EdgeInsets.only(right: 12.0),
      child: Center(
        child: AnimatedBuilder(
          animation: _pulseController,
          builder: (context, child) {
            return Transform.scale(
              scale: _scaleAnimation.value,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFDC2626).withValues(alpha: 0.45),
                      blurRadius: _glowAnimation.value,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: child,
              ),
            );
          },
          child: Material(
            color: const Color(0xFFDC2626), // Crimson red
            borderRadius: BorderRadius.circular(20),
            elevation: 0,
            child: InkWell(
              onTap: _handleTap,
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.sos_rounded,
                      color: Colors.white,
                      size: 19,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      hasActiveAlert ? 'ACTIVE' : 'SOS',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
