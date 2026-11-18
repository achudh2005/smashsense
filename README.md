# 🏸 SmashSense

> **LIVE Badminton Match Analyzer** running 100% client-side in the browser on desktop and mobile.

SmashSense analyzes live badminton matches directly through your device's camera in real time using client-side Computer Vision, Web Workers, and WebGL/WebGPU acceleration. 

### 🛡️ Privacy by Design: Zero Match Video Recorded or Uploaded
- **No Video Recording**: Raw camera frames are processed in-memory in real time and discarded immediately.
- **Client-Side Inference**: All AI, player pose estimation, and shuttlecock trajectory tracking execute locally inside a dedicated Web Worker on your device.
- **Data-Only Storage**: Only geometric coordinates, match events (serves, smashes, points), and aggregated statistics are stored in IndexedDB (via Dexie). No video or image ever leaves your browser.

---

## 🚀 Key Features

### 1. Live Camera HUD & Calibration (Phase 1)
- **Camera Switching**: Toggle front/environment cameras on mobile/desktop.
- **Resolution Selector**: Choose `480p`, `720p 60fps`, or `1080p`.
- **FPS & Latency Indicator**: Camera Render FPS, Worker Inference FPS, and Latency in milliseconds.
- **Screen Wake Lock API**: Prevents your phone/laptop screen from dimming or going to sleep during play.
- **Interactive 4-Corner Court Calibration**: Computes Direct Linear Transformation (DLT) 3x3 homography matrix ($H$ and $H^{-1}$) mapping between camera pixel perspective and metric court space (13.40m $\times$ 6.10m).
- **2D Top-Down Mini-Court Radar**: Live player positioning and shuttle flight radar.

### 2. Rally State Machine & Auto Detection (Phase 2)
- Formal finite state machine: `IDLE` $\to$ `SERVING` $\to$ `RALLY_ACTIVE` $\to$ `RALLY_ENDING` $\to$ `POINT_EVALUATED` $\to$ `INTERVAL`.
- Real-time timestamped rally logging with duration, shot count, max speed, and ending stroke.

### 3. IN / OUT Line Call Engine
- Real-time line evaluation against official BWF singles and doubles dimensions.
- **Hawk-Eye Style Visualizer**: Glowing landing bullseye on court with expanding animated ripple rings.
- **Confidence Scoring & Uncertainty Flag**: Computes distance to line in centimeters. If a landing spot is within **5 cm** of the line boundary, it flags an `⚠️ UNCERTAIN CALL - Review advised` warning.

### 4. Official BWF Automatic Scoring Engine
- **Rally Point Scoring**: Point awarded on every rally.
- **21 Points per Game**: Standard game winning threshold.
- **Deuce & 2-Point Lead**: At 20-20, requires a 2-point lead (e.g. 22-20, 24-22).
- **30-Point Sudden Death Cap**: At 29-29, the golden 30th point wins the game immediately (30-29).
- **Best of 3 Games**: Match won by first side to win 2 games.
- **Intervals & End Changes**:
  * 60s interval at 11 points mid-game.
  * 120s interval between games.
  * Change ends after Game 1, after Game 2, and in Game 3 when a side first reaches 11 points.
- **Full Server Rotation & Court Positions**:
  * **Singles**: Server serves from Right service court when score is even (0, 2, 4...), and Left court when odd (1, 3, 5...).
  * **Doubles**: Serving side swaps right/left courts when scoring a consecutive point; receivers stay in position. When serve is broken, new server is determined based on the winning side's score.
- **Live Scoreboard Overlay**:
  * Manual score correction modal.
  * Full **Undo** & **Redo** stack.
  * Complete **Audit Trail** of every auto-call and manual correction.

### 5. Player Motion Detection & Action Classifier
Detects and logs every player movement with timestamp, position, and player ID:
- **Strokes**: `smash`, `jump_smash`, `clear`, `drop`, `drive`, `net_shot`, `lift`, `serve`, `block`, `flick`.
- **Movement Footwork**: `lunge`, `split_step`, `jump`, `backward_chasse`, `recovery_to_base`.
- **Misses**: `failed_return`, `mistimed_swing`, `no_reaction`, `shuttle_left_unreached`.

### 6. Point Attribution & Tactical Metrics
- Attributed as:
  * `WINNER`: Clean unreturned shot landing in-bounds.
  * `UNFORCED_ERROR`: Striker hit shuttle out or into net without pressure.
  * `FORCED_ERROR`: Striker forced into error under heavy attack/smash ($>160\text{ km/h}$).
- **Tactical Landing Zones**: 9-zone court grid (`Front-Left`, `Front-Center`, `Front-Right`, `Mid-Left`, `Mid-Center`, `Mid-Right`, `Back-Left`, `Back-Center`, `Back-Right`).
- **Trajectory Metrics**: Shot direction (`straight` vs `cross`), net crossing clearance height, and speed in km/h.

### 7. Advanced Analytics, Heatmaps & Reports (Phase 3)
- **Deep Statistical Engine** (`src/stats/matchStatsCalculator.ts`):
  * **Player Performance**: Points won/lost, win percentage, winners, unforced errors, forced errors, net differential (+/-).
  * **Shot Conversions**: Smash win rate, top smash speed (km/h), drop execution vs drop errors (net/out).
  * **Service & Receive**: First-serve win rate, service faults, receive points won.
  * **Rally Length Splits**: Points won on short rallies (<4 shots), medium rallies (4–7 shots), and extended rallies (≥8 shots).
  * **Streaks**: Maximum consecutive scoring runs and longest match rally.
- **Live In-Match Stats Drawer** (`src/ui/LiveStatsDrawer.tsx`):
  * Real-time slide-out analytics dock during live video play.
  * Instant team point-share progress bar, key comparison splits, and live MVP tracking.
