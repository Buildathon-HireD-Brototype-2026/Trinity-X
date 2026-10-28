# HireD Driver Mobile Application

Official Flutter mobile application for **HireD** drivers (HireD Buildathon, Brototype 2026, Trinity X).

---

## 1. Overview
The Driver App serves onboarded drivers throughout their operational journey:
* Authentication & Secure Session Storage (`D-01`)
* Driver KYC Document Upload & Status (`D-02`, `D-11`)
* Real-time Duty Toggle & Advance Leave Calendar (`D-03`)
* Assigned Trips Queue & Details (`D-04`, `D-05`)
* Driver Selfie Identity Check & Trip Start (`D-06`, `D-07`)
* In-Trip Expense Logging (`D-08`)
* 6-digit OTP Trip Closure with Immediate Wallet Credit (`D-09`)
* Trip History (`D-10`)
* Driver Wallet Ledger & Balance (`D-12`)
* Driver Profile & Offline Data Caching (`D-12`)

---

## 2. Prerequisites
* **Flutter SDK:** 3.24+ / 3.47+ (Dart 3.5+)
* **Android SDK:** API Level 34 (Android 14) / Min SDK 21
* **Device / Emulator:** Android physical device or emulator (iOS capable)

---

## 3. Installation & Setup

1. **Navigate to the driver app directory:**
   ```bash
   cd driver-app
   ```

2. **Set up Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Configure `API_BASE_URL` in `.env` (default: `http://10.0.2.2:5000/api/v1` for Android emulator).

3. **Install Dependencies:**
   ```bash
   flutter pub get
   ```

---

## 4. Running the Application

* **Run in Debug mode:**
  ```bash
  flutter run
  ```

* **Run static code analysis:**
  ```bash
  flutter analyze
  ```

* **Run automated test suite:**
  ```bash
  flutter test
  ```

---

## 5. Folder Structure
```text
driver-app/
├── assets/
│   └── images/              # Official logo.png and logo.svg
├── lib/
│   ├── main.dart            # Application entrypoint & dependency initialization
│   ├── app.dart             # Root MaterialApp.router with brand theme
│   ├── core/
│   │   ├── config/          # Environment configuration (API_BASE_URL)
│   │   ├── theme/           # AppColors (#6E2894), typography, Material 3 theme
│   │   ├── network/         # Dio client, interceptors, error models
│   │   ├── storage/         # SecureStorageService, LocalCacheService
│   │   ├── routing/         # GoRouter, RouteNames
│   │   ├── widgets/         # Shared UI components (loaders, buttons)
│   │   └── utils/           # Formatters, input validators
│   └── features/
│       ├── auth/            # Splash, Login, Session handling
│       ├── onboarding/      # Document upload queue
│       ├── availability/    # Duty toggle, leave calendar
│       ├── trips/           # Trip list, details, selfie, start, OTP close
│       ├── expenses/        # In-trip expense logging
│       ├── wallet/          # Driver wallet ledger & balance
│       └── profile/         # Driver profile & settings
├── test/                    # Unit, widget, and mock repository tests
├── .env.example             # Environment template (API_BASE_URL only)
├── pubspec.yaml             # Approved packages and asset declarations
└── README.md
```

---

