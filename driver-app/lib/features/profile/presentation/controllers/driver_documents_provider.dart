import 'dart:convert';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/routing/route_names.dart';
import '../../../../core/storage/local_cache_service.dart';
import '../../domain/driver_document_model.dart';

class DriverDocumentsState {
  final List<DriverDocumentModel> documents;
  final bool isUploading;
  final String? activeUploadingKey; // e.g. 'DRIVING_LICENCE_FRONT' or 'DRIVING_LICENCE_BACK'
  final String? errorMessage;

  const DriverDocumentsState({
    required this.documents,
    this.isUploading = false,
    this.activeUploadingKey,
    this.errorMessage,
  });

  int get uploadedCount =>
      documents.where((d) => d.isUploaded).length;

  int get totalCount => documents.length;

  int get uploadedSidesCount =>
      documents.fold(0, (sum, d) => sum + d.uploadedSidesCount);

  int get totalSidesCount =>
      documents.fold(0, (sum, d) => sum + d.totalSidesCount);

  int get verifiedCount =>
      documents.where((d) => d.isApproved).length;

  bool get isAllUploaded => documents.every((d) => d.isUploaded);

  DriverDocumentsState copyWith({
    List<DriverDocumentModel>? documents,
    bool? isUploading,
    String? activeUploadingKey,
    String? errorMessage,
  }) {
    return DriverDocumentsState(
      documents: documents ?? this.documents,
      isUploading: isUploading ?? this.isUploading,
      activeUploadingKey: activeUploadingKey ?? this.activeUploadingKey,
      errorMessage: errorMessage,
    );
  }
}

class DriverDocumentsNotifier extends StateNotifier<DriverDocumentsState> {
  final SharedPreferences _prefs;
  final ImagePicker _imagePicker = ImagePicker();

  DriverDocumentsNotifier(this._prefs)
      : super(DriverDocumentsState(documents: _loadInitialDocuments(_prefs))) {
    // Check for lost camera capture data on initialization if activity was recreated
    _recoverLostCameraData();
  }

  /// Maximum file size: 5 MB (5,242,880 bytes) per PRD D-02 & Technical Guidelines 14
  static const int maxFileSizeBytes = 5 * 1024 * 1024;

