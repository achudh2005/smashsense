# 🏸 SmashSense

> **LIVE Badminton Match Analyzer** running 100% client-side in the browser on desktop and mobile.

SmashSense analyzes live badminton matches directly through your device's camera in real time using client-side Computer Vision, Web Workers, and WebGL/WebGPU acceleration. 

### 🛡️ Privacy by Design: Zero Match Video Recorded or Uploaded
- **No Video Recording**: Raw camera frames are processed in-memory in real time and discarded immediately.
- **Client-Side Inference**: All AI, player pose estimation, and shuttlecock trajectory tracking execute locally inside a dedicated Web Worker on your device.
- **Data-Only Storage**: Only geometric coordinates, match events (serves, smashes, points), and aggregated statistics are stored in IndexedDB (via Dexie). No video or image ever leaves your browser.

---

## 🚀 Key Features (Phase 1)

1. **Live Camera HUD**:
   - Camera switching (Environment / Front).
   - Resolution selector (`480p`, `720p 60fps`, `1080p`).
   - Real-time **FPS & Latency Indicator** (Camera Render FPS, Web Worker Inference FPS, Detection Latency in ms).
   - **Screen Wake Lock API**: Prevents your phone/laptop screen from dimming or going to sleep during play.
   - Landscape-optimized responsive layout designed for mobile court-side mounting.

2. **Interactive Court Calibration & Homography**:
   - 4-corner interactive calibration (Top-Left, Top-Right, Bottom-Right, Bottom-Left).
   - Computes Direct Linear Transformation (DLT) 3x3 homography matrix ($H$ and $H^{-1}$) mapping between camera pixel perspective and metric court space (13.40m $\times$ 6.10m).
   - Real-time augmented wireframe overlay: Singles & Doubles sidelines, Baselines, Short service lines, Doubles long service lines, Center lines, and Net.
   - Loupe / Magnifier tool for pixel-perfect pin placement on touch screens.
   - Save calibrations per venue in IndexedDB with quick re-calibration presets.

3. **Multi-Player Detection & Stable Tracking**:
   - ByteTrack-style two-stage matching (IoU + spatial Euclidean distance + Kalman filter state estimation).
   - Stable player IDs (1, 2, 3, 4) resilient against fast lunges and jump smashes.
   - Pose keypoints (MoveNet / MediaPipe skeleton format).
   - Role & team assignment wizard (Team A: A1, A2; Team B: B1, B2).

4. **Fast Shuttlecock Trajectory & Comet Trail**:
   - Real-time small fast-object detector utilizing temporal frame differencing, luminance thresholding, and court bounding mask.
   - 4D Kalman filter $[x, y, v_x, v_y]$ with outlier rejection.
   - Glowing fading comet trail on live video with real-time speed badge (km/h) and smash detection.

5. **Live 2D Top-Down Mini-Court (Radar)**:
   - High-fidelity 2D mini-court displaying player positions in court coordinates.
   - Dynamic movement trails showing player court coverage.
   - Shuttlecock 2D flight path and landing coordinate tracking.

6. **Match Setup Wizard & Camera Guide**:
   - Singles vs Doubles configuration.
   - Player naming and team assignment.
   - First server selection (with BWF even/odd court rules).
   - Illustrated camera placement guide (tripod height, baseline distance, angle).

7. **Simulated Match Mode**:
   - Built-in realistic badminton rally simulation for immediate testing anywhere without needing a physical court or players.

---

## 📂 Project Architecture

```
smashsense/
├── src/
│   ├── camera/             # Camera stream, resolution switcher, wake lock, FPS meter
│   │   ├── cameraManager.ts
│   │   ├── fpsMeter.ts
│   │   └── useWakeLock.ts
│   ├── court/              # BWF court geometry, homography solver, canvas overlay
│   │   ├── courtGeometry.ts
│   │   ├── homography.ts
│   │   ├── courtOverlay.ts
│   │   └── __tests__/
│   ├── detection/          # Shuttlecock detector, adaptive frame skipper, types
│   │   ├── shuttlecockDetector.ts
│   │   ├── frameSkipper.ts
│   │   └── types.ts
│   ├── tracking/           # 4D Kalman filter, ByteTrack player tracker, shuttle tracker
│   │   ├── kalman.ts
│   │   ├── byteTrack.ts
│   │   ├── shuttlecockTracker.ts
│   │   └── __tests__/
│   ├── game/               # Zustand match state, scorekeeping, BWF serving rules
│   │   └── gameState.ts
│   ├── stats/              # Real-time statistics aggregation
│   ├── storage/            # IndexedDB schema via Dexie (Venues, Calibrations, Matches)
│   │   └── db.ts
│   ├── ui/                 # React UI components (TopBar, MiniCourt, CalibrationOverlay, etc.)
│   │   ├── LiveCameraView.tsx
│   │   ├── TopBar.tsx
│   │   ├── MiniCourt.tsx
│   │   ├── CalibrationOverlay.tsx
│   │   ├── SetupWizard.tsx
│   │   └── CameraPositionGuide.tsx
│   └── workers/            # Web Worker for off-thread frame processing
│       └── detection.worker.ts
```

---

## 🛠️ Setup & Running

### Prerequisites
- Node.js 18+ and npm

### Installation
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Run Unit Tests
```bash
npm run test
```

### Build Production Bundle (PWA)
```bash
npm run build
```

---

## 🧪 Unit Tests

SmashSense includes comprehensive unit tests verifying:
- **Homography Transform**: Exact round-trip mapping between court metric meters and camera pixels, and boundary in-court validation.
- **Tracker ID Stability**: Verifying player identity persistence across consecutive movement frames, multi-player separation, and role retention.
- **Court Geometry**: Strict conformance to official BWF dimensional specifications.

---

## 📜 License
MIT License
