# Page 2 & 3: Onboarding & KYC Document Management (`D-02`, `D-11`)

**Screens:** Page 2 – Onboarding Document Upload & Page 3 – My Documents  
**PRD Requirement IDs:** `D-02` (Priority: P0), `D-11` (Priority: P2), `A-09` (Priority: P0)  
**Current Status:** Completed, Tested & Running with Local Simulation & Persistence  

---

## 1. PRD Requirements & Objectives

* **PRD Scope (`D-02`):** Mandatory KYC upload: Driving Licence (DL), Aadhaar Card, PAN Card, Police Clearance Certificate (PCC) before driver verification and trip dispatch.
* **PRD Scope (`D-11`):** Document Update: Allows drivers to review submitted documents and re-upload/update expired documents (e.g. renewed DL).
* **PRD Scope (`A-09`):** Admin Verification: Admin reviews uploaded documents from the Admin Web Portal queue to mark driver `status = ACTIVE`.
* **Technical Constraints:**
  * Maximum file size: **5 MB** per document side.
  * Supported formats: **JPG, PNG, PDF**.
  * Multi-side document support: Two sides (Front & Back) for DL and Aadhaar; single front side for PAN Card; single certificate for PCC.

---

## 2. UI Design Specification (What IS in the App Now)

The KYC Documents screen is implemented in `Trinity-X/driver-app/lib/features/profile/presentation/documents_screen.dart`:

### A. Progress Header Card
* Card container with subtle border and elevation shadow.
* Overall Completion Counter: Displays `"0/4 Documents • 0/6 Sides"` up to `"4/4 Documents • 6/6 Sides"`.
* Visual animated linear progress bar reflecting overall KYC percentage.
* Status Pill: Amber `"Incomplete"` or Emerald Green `"All Uploaded"`.

### B. Document Cards List (Strict 4 Documents • 6 Sides)
1. **Driving Licence (DL):**
   * Two upload slots: `Front Side` and `Back Side`.
   * Displays upload timestamp and thumbnail preview upon capture.
2. **Aadhaar Card:**
   * Two upload slots: `Front Side` and `Back Side`.
   * Displays upload timestamp and thumbnail preview upon capture.
3. **PAN Card:**
   * Single upload slot: `Front Side` only.
4. **Police Clearance Certificate (PCC):**
   * Single upload slot: `Certificate` (PDF or Photo).

### C. Upload Action Sheet (Modal Bottom Sheet)
* Triggered when driver taps any upload slot.
* Options:
  * **Take Photo with Camera:** Opens native camera intent with automatic downscaling (1600x1600, quality 85).
  * **Choose from Files / Gallery:** Opens file picker filtered strictly to JPG, PNG, and PDF files.
* Validation: Files exceeding 5MB are automatically blocked with a friendly alert dialog.

### D. Full-Screen Zoomable Document Preview
* Tapping on any uploaded document card opens a dedicated zoomable preview dialog.
* Supports pinch-to-zoom and pan via `InteractiveViewer`.
* Displays metadata chips: File Format, File Size in KB/MB, and Upload Timestamp.
* Provides a `"Replace Document"` button to re-capture or update the document side.

---

## 3. Current State: UI with Local Simulation & Persistence

> [!NOTE]
> The document upload feature operates in **UI + Local Simulation mode**:
> - Real camera snapping and file picking from device storage.
> - Strict 5MB file size validation and format checks.
> - Document metadata and local image paths are persisted to `SharedPreferences` under `cached_driver_documents`.
> - State transitions to `Pending Verification` immediately upon local upload.

---

## 4. Testing & Verification

### A. Automated Unit & Widget Tests

Verified in `test/features/profile/documents_screen_test.dart`:

| Test ID | Test Scenario | Verification Mechanism | Status |
| :--- | :--- | :--- | :---: |
| **TC-P02-01** | Camera photo capture snaps photo and assigns to target front/back slot | Mocks camera capture; asserts side status updated | `[✓ Passed]` |
| **TC-P02-02** | File picker allows selecting JPG, PNG, and PDF documents | Tests file picker with allowed MIME types | `[✓ Passed]` |
| **TC-P02-03** | Max file size enforcement blocks files > 5MB with error dialog | Passes 6MB mock file; asserts error message | `[✓ Passed]` |
| **TC-P02-04** | Invalid file formats are rejected immediately | Selects unsupported file format; asserts validation rejection | `[✓ Passed]` |
| **TC-P02-05** | PAN displays 1 slot; PCC displays 1 slot; DL & Aadhaar display 2 slots | Asserts total upload slot count is exactly 6 | `[✓ Passed]` |
| **TC-P03-01** | Full-screen zoomable preview displays image and metadata chips | Taps uploaded card; asserts `InteractiveViewer` rendered | `[✓ Passed]` |
| **TC-P03-02** | Re-upload action allows updating an already uploaded document side | Triggers replace document; asserts new file path saved | `[✓ Passed]` |
| **TC-P03-03** | Profile and Home dashboard badge counters dynamically reflect upload progress | Asserts reactive listener updates badge across screens | `[✓ Passed]` |

### B. Manual Physical Device Testing (Android 15)

* **Device:** Physical Android 15 device (`10BDAY0Y1D000DT`).
* **Inspection Results:**
  1. Native camera intent launches smoothly and returns to the Documents screen with the captured photo intact (verified camera crash / activity recreation fix).
  2. PDF documents display a clean document badge with format tag and file size.
  3. Killing the app from Android Recent Apps and reopening preserves all uploaded document photos and side statuses.

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Native Camera Intent Exiting to Home Screen
* **Symptom:** When the driver tapped "Take Photo with Camera", snapped a photo, and tapped "OK" in the system camera app, the app returned to the **Home dashboard** instead of staying on the Documents page.
* **Root Cause Identified:**
  1. `AndroidManifest.xml` had `android:taskAffinity=""` on `MainActivity`, which stripped the activity from the task stack upon opening the external camera intent.
  2. Memory spikes from high-resolution (50MP) unscaled camera captures triggered the Android Low Memory Killer (LMK) to destroy `MainActivity`.
  3. When recreated by Android OS, GoRouter started at `/splash` and redirected to `/home`, losing the navigation stack and unpersisted state.
* **Fix Applied:**
  * Removed `android:taskAffinity=""` from `AndroidManifest.xml`.
  * Added `android:largeHeap="true"` to `<application>`.
  * Added downscaling to `pickImage` (`maxWidth: 1600, maxHeight: 1600, imageQuality: 85`).
  * Implemented `ImagePicker().retrieveLostData()` and persisted `active_route = '/documents'` in `SharedPreferences` so that even if OS recreates the activity, it returns directly to the Documents screen with the photo intact.

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **Local File Path Longevity (Pre-Backend Sync):**
   * *Limitation:* Files are currently stored at temporary cache paths (`/data/user/0/.../cache/`). If an aggressive OS cleaner app wipes cache before backend synchronization, local previews can be lost.
   * *Future Mitigation:* Copy picked files to persistent application documents directory (`getApplicationDocumentsDirectory()`) or upload directly to S3 upon capture.
2. **PDF Thumbnail Rendering:**
   * *Limitation:* PDF files display a document badge icon rather than a rendered first-page image thumbnail because a native PDF rasterizer package is not currently linked.
3. **Android 13+ Granular Media Permissions:**
   * *Limitation:* Devices with custom OS skins (MIUI, Vivo) may require explicit user grant for media permissions via system app settings.