  /// Allowed MIME types: image/jpeg, image/png, application/pdf
  static const List<String> allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];

  static List<DriverDocumentModel> _loadInitialDocuments(SharedPreferences prefs) {
    final raw = prefs.getString('cached_driver_documents');
    if (raw != null) {
      try {
        final decoded = jsonDecode(raw) as List<dynamic>;
        return decoded
            .map((item) => DriverDocumentModel.fromJson(item as Map<String, dynamic>))
            .toList();
      } catch (_) {}
    }
    return DriverDocumentModel.initialDocuments();
  }

  Future<void> _persistDocuments(List<DriverDocumentModel> docs) async {
    try {
      final list = docs.map((d) => d.toJson()).toList();
      await _prefs.setString('cached_driver_documents', jsonEncode(list));
    } catch (_) {}
  }

  Future<void> _recoverLostCameraData() async {
    try {
      final LostDataResponse response = await _imagePicker.retrieveLostData();
      if (response.isEmpty) return;

      final file = response.file;
      if (file != null) {
        final pendingDocType = _prefs.getString('pending_upload_doc_type');
        final pendingIsFront = _prefs.getBool('pending_upload_is_front') ?? true;
        if (pendingDocType != null) {
          await _processPickedFile(
            documentType: pendingDocType,
            isFrontSide: pendingIsFront,
            filePath: file.path,
            fileName: file.name,
          );
        }
      }
    } catch (_) {
      // Ignore recovery error
    } finally {
      await _prefs.remove('pending_upload_doc_type');
      await _prefs.remove('pending_upload_is_front');
    }
  }

  /// Pick document side via Camera
  Future<String?> pickFromCamera({
    required String documentType,
    required bool isFrontSide,
  }) async {
    // Record pending target and ensure active route before opening camera
    await _prefs.setString('pending_upload_doc_type', documentType);
    await _prefs.setBool('pending_upload_is_front', isFrontSide);
    await _prefs.setString('active_route', RouteNames.documents);

    // Attempt permission request if available
    try {
      final status = await Permission.camera.status;
      if (!status.isGranted && !status.isPermanentlyDenied) {
        await Permission.camera.request();
      }
    } catch (_) {
      // Manifest pending rebuild, continue directly to intent
    }

    try {
      final XFile? photo = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );

      if (photo == null) {
        await _prefs.remove('pending_upload_doc_type');
        await _prefs.remove('pending_upload_is_front');
        return null; // Cancelled
      }

      final error = await _processPickedFile(
        documentType: documentType,
        isFrontSide: isFrontSide,
        filePath: photo.path,
        fileName: photo.name,
      );

      await _prefs.remove('pending_upload_doc_type');
      await _prefs.remove('pending_upload_is_front');
      return error;
    } catch (e) {
      await _prefs.remove('pending_upload_doc_type');
      await _prefs.remove('pending_upload_is_front');
      final errStr = e.toString().toLowerCase();
      if (errStr.contains('permission') || errStr.contains('access_denied')) {
        return 'CAMERA_PERMISSION_PERMANENTLY_DENIED';
      }
      return 'Failed to capture photo: ${e.toString()}';
    }
  }

  /// Pick document side via Gallery or Files
  Future<String?> pickFromGalleryOrFiles({
    required String documentType,
    required bool isFrontSide,
  }) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: allowedExtensions,
        allowMultiple: false,
      );

      if (result == null || result.files.isEmpty) return null; // Cancelled

      final pickedFile = result.files.first;
      if (pickedFile.path == null) {
        return 'Selected file path is unavailable.';
      }

      return await _processPickedFile(
        documentType: documentType,
        isFrontSide: isFrontSide,
        filePath: pickedFile.path!,
        fileName: pickedFile.name,
      );
    } catch (e) {
      return 'Failed to select document: ${e.toString()}';
    }
  }

  Future<String?> _processPickedFile({
    required String documentType,
    required bool isFrontSide,
    required String filePath,
    required String fileName,
  }) async {
    final file = File(filePath);
    if (!await file.exists()) {
      return 'File does not exist on device.';
    }

    final fileSize = await file.length();
    if (fileSize > maxFileSizeBytes) {
      return 'File is too large (${(fileSize / (1024 * 1024)).toStringAsFixed(1)} MB). Maximum allowed size is 5 MB.';
    }

    final extension = fileName.split('.').last.toLowerCase();
    if (!allowedExtensions.contains(extension)) {
      return 'Unsupported format .$extension. Allowed formats: JPG, PNG, PDF.';
    }

    final String mimeType = extension == 'pdf'
        ? 'application/pdf'
        : (extension == 'png' ? 'image/png' : 'image/jpeg');

    final uploadKey = '${documentType}_${isFrontSide ? 'FRONT' : 'BACK'}';

    state = state.copyWith(
      isUploading: true,
      activeUploadingKey: uploadKey,
      errorMessage: null,
    );

    // Short UX simulated delay for preview feedback
    await Future.delayed(const Duration(milliseconds: 400));

    final updatedDocs = state.documents.map((doc) {
      if (doc.documentType == documentType) {
        final newSide = DriverDocumentSide(
          sideName: isFrontSide ? 'Front Side' : (doc.hasTwoSides ? 'Back Side' : 'Certificate'),
          localFilePath: filePath,
          originalFileName: fileName,
          mimeType: mimeType,
          sizeBytes: fileSize,
          uploadedAt: DateTime.now(),
        );

        final newFront = isFrontSide ? newSide : doc.frontSide;
        final newBack = isFrontSide ? doc.backSide : newSide;

        final isFullyDone = doc.hasTwoSides
            ? (newFront.isUploaded && (newBack?.isUploaded ?? false))
            : newFront.isUploaded;

        final newStatus = isFullyDone
            ? DocumentStatus.pendingVerification
            : DocumentStatus.partiallyUploaded;

        return doc.copyWith(
          frontSide: newFront,
          backSide: newBack,
          status: newStatus,
        );
      }
      return doc;
    }).toList();

    state = state.copyWith(
      documents: updatedDocs,
      isUploading: false,
      activeUploadingKey: null,
    );

    await _persistDocuments(updatedDocs);

    return null; // Success
  }

  void removeDocumentSide({
    required String documentType,
    required bool isFrontSide,
  }) {
    final updatedDocs = state.documents.map((doc) {
      if (doc.documentType == documentType) {
        final clearedSide = DriverDocumentSide(
          sideName: isFrontSide ? 'Front Side' : (doc.hasTwoSides ? 'Back Side' : 'Certificate'),
          localFilePath: null,
          originalFileName: null,
          mimeType: null,
          sizeBytes: null,
          uploadedAt: null,
        );

        final newFront = isFrontSide ? clearedSide : doc.frontSide;
        final newBack = isFrontSide ? doc.backSide : clearedSide;

        final anyUploaded = newFront.isUploaded || (newBack?.isUploaded ?? false);
        final newStatus = anyUploaded ? DocumentStatus.partiallyUploaded : DocumentStatus.notUploaded;

        return doc.copyWith(
          frontSide: newFront,
          backSide: newBack,
          status: newStatus,
        );
      }
      return doc;
    }).toList();

    state = state.copyWith(documents: updatedDocs);
    _persistDocuments(updatedDocs);
  }
}

final driverDocumentsProvider =
    StateNotifierProvider<DriverDocumentsNotifier, DriverDocumentsState>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return DriverDocumentsNotifier(prefs);
});
