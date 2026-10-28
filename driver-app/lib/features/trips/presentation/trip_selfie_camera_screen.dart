import 'dart:async';
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../../core/theme/app_theme_colors.dart';
import 'widgets/face_guide_overlay.dart';

/// Full-screen live selfie camera screen with real-time ML Kit face detection,
/// face oval guide overlay, eye-open classification, auto-capture after ~1s,
/// and manual capture button.
class TripSelfieCameraScreen extends StatefulWidget {
  final String tripId;

  const TripSelfieCameraScreen({
    super.key,
    required this.tripId,
  });

  /// Navigates to this camera screen and returns the captured selfie file path (or null if cancelled).
  static Future<String?> open(BuildContext context, {required String tripId}) {
    return Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => TripSelfieCameraScreen(tripId: tripId),
        fullscreenDialog: true,
      ),
    );
  }

  @override
  State<TripSelfieCameraScreen> createState() => _TripSelfieCameraScreenState();
}

class _TripSelfieCameraScreenState extends State<TripSelfieCameraScreen> with WidgetsBindingObserver {
  CameraController? _cameraController;
  List<CameraDescription> _cameras = [];
  CameraDescription? _selectedCamera;

  FaceDetector? _faceDetector;
  bool _isProcessingFrame = false;
  bool _isCameraInitialized = false;
  bool _isCapturing = false;
  bool _hasPermission = false;
  bool _isPermissionPermanentlyDenied = false;

