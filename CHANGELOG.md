# Changelog

All notable changes to the SmashSense project are documented in this file.

## [1.1.0] - Apple-Grade Interface & Craft Polish

### Added
- **Design Tokens (`src/design/tokens.ts`)**:
  - Unified Apple Human Interface typography scale (SF Pro Display, Text, and Mono fallbacks).
  - Fixed-width tabular numbers (`font-variant-numeric: tabular-nums`) across all scoreboards, timers, and telemetry metrics to eliminate layout jitter.
  - 4pt / 8pt spatial rhythm and standardized corner radius scale (`sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `full`).
  - Layered translucent materials (`ultraThin`, `thin`, `regular`, `thick`, `sheet`) with backdrop blur filters.
  - Restrained semantic palette (Emerald `#10b981`, Sky `#38bdf8`, Amber `#f59e0b`, Rose `#ef4444`).
- **Brand Identity (`src/ui/BrandLogo.tsx`)**:
  - Precision vector SVG emblem combining BWF court geometry with parabolic shuttle trajectory curves.
  - Completely replaced all legacy emoji icons across the entire codebase.
- **Physical Haptics Engine (`src/utils/haptics.ts`)**:
  - Web Vibration API integration with patterned impulses: `light` (6ms), `medium` (14ms), `success` ([10, 40, 15]), `warning` ([25, 40, 25]), and `selection` (4ms).
- **Command Palette (`src/ui/CommandPalette.tsx`)**:
  - macOS Spotlight / Raycast-style command interface accessible via `⌘K` or `Ctrl+K`.
  - Instant keyboard filtering across matches, drills, calibration, audio, and exports.
- **Mobile Bottom Navigation (`src/ui/MobileBottomBar.tsx`)**:
  - Touch-optimized bottom navigation with standard 44px hit targets and `env(safe-area-inset-bottom)` safe-area padding.
- **Apple Fitness-Style Drill UI (`src/ui/TrainingModeModal.tsx`)**:
  - Circular SVG progress rings tracking target-zone accuracy and drill completion percentages.
  - Real-time cadence metrics and drill history review.
- **Precision Court Calibration Loupe (`src/ui/CalibrationOverlay.tsx`)**:
  - Magnification loupe with crosshairs when dragging pins to ensure millimeter-accurate corner placement.
- **Comprehensive UX & Architectural Audit (`AUDIT.md`)**:
  - Systematic review of ergonomics, typography, performance, accessibility, and privacy architecture.

### Changed
- **Scoreboard Overlays**: Refined with glass translucency, tabular figures, and instant undo/redo capabilities.
- **Editorial Stats Report**: Elevated contrast, typography hierarchy, and PDF/CSV export fidelity.
- **Feedback Copy**: Rewritten in a calm, confident, non-cliché product tone.

---

## [1.0.0] - Production Release

### Added
- Rule-based coaching engine and optional Gemini LLM coaching assistant.
- Solo training mode with target-zone accuracy tracking.
- Player career profiles, head-to-head records, and progression charts.
- Hands-free voice commands via Web Speech API.
- Offline-first IndexedDB storage via Dexie.
- Multilingual localization (English, Chinese, Japanese, Indonesian, Spanish, French).
- Privacy-by-architecture guarantee (volatile RAM processing; zero video stored or uploaded).

---

## [0.3.0] - Analytics & Post-Match Intelligence

### Added
- Comprehensive post-match report and player comparison radar charts.
- Court heatmaps (player positioning, shuttle landing, smashes, errors).
- Match momentum timeline and pressure point analysis (18-18 clutch scoring).
- PDF, CSV, and summary image card exports.

---

## [0.2.0] - Scoring Engine & Motion Recognition

### Added
- BWF 21-point rally scoring state machine with 30-point cap and deuce rules.
- Automated IN/OUT line call detection with confidence grading.
- Stroke classification (smash, clear, drop, net shot, lift, drive).
- Physical shuttle metrics (velocity, net clearance, 9-zone landing grid).

---

## [0.1.0] - Initial Setup & Live Camera Telemetry

### Added
- Live camera feed with WebRTC `getUserMedia`, device switching, and wake lock.
- 4-corner DLT court homography calibration.
- Multi-person ByteTrack player tracker and Kalman shuttlecock tracker.
- Real-time 2D mini-court radar.
