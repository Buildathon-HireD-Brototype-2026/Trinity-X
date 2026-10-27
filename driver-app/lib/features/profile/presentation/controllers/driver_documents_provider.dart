import 'dart:convert';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/errors/error_messages.dart';
import '../../../../core/routing/route_names.dart';
import '../../../../core/storage/local_cache_service.dart';
import '../../domain/driver_document_model.dart';

import 'package:dio/dio.dart';
import '../../../../core/network/auth_interceptor.dart';
import '../../../auth/presentation/controllers/driver_profile_controller.dart';

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
  final Dio? _dio;
  final Ref? _ref;
  final ImagePicker _imagePicker = ImagePicker();

  DriverDocumentsNotifier(this._prefs, {this._dio, this._ref})
      : super(DriverDocumentsState(documents: _loadInitialDocuments(_prefs))) {
    // Check for lost camera capture data on initialization if activity was recreated
    _recoverLostCameraData();
    // Fetch live status from backend database
    fetchDocumentsFromBackend();
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

  /// Synchronize real document status and records from PostgreSQL backend
  Future<void> fetchDocumentsFromBackend() async {
    final dio = _dio;
    if (dio == null) return;
    try {
      // 1. Fetch driver profile to determine real database status (PENDING or ACTIVE)
      final profileRes = await dio.get('/driver/profile');
      final profileData = profileRes.data['data'] as Map<String, dynamic>?;
      final driverStatus = (profileData?['status'] as String? ?? 'PENDING').toUpperCase();
      final isDriverActive = driverStatus == 'ACTIVE';

      // 2. Fetch driver document history
      final docsRes = await dio.get('/driver/documents');
      final docsList = docsRes.data['data'] as List<dynamic>?;

      if (docsList != null) {
        final Map<String, dynamic> backendDocsMap = {};
        for (final item in docsList) {
          if (item is Map<String, dynamic>) {
            final type = item['document_type'] as String?;
            if (type != null) {
              backendDocsMap[type] = item;
            }
          }
        }

        final updated = state.documents.map((doc) {
          final backendItem = backendDocsMap[doc.documentType];
          if (backendItem != null) {
            final fileName = backendItem['original_file_name'] as String? ?? 'Uploaded Document';
            final size = backendItem['size_bytes'] as int? ?? 10240;
            final uploadedAt = backendItem['uploaded_at'] != null
                ? DateTime.tryParse(backendItem['uploaded_at'] as String)
                : DateTime.now();

            final front = doc.frontSide.copyWith(
              originalFileName: doc.frontSide.originalFileName ?? fileName,
              sizeBytes: doc.frontSide.sizeBytes ?? size,
              uploadedAt: doc.frontSide.uploadedAt ?? uploadedAt,
            );

            final back = doc.hasTwoSides
                ? (doc.backSide?.copyWith(
                    originalFileName: doc.backSide?.originalFileName ?? fileName,
                    sizeBytes: doc.backSide?.sizeBytes ?? size,
                    uploadedAt: doc.backSide?.uploadedAt ?? uploadedAt,
                  ))
                : null;

            // Only mark as approved if driver is ACTIVE in database; otherwise PENDING verification
            final status = isDriverActive
                ? DocumentStatus.approved
                : DocumentStatus.pendingVerification;

            return doc.copyWith(
              documentId: backendItem['document_id'] as int?,
              frontSide: front,
              backSide: back,
              status: status,
            );
          }
          return doc;
        }).toList();

        state = state.copyWith(documents: updated);
        await _persistDocuments(updated);
      }
    } catch (_) {
      // Offline fallback
    }
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
      return ErrorMessages.fileUploadFailed;
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
        return ErrorMessages.fileUploadFailed;
      }

      return await _processPickedFile(
        documentType: documentType,
        isFrontSide: isFrontSide,
        filePath: pickedFile.path!,
        fileName: pickedFile.name,
      );
    } catch (e) {
      return ErrorMessages.fileUploadFailed;
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
      return ErrorMessages.fileUploadFailed;
    }

    final fileSize = await file.length();
    if (fileSize > maxFileSizeBytes) {
      return ErrorMessages.validationFile;
    }

    final extension = fileName.split('.').last.toLowerCase();
    if (!allowedExtensions.contains(extension)) {
      return ErrorMessages.validationFile;
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

    // Upload real document to backend API if dio is available
    final dio = _dio;
    if (dio != null) {
      try {
        final formData = FormData.fromMap({
          'file': await MultipartFile.fromFile(filePath, filename: fileName),
          'document_type': documentType,
        });
        await dio.post('/driver/documents', data: formData);
        _ref?.read(driverProfileProvider.notifier).refresh();
      } catch (_) {
        // Saved locally for offline preview
      }
    }

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

        // CRITICAL: Newly uploaded documents are ALWAYS Pending Verification (NEVER auto-verified)
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
  Dio? dio;
  try {
    dio = ref.watch(dioProvider);
  } catch (_) {}
  return DriverDocumentsNotifier(prefs, dio: dio, ref: ref);
});