  // Face scanning state
  bool _isValidFace = false;
  String _scanInstruction = 'Align your face inside the oval';
  DateTime? _validFaceStartTime;
  Timer? _autoCaptureTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initFaceDetector();
    _checkPermissionAndInitCamera();
  }

  void _initFaceDetector() {
    _faceDetector = FaceDetector(
      options: FaceDetectorOptions(
        enableClassification: true, // Enables eyes-open probability
        performanceMode: FaceDetectorMode.fast,
        minFaceSize: 0.15,
      ),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _autoCaptureTimer?.cancel();
    _cameraController?.dispose();
    _faceDetector?.close();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final cameraController = _cameraController;
    if (cameraController == null || !cameraController.value.isInitialized) {
      return;
    }
    if (state == AppLifecycleState.inactive) {
      cameraController.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _initSelectedCamera();
    }
  }

  Future<void> _checkPermissionAndInitCamera() async {
    final status = await Permission.camera.status;
    if (status.isGranted) {
      setState(() => _hasPermission = true);
      await _loadCamerasAndInit();
    } else if (status.isPermanentlyDenied) {
      setState(() {
        _hasPermission = false;
        _isPermissionPermanentlyDenied = true;
      });
    } else {
      final reqResult = await Permission.camera.request();
      if (reqResult.isGranted) {
        setState(() => _hasPermission = true);
        await _loadCamerasAndInit();
      } else {
        setState(() {
          _hasPermission = false;
          _isPermissionPermanentlyDenied = reqResult.isPermanentlyDenied;
        });
      }
    }
  }

  Future<void> _loadCamerasAndInit() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No camera available on this device.')),
          );
        }
        return;
      }

      // Requirement: Front camera is selected
      _selectedCamera = _cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras.first,
      );

      await _initSelectedCamera();
    } catch (e) {
      debugPrint('[TripSelfieCamera] Error loading cameras: $e');
    }
  }

  Future<void> _initSelectedCamera() async {
    final camera = _selectedCamera;
    if (camera == null) return;

    final controller = CameraController(
      camera,
      ResolutionPreset.high,
      enableAudio: false,
      imageFormatGroup: Platform.isAndroid
          ? ImageFormatGroup.nv21
          : ImageFormatGroup.bgra8888,
    );

    _cameraController = controller;

    try {
      await controller.initialize();
      if (!mounted) return;

      setState(() => _isCameraInitialized = true);

      // Start live image stream for face detection
      await controller.startImageStream(_processCameraImage);
    } catch (e) {
      debugPrint('[TripSelfieCamera] Camera init error: $e');
    }
  }

  void _processCameraImage(CameraImage image) async {
    if (_isProcessingFrame || _isCapturing || _faceDetector == null) return;
    _isProcessingFrame = true;

    try {
      final inputImage = _inputImageFromCameraImage(image);
      if (inputImage == null) {
        _isProcessingFrame = false;
        return;
      }

      final faces = await _faceDetector!.processImage(inputImage);
      if (!mounted) return;

      _evaluateFaces(faces, Size(image.width.toDouble(), image.height.toDouble()));
    } catch (e) {
      debugPrint('[TripSelfieCamera] Face detection frame error: $e');
    } finally {
      _isProcessingFrame = false;
    }
  }

  InputImage? _inputImageFromCameraImage(CameraImage image) {
    final camera = _selectedCamera;
    if (camera == null) return null;

    final sensorOrientation = camera.sensorOrientation;
    InputImageRotation? rotation = InputImageRotationValue.fromRawValue(sensorOrientation);
    rotation ??= InputImageRotation.rotation0deg;

    final format = InputImageFormatValue.fromRawValue(image.format.raw);
    if (format == null) return null;

    final plane = image.planes.first;
    final bytes = image.planes.length == 1
        ? plane.bytes
        : _concatenatePlanes(image.planes);

    return InputImage.fromBytes(
      bytes: bytes,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation,
        format: format,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
  }

  Uint8List _concatenatePlanes(List<Plane> planes) {
    final allBytes = WriteBuffer();
    for (final plane in planes) {
      allBytes.putUint8List(plane.bytes);
    }
    return allBytes.done().buffer.asUint8List();
  }

  void _evaluateFaces(List<Face> faces, Size imageSize) {
    // Condition 1: Must be exactly one face
    if (faces.isEmpty) {
      _setFaceState(false, 'Align your face inside the oval');
      return;
    }

    if (faces.length > 1) {
      _setFaceState(false, 'Only one face allowed. Remove other people.');
      return;
    }

    final face = faces.first;

    // Condition 2: Eyes open check
    final leftEye = face.leftEyeOpenProbability;
    final rightEye = face.rightEyeOpenProbability;
    if (leftEye != null && leftEye < 0.45) {
      _setFaceState(false, 'Please keep both eyes open');
      return;
    }
    if (rightEye != null && rightEye < 0.45) {
      _setFaceState(false, 'Please keep both eyes open');
      return;
    }

    // Condition 3: Face must be reasonably centered (inside oval area)
    final faceBox = face.boundingBox;
    if (faceBox.width < 80 || faceBox.height < 80) {
      _setFaceState(false, 'Move closer to the camera');
      return;
    }

    // All conditions met -> Valid face!
    _setFaceState(true, 'Hold still, capturing selfie...');

    // Auto-capture after ~1 second of continuous valid face
    if (_validFaceStartTime == null) {
      _validFaceStartTime = DateTime.now();
      _autoCaptureTimer?.cancel();
      _autoCaptureTimer = Timer(const Duration(milliseconds: 1100), () {
        if (_isValidFace && !_isCapturing && mounted) {
          _captureAndReturnPhoto();
        }
      });
    }
  }

  void _setFaceState(bool valid, String instruction) {
    if (_isValidFace != valid || _scanInstruction != instruction) {
      setState(() {
        _isValidFace = valid;
        _scanInstruction = instruction;
        if (!valid) {
          _validFaceStartTime = null;
          _autoCaptureTimer?.cancel();
          _autoCaptureTimer = null;
        }
      });
    }
  }

  Future<void> _captureAndReturnPhoto() async {
    final controller = _cameraController;
    if (controller == null || !controller.value.isInitialized || _isCapturing) return;

    setState(() => _isCapturing = true);
    _autoCaptureTimer?.cancel();

    try {
      // Stop image stream before taking high-res picture
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }

      final xFile = await controller.takePicture();

      // Compress photo for fast upload and strict storage compliance
      final compressedPath = await _compressSelfie(xFile.path);

      if (mounted) {
        Navigator.of(context).pop(compressedPath);
      }
    } catch (e) {
      debugPrint('[TripSelfieCamera] Error capturing picture: $e');
      if (mounted) {
        setState(() => _isCapturing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to capture photo: $e')),
        );
        // Resume image stream if capture failed
        if (!controller.value.isStreamingImages) {
          await controller.startImageStream(_processCameraImage);
        }
      }
    }
  }

  Future<String> _compressSelfie(String originalPath) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final targetPath = '${tempDir.path}/selfie_${DateTime.now().millisecondsSinceEpoch}.jpg';

      final compressedFile = await FlutterImageCompress.compressAndGetFile(
        originalPath,
        targetPath,
        quality: 85,
        minWidth: 960,
        minHeight: 1280,
        format: CompressFormat.jpeg,
      );

      if (compressedFile != null && await File(compressedFile.path).exists()) {
        return compressedFile.path;
      }
    } catch (e) {
      debugPrint('[TripSelfieCamera] Image compression fallback: $e');
    }
    return originalPath;
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;

    // Case 1: Permission Denied State
    if (!_hasPermission) {
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.close, color: Colors.white),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: const Text('Camera Permission', style: TextStyle(color: Colors.white)),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.camera_alt_outlined,
                    color: Colors.white,
                    size: 40,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Camera Permission Required',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  _isPermissionPermanentlyDenied
                      ? 'Camera access was permanently denied. Please enable it in Settings to take your verification selfie.'
                      : 'HireD needs camera access to verify your identity and start your assigned trip.',
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 28),
                ElevatedButton.icon(
                  icon: const Icon(Icons.settings, size: 20),
                  label: Text(_isPermissionPermanentlyDenied ? 'Open Settings' : 'Allow Camera'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: themeColors.purpleAccent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    if (_isPermissionPermanentlyDenied) {
                      openAppSettings();
                    } else {
                      _checkPermissionAndInitCamera();
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Case 2: Camera Initializing State
    final controller = _cameraController;
    if (!_isCameraInitialized || controller == null || !controller.value.isInitialized) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Colors.white),
              SizedBox(height: 16),
              Text(
                'Initializing Camera...',
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ],
          ),
        ),
      );
    }

    // Case 3: Live Camera Preview with Face Oval Overlay
    final size = MediaQuery.of(context).size;
    var scale = size.aspectRatio * controller.value.aspectRatio;
    if (scale < 1) scale = 1 / scale;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Full-screen Camera Preview
          Transform.scale(
            scale: scale,
            child: Center(
              child: CameraPreview(controller),
            ),
          ),

          // 2. Dark Overlay with Oval Cutout & Instruction Pill
          // (Widget order strictly in front of camera preview)
          FaceGuideOverlay(
            isValidFace: _isValidFace,
            instruction: _scanInstruction,
            defaultBorderColor: themeColors.purpleAccent,
          ),

          // 3. Top Header Bar: Close Button, Title, Flash Indicator
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CircleAvatar(
                  backgroundColor: Colors.black54,
                  child: IconButton(
                    icon: const Icon(Icons.close, color: Colors.white, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'Trip-Start Selfie Verification',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 40), // Balance header
              ],
            ),
          ),

          // 4. Bottom Controls: Manual Capture Button & Auto-Capture Indicator
          Positioned(
            bottom: 30,
            left: 0,
            right: 0,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_isCapturing) ...[
                  const CircularProgressIndicator(color: Colors.white),
                  const SizedBox(height: 12),
                  const Text(
                    'Processing photo...',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ] else ...[
                  // Shutter Button (Manual Capture option)
                  GestureDetector(
                    onTap: _captureAndReturnPhoto,
                    child: Container(
                      width: 76,
                      height: 76,
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: _isValidFace ? const Color(0xFF10B981) : Colors.white,
                          width: 4,
                        ),
                      ),
                      child: Container(
                        decoration: BoxDecoration(
                          color: _isValidFace ? const Color(0xFF10B981) : Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.camera_alt,
                          color: _isValidFace ? Colors.white : Colors.black87,
                          size: 32,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _isValidFace ? 'Auto-capturing or tap to snap' : 'Tap to capture manually',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