- **Post-Match Analytics Dashboard Modal** (`src/ui/StatsDashboardModal.tsx`):
  * **Radar & Bar Charts**: Head-to-head comparison via Recharts (Overall, Smashes, Drops, Defense).
  * **Automated Awards**: `MVP`, `Most Improved`, and `Needs Work` with evidence-based rationales.
  * **Momentum Timeline**: Score differential graph ($A - B$) with comeback and pressure point markers.
  * **Pressure Points & Comeback Analysis**: Clutch performance at 18–18 and above/deuce, plus tracking of multi-point deficit comebacks.
  * **Doubles Pair Synergy**: Rotation efficiency %, zone distribution (Forecourt, Midcourt, Rearcourt).
- **2D Court Heatmaps** (`src/ui/HeatmapCanvas.tsx`):
  * **Player Positioning**: Heat density of player footwork across the court.
  * **Shuttle Landings**: Color-coded landing points (Emerald = IN, Rose = OUT) with speed radii.
  * **Smash Vectors**: Trajectory arrows colored by shot angle (`straight` vs `cross`).
  * **Error Clusters**: Spatial map of unforced and forced error origins.
- **Physical & Movement Analytics**:
  * Distance covered in meters and kilometers.
  * Average and top sprint speeds.
  * Court coverage percentage (% of court surface reached).
  * Average recovery time to base after shots (seconds).
  * **Fatigue Indicator**: Percentage drop in player movement speed between the first half and second half of the match.
- **Multi-Format Export Suite** (`src/stats/exportService.ts`):
  * **CSV Export**: Full timestamped log of all match rallies and player actions.
  * **Social Summary Card (PNG)**: 1200 $\times$ 630 high-resolution branded match card rendered dynamically via HTML5 Canvas.
  * **PDF Match Report**: One-click printable match sheet and analytics breakdown.

---

## 📊 Live Dashboard & HUD Preview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏸 SmashSense LIVE   [ Render: 30fps | Inf: 24fps | 18ms ]     [ A1 21 - 19 B1 ]  [Stats] [⚙] │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   [ Camera Video Feed with Calibrated Court Overlay ]                                   │
│                                                                                         │
│     Player A1  32 km/h              Shuttlecock Trail >>>                               │
│     ┌──────────────────┐               • (Landing Point: IN 184 km/h)                   │
│     │                  │                                                                │
│     │   Pose Keypoints │                                     Player B1                  │
│     │                  │                                    ┌──────────────────┐        │
│     └──────────────────┘                                    │                  │        │
│                                                             └──────────────────┘        │
│                                                                                         │
│  [Recent Actions Feed]                                            [ 2D Mini-Court ]     │
│  • A1 Jump Smash (184 km/h)                                      ┌──────────────────┐   │
│  • B1 Lunge Return                                               │  A1 •       • B1 │   │
│  • A1 Net Kill (WINNER)                                          └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Known Limitations & Setup Recommendations

1. **Camera Placement**:
   - Optimal results require the camera to be elevated **1.8m – 2.5m** directly behind one baseline, tilted down 15°–20°. Extreme ground-level angles increase player-on-player occlusion.
2. **Lighting & Backgrounds**:
   - Bright direct backlights (e.g. spotlight aimed into the camera) can create glare that obscures the white shuttlecock.
   - White walls directly behind court baselines can reduce contrast for high clears.
3. **Severe Occlusions**:
   - In doubles, when one player lunges directly in front of their partner along the camera axis, pose keypoints for the rear player may be momentarily interpolated by the Kalman filter.

---

## 📂 Project Architecture

```
smashsense/
├── src/
│   ├── camera/             # Camera stream, resolution switcher, wake lock, FPS meter
│   │   ├── cameraManager.ts
│   │   ├── fpsMeter.ts
│   │   └── useWakeLock.ts
│   ├── court/              # BWF court geometry, homography solver, line call engine
│   │   ├── courtGeometry.ts
│   │   ├── homography.ts
│   │   ├── courtOverlay.ts
│   │   ├── lineCallEngine.ts
│   │   └── __tests__/
│   ├── detection/          # Motion classifier, shuttlecock detector, frame skipper
│   │   ├── motionClassifier.ts
│   │   ├── shuttlecockDetector.ts
│   │   ├── frameSkipper.ts
│   │   └── types.ts
│   ├── tracking/           # 4D Kalman filter, ByteTrack player tracker, shuttle tracker
│   │   ├── kalman.ts
│   │   ├── byteTrack.ts
│   │   ├── shuttlecockTracker.ts
│   │   └── __tests__/
│   ├── game/               # BWF scoring engine, rally state machine, Zustand store
│   │   ├── scoringEngine.ts
│   │   ├── rallyStateMachine.ts
│   │   ├── gameState.ts
│   │   └── __tests__/
│   ├── stats/              # Statistics engine, metrics calculator, and export service
│   │   ├── matchStatsCalculator.ts
│   │   ├── exportService.ts
│   │   └── __tests__/
│   ├── storage/            # IndexedDB schema via Dexie (Venues, Calibrations, Matches, Events, Rallies)
│   │   └── db.ts
│   ├── ui/                 # React UI components (LiveCameraView, StatsDashboardModal, LiveStatsDrawer, HeatmapCanvas, etc.)
│   │   ├── LiveCameraView.tsx
│   │   ├── TopBar.tsx
│   │   ├── ScoreboardOverlay.tsx
│   │   ├── StatsDashboardModal.tsx
│   │   ├── LiveStatsDrawer.tsx
│   │   ├── HeatmapCanvas.tsx
│   │   ├── AuditLogModal.tsx
│   │   ├── LandingCallBanner.tsx
│   │   ├── PlayerActionFeed.tsx
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

## 📜 License
MIT License
