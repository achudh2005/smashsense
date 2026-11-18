# 🏸 SmashSense

> **LIVE Badminton Match Analyzer & Smart Coach** running 100% client-side in the browser on desktop and mobile.

SmashSense analyzes live badminton matches directly through your device's camera in real time using client-side Computer Vision, Web Workers, and WebGL/WebGPU acceleration. 

### 🛡️ Privacy by Design: Zero Match Video Recorded or Uploaded
- **No Video Recording**: Raw camera frames are processed in-memory in real time and discarded immediately.
- **Client-Side Inference**: All AI, player pose estimation, and shuttlecock trajectory tracking execute locally inside a dedicated Web Worker on your device.
- **Data-Only Storage**: Only geometric coordinates, match events (serves, smashes, points), and aggregated statistics are stored in IndexedDB (via Dexie). No video or image ever leaves your browser.

---

## 🚀 Key Features

### 1. Live Camera HUD & Court Calibration (Phase 1)
- **Camera Switching**: Toggle front/environment cameras on mobile/desktop.
- **Resolution Selector**: Choose `480p`, `720p 60fps`, or `1080p`.
- **FPS & Latency Indicator**: Camera Render FPS, Worker Inference FPS, and Latency in milliseconds.
- **Screen Wake Lock API**: Prevents your phone/laptop screen from dimming or going to sleep during play.
- **Interactive 4-Corner Court Calibration**: Direct Linear Transformation (DLT) 3x3 homography matrix ($H$ and $H^{-1}$) mapping between camera pixel perspective and metric court space (13.40m $\times$ 6.10m).
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
- **Intervals & End Changes**: 60s at 11 points mid-game, 120s between games, and end changes at 11 in Game 3.
- **Full Server Rotation & Court Positions**: Standard BWF singles and doubles serving rules.
- **Live Scoreboard Overlay**: Full **Undo** & **Redo** stack and complete **Audit Trail**.

### 5. Player Motion Detection & Action Classifier
Detects and logs every player movement with timestamp, position, and player ID:
- **Strokes**: `smash`, `jump_smash`, `clear`, `drop`, `drive`, `net_shot`, `lift`, `serve`, `block`, `flick`.
- **Movement Footwork**: `lunge`, `split_step`, `jump`, `backward_chasse`, `recovery_to_base`.
- **Misses**: `failed_return`, `mistimed_swing`, `no_reaction`, `shuttle_left_unreached`.

### 6. Point Attribution & Tactical Metrics
- Attributed as: `WINNER`, `UNFORCED_ERROR`, or `FORCED_ERROR`.
- **Tactical Landing Zones**: 9-zone court grid (`Front-Left`, `Front-Center`, `Front-Right`, `Mid-Left`, `Mid-Center`, `Mid-Right`, `Back-Left`, `Back-Center`, `Back-Right`).
- **Trajectory Metrics**: Shot direction (`straight` vs `cross`), net crossing clearance height, and speed in km/h.

### 7. Advanced Analytics, Heatmaps & Reports (Phase 3)
- **Deep Statistical Engine**: Points won/lost, win percentage, winners, unforced errors, forced errors, net differential.
- **Shot Conversions**: Smash win rate, top smash speed (km/h), drop execution vs drop errors (net/out).
- **2D Court Heatmaps**: Player positioning density, shuttle landings (Emerald = IN, Rose = OUT), smash vectors, and error clusters.
- **Movement & Physical Analytics**: Distance covered (m), sprint speeds, court coverage %, recovery time to base, and **Fatigue Indicator** speed-drop %.
- **Multi-Format Export Suite**: Instant CSV logs, 1200 $\times$ 630 high-res social summary card (PNG), and printable PDF match report.

### 8. Smart Coaching, Training Mode & Voice Control (Phase 4)
- **Smart Coaching Engine** (`src/stats/coachingEngine.ts`):
  * **Rule-Based Plain Language Insights**: Immediate diagnostics on drop error rates, extended rally stamina, smash predictability, and base recovery lag.
  * **Optional LLM Gemini Coaching**: Generate personalized training recommendations and session drill plans via user-provided Gemini API key (strictly sends text metrics, zero video).
- **Solo Training & Drill Mode** (`src/training/`):
  * Target zone accuracy for short serves to the "T" and hairpin drops.
  * Down-the-line smash power drills with speed thresholds ($>160\text{ km/h}$).
  * 4-corner agility shadow footwork metronome.
  * Continuous rally shot counter & pace tracker.
  * Drill history stored in IndexedDB.
- **Player Profiles & Career Records** (`src/history/`):
  * Head-to-Head rivalry records between any two players.
  * Personal career bests: fastest smash (km/h), longest scoring streak, and win percentage.
