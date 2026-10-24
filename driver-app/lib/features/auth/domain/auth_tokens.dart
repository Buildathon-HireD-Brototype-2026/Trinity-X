class AuthTokens {
  final String accessToken;
  final String refreshToken;
  final int expiresIn;

  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    this.expiresIn = 3600,
  });

  Map<String, dynamic> toJson() => {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'expiresIn': expiresIn,
      };

  factory AuthTokens.fromJson(Map<String, dynamic> json) => AuthTokens(
        accessToken: json['accessToken'] as String? ?? json['token'] as String? ?? '',
        refreshToken: json['refreshToken'] as String? ?? '',
        expiresIn: json['expiresIn'] as int? ?? 3600,
      );
}
