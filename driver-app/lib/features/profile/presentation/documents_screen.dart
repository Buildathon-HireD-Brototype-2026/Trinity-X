import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../core/routing/route_names.dart';
import '../../../core/storage/local_cache_service.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/widgets/app_error_view.dart';
import 'controllers/driver_documents_provider.dart';
import '../domain/driver_document_model.dart';

class DocumentsScreen extends ConsumerStatefulWidget {
  const DocumentsScreen({super.key});

  @override
  ConsumerState<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends ConsumerState<DocumentsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sharedPreferencesProvider).setString('active_route', RouteNames.documents);
    });
  }

  @override
  void dispose() {
    final prefs = ref.read(sharedPreferencesProvider);
    if (prefs.getString('pending_upload_doc_type') == null) {
      prefs.remove('active_route');
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = context.appColors;
    final docsState = ref.watch(driverDocumentsProvider);

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) {
          ref.read(sharedPreferencesProvider).remove('active_route');
        }
      },
      child: Scaffold(
        backgroundColor: themeColors.pageBackground,
        appBar: AppBar(
          backgroundColor: themeColors.cardBackground,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: IconButton(
            icon: Icon(Icons.arrow_back_ios_new_rounded, color: themeColors.textPrimary, size: 20),
            onPressed: () {
              ref.read(sharedPreferencesProvider).remove('active_route');
              context.pop();
            },
          ),
          title: Text(
            'My Documents',
            style: TextStyle(
              color: themeColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
          centerTitle: true,
        ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Verification Progress Summary Card
              _buildProgressCard(context, docsState),
              const SizedBox(height: 18),

              // Section Header
              Text(
                'MANDATORY KYC DOCUMENTS (4)',
                style: TextStyle(
                  color: themeColors.textSecondary,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 12),

              // Document Cards List
              ...docsState.documents.map(
                (doc) => Padding(
                  padding: const EdgeInsets.only(bottom: 16.0),
                  child: _buildDocumentCard(context, ref, doc, docsState),
                ),
              ),

              const SizedBox(height: 10),

              // Corporate Compliance Note
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: themeColors.innerBox,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: themeColors.border),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.shield_outlined,
                      color: themeColors.purpleAccent,
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Front and back sides are required for DL and Aadhaar. Single front photo for PAN Card, and single document for PCC. Formats: JPG, PNG, PDF (Max 5 MB).',
                        style: TextStyle(
                          color: themeColors.textSecondary,
                          fontSize: 12,
                          height: 1.45,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    ),
  );
}

  /// Top Progress Overview Card
  Widget _buildProgressCard(BuildContext context, DriverDocumentsState docsState) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final uploadedDocs = docsState.uploadedCount;
    final totalDocs = docsState.totalCount;
    final uploadedSides = docsState.uploadedSidesCount;
    final totalSides = docsState.totalSidesCount;
    final progress = totalSides > 0 ? (uploadedSides / totalSides) : 0.0;
    final isComplete = docsState.isAllUploaded;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: themeColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.05),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isComplete
                      ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5))
                      : themeColors.purpleTint,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  isComplete ? Icons.verified_rounded : Icons.folder_shared_rounded,
                  color: isComplete
                      ? (isDark ? const Color(0xFF34D399) : const Color(0xFF059669))
                      : themeColors.purpleAccent,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isComplete ? 'All Documents Submitted' : 'KYC Verification Progress',
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '$uploadedDocs of $totalDocs Documents Complete ($uploadedSides/$totalSides Sides)',
                      style: TextStyle(
                        color: themeColors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: isComplete
                      ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5))
                      : (isDark ? const Color(0xFF451A03) : const Color(0xFFFEF3C7)),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  isComplete ? 'READY' : '${(progress * 100).toInt()}%',
                  style: TextStyle(
                    color: isComplete
                        ? (isDark ? const Color(0xFF34D399) : const Color(0xFF059669))
                        : (isDark ? const Color(0xFFFBBF24) : const Color(0xFFD97706)),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Linear Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 7,
              backgroundColor: isDark ? const Color(0xFF242731) : const Color(0xFFF1F5F9),
              valueColor: AlwaysStoppedAnimation<Color>(
                isComplete ? const Color(0xFF10B981) : themeColors.purpleAccent,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Individual Document Card with Front and Back Sides
  Widget _buildDocumentCard(
    BuildContext context,
    WidgetRef ref,
    DriverDocumentModel doc,
    DriverDocumentsState state,
  ) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;

    return Container(
      decoration: BoxDecoration(
        color: themeColors.cardBackground,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: doc.isUploaded
              ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFA7F3D0))
              : themeColors.border,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Row: Icon, Title, Status Chip
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: themeColors.purpleTint,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(doc.icon, color: themeColors.purpleAccent, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      doc.title,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      doc.subtitle,
                      style: TextStyle(
                        color: themeColors.textSecondary,
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Status Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: doc.getStatusColor(isDark).withValues(alpha: isDark ? 0.2 : 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  doc.statusLabel,
                  style: TextStyle(
                    color: doc.getStatusColor(isDark),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Upload Slots: 2 Sides (DL, Aadhaar, PAN) vs 1 Certificate (PCC)
          if (doc.hasTwoSides) ...[
            Row(
              children: [
                // Front Side Slot
                Expanded(
                  child: _buildSideSlot(
                    context: context,
                    ref: ref,
                    doc: doc,
                    side: doc.frontSide,
                    isFrontSide: true,
                    uploadKey: '${doc.documentType}_FRONT',
                    state: state,
                  ),
                ),
                const SizedBox(width: 12),

                // Back Side Slot
                Expanded(
                  child: _buildSideSlot(
                    context: context,
                    ref: ref,
                    doc: doc,
                    side: doc.backSide!,
                    isFrontSide: false,
                    uploadKey: '${doc.documentType}_BACK',
                    state: state,
                  ),
                ),
              ],
            ),
          ] else ...[
            // Single Document Slot (PCC)
            _buildSideSlot(
              context: context,
              ref: ref,
              doc: doc,
              side: doc.frontSide,
              isFrontSide: true,
              uploadKey: '${doc.documentType}_FRONT',
              state: state,
              isFullWidth: true,
            ),
          ],
        ],
      ),
    );
  }

  /// Individual Side Slot (Front Side / Back Side / Certificate)
  Widget _buildSideSlot({
    required BuildContext context,
    required WidgetRef ref,
    required DriverDocumentModel doc,
    required DriverDocumentSide side,
    required bool isFrontSide,
    required String uploadKey,
    required DriverDocumentsState state,
    bool isFullWidth = false,
  }) {
    final themeColors = context.appColors;
    final isDark = context.isDarkMode;
    final isUploadingThis = state.isUploading && state.activeUploadingKey == uploadKey;
    final isUploaded = side.isUploaded;

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: themeColors.innerBox,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isUploaded
              ? (isDark ? const Color(0xFF065F46) : const Color(0xFF6EE7B7))
              : themeColors.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Slot Header Row: Side Name & Status Indicator
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                side.sideName.toUpperCase(),
                style: TextStyle(
                  color: isUploaded ? themeColors.textPrimary : themeColors.textSecondary,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.3,
                ),
              ),
              if (isUploaded)
                const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 14)
              else
                Icon(Icons.circle_outlined, color: themeColors.textSecondary.withValues(alpha: 0.5), size: 13),
            ],
          ),
          const SizedBox(height: 8),

          // Uploaded State with Thumbnail vs Empty Upload Box
          if (isUploaded) ...[
            InkWell(
              onTap: () => _showSidePreview(context, doc, side),
              borderRadius: BorderRadius.circular(10),
              child: Container(
                height: isFullWidth ? 70 : 80,
                decoration: BoxDecoration(
                  color: themeColors.cardBackground,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: themeColors.border),
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 8),
                    _buildSideThumbnail(side),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            side.originalFileName ?? 'Uploaded',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: themeColors.textPrimary,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            side.sizeBytes != null
                                ? '${(side.sizeBytes! / 1024).toStringAsFixed(0)} KB'
                                : 'Stored',
                            style: TextStyle(
                              color: themeColors.textSecondary,
                              fontSize: 10.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.edit_outlined, color: themeColors.purpleAccent, size: 17),
                      tooltip: 'Change Photo',
                      onPressed: () => _showSidePickerSheet(context, ref, doc, isFrontSide, side.sideName),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: isUploadingThis
                    ? null
                    : () => _showSidePickerSheet(context, ref, doc, isFrontSide, side.sideName),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  height: isFullWidth ? 54 : 80,
                  decoration: BoxDecoration(
                    color: themeColors.purpleTint.withValues(alpha: isDark ? 0.4 : 0.7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: themeColors.purpleAccent.withValues(alpha: 0.35),
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: Center(
                    child: isUploadingThis
                        ? SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: themeColors.purpleAccent,
                            ),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                doc.documentType == 'PCC' ? Icons.upload_file_rounded : Icons.camera_alt_outlined,
                                color: themeColors.purpleAccent,
                                size: 20,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                isFullWidth
                                    ? (doc.documentType == 'PAN'
                                        ? 'Upload PAN Card (Front)'
                                        : 'Upload Certificate (PDF / Photo)')
                                    : '+ ${side.sideName}',
                                style: TextStyle(
                                  color: themeColors.purpleAccent,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSideThumbnail(DriverDocumentSide side) {
    final isPdf = side.mimeType == 'application/pdf' || (side.originalFileName?.endsWith('.pdf') ?? false);

    if (isPdf) {
      return Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: const Color(0xFFFEE2E2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFFDC2626), size: 20),
      );
    }

    if (side.localFilePath != null) {
      final file = File(side.localFilePath!);
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.file(
          file,
          width: 36,
          height: 36,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            width: 36,
            height: 36,
            color: const Color(0xFFE2E8F0),
            child: const Icon(Icons.description, size: 18),
          ),
        ),
      );
    }

    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: const Color(0xFFE0E7FF),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(Icons.image_outlined, color: Color(0xFF4338CA), size: 18),
    );
  }

  /// Bottom Modal for choosing Camera vs Gallery for a specific side
  void _showSidePickerSheet(
    BuildContext context,
    WidgetRef ref,
    DriverDocumentModel doc,
    bool isFrontSide,
    String sideName,
  ) {
    final themeColors = context.appColors;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return Container(
          decoration: BoxDecoration(
            color: themeColors.cardBackground,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border.all(color: themeColors.border),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: themeColors.divider,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  '${doc.title} — $sideName',
                  style: TextStyle(
                    color: themeColors.textPrimary,
                    fontSize: 16.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Take a clear photo or select from files (Max 5 MB • JPG, PNG, PDF)',
                  style: TextStyle(
                    color: themeColors.textSecondary,
                    fontSize: 12.5,
                  ),
                ),
                const SizedBox(height: 18),

                // 1. Camera Option
                _buildPickerOption(
                  context: sheetContext,
                  icon: Icons.camera_alt_rounded,
                  title: 'Take Photo with Camera',
                  subtitle: 'Capture physical $sideName of your card',
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    final error = await ref
                        .read(driverDocumentsProvider.notifier)
                        .pickFromCamera(
                          documentType: doc.documentType,
                          isFrontSide: isFrontSide,
                        );

                    if (context.mounted && error != null) {
                      _handlePickerError(context, error);
                    }
                  },
                ),
                const SizedBox(height: 12),

                // 2. Files / Gallery Option
                _buildPickerOption(
                  context: sheetContext,
                  icon: Icons.folder_open_rounded,
                  title: 'Choose from Files or Gallery',
                  subtitle: 'Select saved image or PDF document',
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    final error = await ref
                        .read(driverDocumentsProvider.notifier)
                        .pickFromGalleryOrFiles(
                          documentType: doc.documentType,
                          isFrontSide: isFrontSide,
                        );

                    if (context.mounted && error != null) {
                      _handlePickerError(context, error);
                    }
                  },
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPickerOption({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    final themeColors = context.appColors;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: themeColors.innerBox,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: themeColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: themeColors.purpleTint,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: themeColors.purpleAccent, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: themeColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: themeColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: themeColors.textSecondary, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  void _handlePickerError(BuildContext context, String error) {
    if (error == 'CAMERA_PERMISSION_PERMANENTLY_DENIED') {
      _showPermissionDeniedDialog(context);
      return;
    }

    AppSnackBar.show(context, error);
  }

  void _showPermissionDeniedDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Camera Permission Required'),
        content: const Text(
          'HireD Driver App requires camera access to capture your physical KYC documents. Please enable camera permission in App Settings.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  /// High-resolution Document Preview Dialog
  void _showSidePreview(BuildContext context, DriverDocumentModel doc, DriverDocumentSide side) {
    final themeColors = context.appColors;
    final isPdf = side.mimeType == 'application/pdf' || (side.originalFileName?.endsWith('.pdf') ?? false);

    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.75),
      builder: (dialogContext) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            decoration: BoxDecoration(
              color: themeColors.cardBackground,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: themeColors.border),
            ),
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        '${doc.title} — ${side.sideName}',
                        style: TextStyle(
                          color: themeColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close_rounded, color: themeColors.textPrimary),
                      onPressed: () => Navigator.of(dialogContext).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Preview Content
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: isPdf
                      ? Container(
                          height: 220,
                          color: themeColors.innerBox,
                          alignment: Alignment.center,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFFDC2626), size: 48),
                              const SizedBox(height: 10),
                              Text(
                                side.originalFileName ?? 'PDF Document',
                                style: TextStyle(
                                  color: themeColors.textPrimary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'PDF Document verified',
                                style: TextStyle(color: themeColors.textSecondary, fontSize: 11),
                              ),
                            ],
                          ),
                        )
                      : (side.localFilePath != null
                          ? InteractiveViewer(
                              child: Image.file(
                                File(side.localFilePath!),
                                height: 260,
                                fit: BoxFit.contain,
                              ),
                            )
                          : const SizedBox.shrink()),
                ),
                const SizedBox(height: 16),

                // File Info
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      side.originalFileName ?? '',
                      style: TextStyle(color: themeColors.textSecondary, fontSize: 12),
                    ),
                    Text(
                      side.sizeBytes != null ? '${(side.sizeBytes! / 1024).toStringAsFixed(0)} KB' : '',
                      style: TextStyle(color: themeColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
