import 'package:flutter/material.dart';

enum DocumentStatus {
  notUploaded,
  partiallyUploaded,
  pendingVerification,
  approved,
  rejected,
}

class DriverDocumentSide {
  final String sideName; // 'Front Side', 'Back Side', or 'Certificate'
  final String? localFilePath;
  final String? originalFileName;
  final String? mimeType;
  final int? sizeBytes;
  final DateTime? uploadedAt;

  const DriverDocumentSide({
    required this.sideName,
    this.localFilePath,
    this.originalFileName,
    this.mimeType,
    this.sizeBytes,
    this.uploadedAt,
  });

  bool get isUploaded =>
      (localFilePath != null && localFilePath!.isNotEmpty) ||
      (originalFileName != null && originalFileName!.isNotEmpty);

  DriverDocumentSide copyWith({
    String? sideName,
    String? localFilePath,
    String? originalFileName,
    String? mimeType,
    int? sizeBytes,
    DateTime? uploadedAt,
  }) {
    return DriverDocumentSide(
      sideName: sideName ?? this.sideName,
      localFilePath: localFilePath ?? this.localFilePath,
      originalFileName: originalFileName ?? this.originalFileName,
      mimeType: mimeType ?? this.mimeType,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      uploadedAt: uploadedAt ?? this.uploadedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sideName': sideName,
      'localFilePath': localFilePath,
      'originalFileName': originalFileName,
      'mimeType': mimeType,
      'sizeBytes': sizeBytes,
      'uploadedAt': uploadedAt?.toIso8601String(),
    };
  }

  factory DriverDocumentSide.fromJson(Map<String, dynamic> json) {
    return DriverDocumentSide(
      sideName: json['sideName'] as String? ?? 'Document',
      localFilePath: json['localFilePath'] as String?,
      originalFileName: json['originalFileName'] as String?,
      mimeType: json['mimeType'] as String?,
      sizeBytes: json['sizeBytes'] as int?,
      uploadedAt: json['uploadedAt'] != null
          ? DateTime.tryParse(json['uploadedAt'] as String)
          : null,
    );
  }
}

class DriverDocumentModel {
  final int? documentId;
  final String documentType; // 'DRIVING_LICENCE', 'AADHAAR', 'PAN', 'PCC'
  final String title;
  final String subtitle;
  final IconData icon;
  final bool hasTwoSides;
  final DriverDocumentSide frontSide;
  final DriverDocumentSide? backSide;
  final DocumentStatus status;
  final String? rejectionReason;

  const DriverDocumentModel({
    this.documentId,
    required this.documentType,
    required this.title,
    required this.subtitle,
    required this.icon,
    this.hasTwoSides = true,
    required this.frontSide,
    this.backSide,
    this.status = DocumentStatus.notUploaded,
    this.rejectionReason,
  });

  bool get isUploaded {
    if (hasTwoSides) {
      return frontSide.isUploaded && (backSide?.isUploaded ?? false);
    }
    return frontSide.isUploaded;
  }

  bool get isPartiallyUploaded {
    if (!hasTwoSides) return false;
    final f = frontSide.isUploaded;
    final b = backSide?.isUploaded ?? false;
    return (f || b) && !(f && b);
  }

  int get uploadedSidesCount {
    int count = 0;
    if (frontSide.isUploaded) count++;
    if (hasTwoSides && (backSide?.isUploaded ?? false)) count++;
    return count;
  }

  int get totalSidesCount => hasTwoSides ? 2 : 1;

  bool get isApproved => status == DocumentStatus.approved;
  bool get isPendingVerification => status == DocumentStatus.pendingVerification;
  bool get isRejected => status == DocumentStatus.rejected;

  String get statusLabel {
    if (status == DocumentStatus.approved) return 'Verified';
    if (status == DocumentStatus.rejected) return 'Needs Re-upload';
    if (status == DocumentStatus.pendingVerification || isUploaded) return 'Pending Verification';
    if (isPartiallyUploaded) return '1/2 Uploaded';
    return 'Upload Required';
  }