## 6. Assumed API Endpoints
All assumed REST endpoints follow the HireD technical guidelines and database design (`/api/v1/...` with JSON `snake_case` fields):

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/driver/login` | Login with `phone_no` and `password`. Returns JWT `access_token`, `refresh_token`, and driver data. |
| `POST` | `/api/v1/auth/refresh` | Refresh JWT access token. |
| `GET` | `/api/v1/driver/profile` | Fetch driver profile and status (`PENDING`, `ACTIVE`, `INACTIVE`). |
| `PATCH` | `/api/v1/driver/availability` | Toggle `is_online` status. |
| `GET` | `/api/v1/driver/leaves` | Fetch planned leave date ranges. |
| `POST` | `/api/v1/driver/leaves` | Add leave range (`start_date`, `end_date`). |
| `DELETE` | `/api/v1/driver/leaves/:leave_id` | Delete planned leave. |
| `GET` | `/api/v1/driver/documents` | Fetch uploaded documents with status. |
| `POST` | `/api/v1/driver/documents` | Multipart upload for DL, Aadhaar, PAN, PCC. |
| `GET` | `/api/v1/driver/trips` | Fetch assigned and ongoing trips for driver. |
| `GET` | `/api/v1/driver/trips/:trip_id` | Fetch full details for a trip. |
| `POST` | `/api/v1/driver/trips/:trip_id/start` | Start trip with required selfie file. Sets status to `ONGOING`. |
| `GET` | `/api/v1/driver/trips/:trip_id/expenses` | List expenses logged for this trip. |
| `POST` | `/api/v1/driver/trips/:trip_id/expenses` | Log an expense (`amount`, `description`). |
| `DELETE` | `/api/v1/driver/trips/:trip_id/expenses/:expense_id` | Delete an expense while trip is `ONGOING`. |
| `POST` | `/api/v1/driver/trips/:trip_id/close` | Close trip via 6-digit `otp`. Validates expenses confirmed; credits wallet. |
| `GET` | `/api/v1/driver/wallet` | Fetch driver wallet balance and transaction ledger. |
| `GET` | `/api/v1/driver/trips/history` | Fetch completed trip history. |

---

## 7. Maps & Navigation Architecture (Zero Google API Keys / Zero Billing)

The Driver App uses a completely free, open-source mapping stack requiring **zero Google API keys, zero Google cloud billing, and zero proprietary SDK dependencies**:

* **In-App Interactive Maps:** Powered by [`LiveMap`](file:///home/thinkpad/Documents/project/Trinity-X/driver-app/lib/core/widgets/live_map.dart) using [`flutter_map`](https://pub.dev/packages/flutter_map) + [`latlong2`](https://pub.dev/packages/latlong2) with standard OpenStreetMap raster tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`).
* **OpenStreetMap Tile Usage Policy:** Uses standard public OSM raster tiles with an identifying `userAgentPackageName: 'com.hired.driver_app'`. Suitable for demo, evaluation, and light use without cloud billing. Displays the required attribution: `"© OpenStreetMap contributors"`.
* **Single GPS Stream Architecture:** Managed centrally by [`driverLocationProvider`](file:///home/thinkpad/Documents/project/Trinity-X/driver-app/lib/core/location/driver_location_provider.dart) using `geolocator`. Both the UI map and the tracking service subscribe to the same hardware stream (high accuracy, 5m filter) to prevent provider contention and conserve battery.
* **Markers & Live Position:** Renders the driver's current location as a solid blue dot with a live GPS accuracy circle. Follows the driver automatically and pauses on user pan/drag, providing a floating "Recenter" button. Renders green pickup markers and red dropoff markers on assigned trips.
* **Map Tap & External Turn-by-Turn Navigation:**
  * Tapping anywhere on the map (`MapOptions.onTap`) opens Google Maps at the driver's current coordinates (`https://www.google.com/maps/search/?api=1&query=LAT,LNG`). Dragging and pinching do not trigger navigation.
  * Dedicated "Open in Google Maps" and "Navigate" buttons launch external navigation via [`MapsConfig`](file:///home/thinkpad/Documents/project/Trinity-X/driver-app/lib/core/config/maps_config.dart) and [`url_launcher`](https://pub.dev/packages/url_launcher) with `LaunchMode.externalApplication`.
* **Permissions Configured:**
  * Android: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `INTERNET`, and `<queries>` HTTPS intent.
  * iOS: `NSLocationWhenInUseUsageDescription` with clear explanation.
* **Offline & Error Resilience:** Tile loading failures are caught via `errorTileCallback` showing a "Map needs internet" notification; GPS disabled and permission denied states display actionable enable banners.
* **Zero Secrets & Credentials:** 0 Google Maps SDK, 0 `MAPS_API_KEY`, 0 `secrets.properties`, 0 `Secrets.xcconfig`, and 0 Google Directions, Places, Geocoding, or Street View APIs.


