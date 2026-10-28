import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme_colors.dart';

/// Full-screen camera overlay with a dark semi-transparent scrim and a central oval cutout.
/// The border color matches the app logo/primary theme color by default and turns
/// bright green when a valid face is detected in the frame.
class FaceGuideOverlay extends StatelessWidget {
  final bool isValidFace;
  final String instruction;
  final Color? defaultBorderColor;

  const FaceGuideOverlay({
    super.key,
    required this.isValidFace,
    this.instruction = 'Align your face in the oval',
    this.defaultBorderColor,
  });

  /// Computes the central oval bounds for a given screen/widget size.
  static Rect getOvalRect(Size size) {
    final ovalWidth = size.width * 0.72;
    final ovalHeight = ovalWidth * 1.35;
    final left = (size.width - ovalWidth) / 2;
    final top = (size.height - ovalHeight) / 2 - 20;
    return Rect.fromLTWH(left, top, ovalWidth, ovalHeight);
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final primaryColor = defaultBorderColor ?? themeColors.purpleAccent;
    const validColor = Color(0xFF10B981); // Emerald green

    final borderColor = isValidFace ? validColor : primaryColor;

    return Stack(
      fit: StackFit.expand,
      children: [
        CustomPaint(
          painter: _FaceOvalPainter(
            borderColor: borderColor,
            isValid: isValidFace,
          ),
        ),
        Positioned(
          left: 24,
          right: 24,
          bottom: 120,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: isValidFace
                  ? const Color(0xFF064E3B).withValues(alpha: 0.9)
                  : Colors.black.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: borderColor.withValues(alpha: 0.8),
                width: 1.5,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  isValidFace
                      ? Icons.check_circle_rounded
                      : Icons.face_retouching_natural_rounded,
                  color: isValidFace ? validColor : Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    instruction,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: isValidFace ? validColor : Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _FaceOvalPainter extends CustomPainter {
  final Color borderColor;
  final bool isValid;

  _FaceOvalPainter({
    required this.borderColor,
    required this.isValid,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final fullRect = Offset.zero & size;
    final ovalRect = FaceGuideOverlay.getOvalRect(size);

    // 1. Draw semi-transparent dark overlay around the oval cutout
    final backgroundPath = Path()..addRect(fullRect);
    final ovalPath = Path()..addOval(ovalRect);
    final scrimPath = Path.combine(PathOperation.difference, backgroundPath, ovalPath);

    final scrimPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.65)
      ..style = PaintingStyle.fill;
    canvas.drawPath(scrimPath, scrimPaint);

    // 2. Draw outer glow when valid face is detected
    if (isValid) {
      final glowPaint = Paint()
        ..color = borderColor.withValues(alpha: 0.35)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 10.0
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
      canvas.drawOval(ovalRect, glowPaint);
    }

    // 3. Draw oval border
    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = isValid ? 4.0 : 3.5;
    canvas.drawOval(ovalRect, borderPaint);
  }

  @override
  bool shouldRepaint(covariant _FaceOvalPainter oldDelegate) {
    return oldDelegate.borderColor != borderColor || oldDelegate.isValid != isValid;
  }
}