  Color getStatusColor(bool isDark) {
    if (status == DocumentStatus.approved) {
      return isDark ? const Color(0xFF34D399) : const Color(0xFF059669);
    }
    if (status == DocumentStatus.rejected) {
      return isDark ? const Color(0xFFF87171) : const Color(0xFFDC2626);
    }
    if (status == DocumentStatus.pendingVerification || isUploaded) {
      return isDark ? const Color(0xFFFBBF24) : const Color(0xFFD97706);
    }
    if (isPartiallyUploaded) {
      return isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB);
    }
    return isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
  }

  DriverDocumentModel copyWith({
    int? documentId,
    String? documentType,
    String? title,
    String? subtitle,
    IconData? icon,
    bool? hasTwoSides,
    DriverDocumentSide? frontSide,
    DriverDocumentSide? backSide,
    DocumentStatus? status,
    String? rejectionReason,
  }) {
    return DriverDocumentModel(
      documentId: documentId ?? this.documentId,
      documentType: documentType ?? this.documentType,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      icon: icon ?? this.icon,
      hasTwoSides: hasTwoSides ?? this.hasTwoSides,
      frontSide: frontSide ?? this.frontSide,
      backSide: backSide ?? this.backSide,
      status: status ?? this.status,
      rejectionReason: rejectionReason ?? this.rejectionReason,
    );
  }

  static List<DriverDocumentModel> initialDocuments() {
    return const [
      DriverDocumentModel(
        documentType: 'DRIVING_LICENCE',
        title: 'Driving Licence (DL)',
        subtitle: 'Commercial or Transport LMV Licence',
        icon: Icons.badge_rounded,
        hasTwoSides: true,
        frontSide: DriverDocumentSide(sideName: 'Front Side'),
        backSide: DriverDocumentSide(sideName: 'Back Side'),
      ),
      DriverDocumentModel(
        documentType: 'AADHAAR',
        title: 'Aadhaar Card',
        subtitle: 'Government issued photo ID',
        icon: Icons.credit_card_rounded,
        hasTwoSides: true,
        frontSide: DriverDocumentSide(sideName: 'Front Side'),
        backSide: DriverDocumentSide(sideName: 'Back Side'),
      ),
      DriverDocumentModel(
        documentType: 'PAN',
        title: 'PAN Card',
        subtitle: 'Income Tax Permanent Account Number (Front Side)',
        icon: Icons.account_balance_wallet_rounded,
        hasTwoSides: false,
        frontSide: DriverDocumentSide(sideName: 'Front Side'),
        backSide: null,
      ),
      DriverDocumentModel(
        documentType: 'PCC',
        title: 'Police Clearance Certificate',
        subtitle: 'Recent Police Clearance Certificate (Single Document)',
        icon: Icons.verified_user_rounded,
        hasTwoSides: false,
        frontSide: DriverDocumentSide(sideName: 'Certificate'),
        backSide: null,
      ),
    ];
  }

  static IconData iconForType(String type) {
    switch (type) {
      case 'DRIVING_LICENCE':
        return Icons.badge_rounded;
      case 'AADHAAR':
        return Icons.credit_card_rounded;
      case 'PAN':
        return Icons.account_balance_wallet_rounded;
      case 'PCC':
      default:
        return Icons.verified_user_rounded;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'documentId': documentId,
      'documentType': documentType,
      'title': title,
      'subtitle': subtitle,
      'hasTwoSides': hasTwoSides,
      'frontSide': frontSide.toJson(),
      'backSide': backSide?.toJson(),
      'status': status.name,
      'rejectionReason': rejectionReason,
    };
  }

  factory DriverDocumentModel.fromJson(Map<String, dynamic> json) {
    final type = json['documentType'] as String? ?? 'DRIVING_LICENCE';
    return DriverDocumentModel(
      documentId: json['documentId'] as int?,
      documentType: type,
      title: json['title'] as String? ?? 'Document',
      subtitle: json['subtitle'] as String? ?? '',
      icon: iconForType(type),
      hasTwoSides: json['hasTwoSides'] as bool? ?? true,
      frontSide: DriverDocumentSide.fromJson(
        json['frontSide'] as Map<String, dynamic>? ?? {'sideName': 'Front Side'},
      ),
      backSide: json['backSide'] != null
          ? DriverDocumentSide.fromJson(json['backSide'] as Map<String, dynamic>)
          : null,
      status: DocumentStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => DocumentStatus.notUploaded,
      ),
      rejectionReason: json['rejectionReason'] as String?,
    );
  }
}
