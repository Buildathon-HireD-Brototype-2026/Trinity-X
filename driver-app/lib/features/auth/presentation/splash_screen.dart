import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';

/// Clean white splash screen perfectly matching Android 12+ native splash dimensions.
/// The logo is calibrated to 140x45 dp at the dead-center of the screen, ensuring
/// ZERO jump, ZERO resize, and ZERO lag between native Android launch and Flutter.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _spinnerFade;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );

    // Smooth spinner fade-in beneath the steady logo
    _spinnerFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.2, 1.0, curve: Curves.easeIn),
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Dead-center HireD Logo: Exact 139x44.5 dp matching native Android splash icon
          Center(
            child: Image.asset(
              'assets/images/logo.png',
              width: 139.2,
              height: 44.5,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return const Text(
                  'HireD',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                    letterSpacing: -0.5,
                  ),
                );
              },
            ),
          ),

          // 2. Subtle, smooth brand-purple spinner tucked neatly directly beneath the logo
          // Center-anchored Transform ensures the logo coordinates never shift.
          Center(
            child: Transform.translate(
              offset: const Offset(0, 52),
              child: FadeTransition(
                opacity: _spinnerFade,
                child: const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