- **Hands-Free Voice Features** (`src/voice/`):
  * Spoken score announcements using official BWF phrasing ("Love all. Play", "20 all. Deuce", "Game point").
  * Hands-free voice commands via Web Speech API: "Start", "Stop", "Undo", "Redo", "Point A", "Point B", "Next Game".
- **Hawkeye Accuracy & Flagged Calls Review** (`src/court/accuracyManager.ts`):
  * Confidence scores on every line decision.
  * Review screen for close calls within 5 cm. User overturns automatically calibrate detection thresholds.
- **Cloud Backup & Live Score Sharing** (`src/sync/syncService.ts`):
  * Complete JSON export & import of all statistics.
  * Shareable live score URL hash for spectators and coaches to follow matches in real time without video streaming.
- **Display Modes & Polish**:
  * **Jumbo Court Scoreboard Mode**: Fullscreen high-contrast display legible from 10–20 meters away across the gym.
  * **Low-Power Mode**: Adaptive worker throttling down to 15 FPS to conserve device battery.
  * **Multi-Language Support**: English, Chinese (中文), Japanese (日本語), Indonesian (Bahasa Indonesia), Spanish (Español), and French (Français).
  * **Quickstart Onboarding Tour**: 4-step interactive guide for camera placement and calibration.

---

## 📊 Live HUD & Jumbo Court Display Preview

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏸 SmashSense LIVE   [ Render: 30fps | Inf: 24fps | 18ms ]     [ A1 21 - 19 B1 ]  [Drills] [⚙]  │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│   [ Camera Video Feed with Calibrated Court Overlay ]                                     │
│                                                                                           │
│     Player A1  32 km/h              Shuttlecock Trail >>>                                 │
│     ┌──────────────────┐               • (Landing Point: IN 184 km/h)                     │
│     │                  │                                                                  │
│     │   Pose Keypoints │                                     Player B1                    │
│     │                  │                                    ┌──────────────────┐          │
│     └──────────────────┘                                    │                  │          │
│                                                             └──────────────────┘          │
│                                                                                           │
│  [Recent Actions Feed]                                            [ 2D Mini-Court ]       │
│  • A1 Jump Smash (184 km/h)                                      ┌──────────────────┐     │
│  • B1 Lunge Return                                               │  A1 •       • B1 │     │
│  • A1 Net Kill (WINNER)                                          └──────────────────┘     │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Architecture

```
smashsense/
├── .github/workflows/ci.yml # GitHub Actions CI/CD pipeline
├── src/
│   ├── camera/              # Camera stream, resolution switcher, wake lock, FPS meter
│   ├── court/               # BWF geometry, homography, line calling, accuracy tuning
│   │   ├── courtGeometry.ts
│   │   ├── homography.ts
│   │   ├── lineCallEngine.ts
│   │   ├── accuracyManager.ts
│   │   └── __tests__/
│   ├── detection/           # Motion classifier, shuttle detector, frame skipper
│   ├── game/                # BWF scoring engine, rally state machine, Zustand store
│   ├── history/             # Player profiles, head-to-head records, personal bests
│   │   └── playerProfileService.ts
│   ├── i18n/                # Multi-language translations (EN, ZH, JA, ID, ES, FR)
│   ├── stats/               # Metrics calculator, coaching engine, export service
│   │   ├── matchStatsCalculator.ts
│   │   ├── coachingEngine.ts
│   │   ├── exportService.ts
│   │   └── __tests__/
│   ├── storage/             # IndexedDB schema via Dexie (Venues, Matches, Drills, Calls)
│   ├── sync/                # Cloud backup, JSON import/export, live share link generator
│   ├── tracking/            # 4D Kalman filter, ByteTrack player tracker, shuttle tracker
│   ├── training/            # Solo drills, target zone accuracy, cadence counter
│   │   ├── drills.ts
│   │   ├── trainingManager.ts
│   │   └── __tests__/
│   ├── ui/                  # React UI HUD, Modals, Heatmaps, Jumbo Scoreboard, Tutorial
│   ├── voice/               # Web Speech API announcements and voice command recognition
│   │   ├── speechService.ts
│   │   └── __tests__/
│   └── workers/             # Off-thread Web Worker for computer vision inference
```

---

## 🛠️ Setup & Running

### Prerequisites
- Node.js 18+ and npm
- A modern browser with WebGL/WebGPU and camera support (Chrome, Safari, Edge, Firefox)
- **HTTPS Requirement**: Camera access via `getUserMedia` requires a secure HTTPS origin or `localhost`.

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

## 📜 Open Source Notice
SmashSense is open source and available under standard open source terms.
Copyright (c) 2026 SmashSense Contributors.
