# SmashSense

[![Live Demo](https://img.shields.io/badge/Live%20Demo-smashsense.54.79.20.200.sslip.io-brightgreen?style=for-the-badge&logo=nginx)](https://smashsense.54.79.20.200.sslip.io)
[![CI](https://github.com/achudh2005/smashsense/actions/workflows/ci.yml/badge.svg)](https://github.com/achudh2005/smashsense/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-v1.2.0-blue?style=flat-square)](https://github.com/achudh2005/smashsense/releases/tag/v1.2.0)

> **LIVE Badminton Match Analyzer & Tactical Intelligence** running 100% client-side in the browser on desktop and mobile.

🌐 **[Open SmashSense →](https://smashsense.54.79.20.200.sslip.io)** — works on any device, no install required.

SmashSense analyzes live badminton matches directly through your device's camera in real time using client-side Computer Vision, Web Workers, and WebGL/WebGPU acceleration. 

### Architecture Guarantee: Zero Video Recorded or Uploaded
- **No Video Recording**: Raw camera frames are processed in-memory in real time and discarded immediately.
- **Client-Side Inference**: All AI, player pose estimation, and shuttlecock trajectory tracking execute locally inside a dedicated Web Worker on your device.
- **Data-Only Storage**: Only geometric coordinates, match events (serves, smashes, points), and aggregated statistics are stored in IndexedDB (via Dexie). No video or image ever leaves your browser.

---

## Craft & Interaction Architecture (Apple-Grade Polish)

SmashSense adheres to Apple Human Interface Guidelines with a design focused on ergonomics and clarity:

- **Typography & Fixed Figures**: System SF Pro type scale with fixed-width tabular numerals (`tabular-nums`) across all scoreboards, timers, and telemetry metrics to eliminate micro-layout jitter.
- **Translucent Layered Materials**: Layered materials (`ultraThin`, `thin`, `regular`, `thick`) with backdrop blur filters on navigation bars, sheets, and camera overlays.
- **Physical Haptics Engine**: Tactile impulses for mobile browsers supporting the Web Vibration API (`light`, `medium`, `success`, `warning`, `selection`).
- **Command Palette (`⌘K` / `Ctrl+K`)**: Rapid keyboard-driven Spotlight interface for accessing match settings, drills, calibration, and reports.
- **Mobile Bottom Navigation**: Touch-first tab navigation with standard 44px tap targets and `env(safe-area-inset-bottom)` safe-area padding.
- **Precision Calibration Loupe**: Magnification loupe with crosshair precision during court corner pin alignment.
- **Apple Fitness-Style Rings**: Concentric SVG progress rings tracking target accuracy and cadence during solo training drills.
- **Restrained Palette**: Neutral dark canvas with a single purposeful accent color, eliminating noisy gradients or distracting neon elements.

---

## Key Capabilities

### 1. Live Camera Telemetry & Court Calibration
- **Camera Switching**: Toggle front and rear cameras on mobile and desktop devices.
- **Resolution Selector**: Choose between standard and high-frame-rate presets (`480p`, `720p 60fps`, `1080p`).
- **Telemetry HUD**: Camera Render FPS, Worker Inference FPS, and pipeline latency in milliseconds.
- **Screen Wake Lock**: Prevents mobile and laptop displays from sleeping during play.
- **Direct Linear Transformation (DLT)**: Interactive 4-corner homography calibration matrix mapping camera pixels to standard BWF court dimensions (13.40m $\times$ 6.10m).
- **2D Top-Down Mini-Court**: Real-time top-down radar showing player positions, court zones, and shuttle trajectories.

### 2. Rally State Machine & Motion Recognition
- Formal finite state machine: `IDLE` $\to$ `SERVING` $\to$ `RALLY_ACTIVE` $\to$ `RALLY_ENDING` $\to$ `POINT_EVALUATED` $\to$ `INTERVAL`.
- Real-time timestamped event logging with duration, shot count, peak speed, and ending stroke.
- **Stroke Classification**: Smashes, jump smashes, clears, drops, drives, net shots, lifts, serves, and blocks.
- **Footwork Detection**: Lunges, split-steps, jumps, backward chassé, and recovery to base.
- **Miss Categorization**: Failed return, mistimed swing, no reaction, and unreached shuttlecock.

### 3. IN / OUT Line Call Engine
- Real-time line evaluation against official BWF singles and doubles dimensions.
- High-precision landing indicator with metric distance calculations.
- **Confidence Scoring & Uncertainty Warnings**: Automatically flags calls within **5 cm** of boundary lines for manual review.

### 4. Official BWF Scoring Engine
- **Rally Point Scoring**: 21 points per game with standard deuce rules (2-point lead required up to a 30-point golden point cap).
- **Match Formats**: Singles and doubles with server rotation, side switches, and intervals.
- **Score Auditing**: Full undo/redo stack with an immutable audit log of all automated and manual score adjustments.

### 5. Tactical AI & Game Intelligence (Phase 1)
- **Detailed Match Event Model**: Granular event logging storing shot type, 1-9 BWF court zone mapping, winner, error type (unforced, forced, net cord, out, missed return), rally shot count, duration, server state, and peak shuttle speed in Dexie IndexedDB.
- **Live In-Game Coach**: Automatic tactical triggers at 11-point intervals and between games. Derives advice strictly from real statistical data:
  - *Opponent Vulnerability*: Identifies error-prone opponent strokes (e.g., "Opponent is vulnerable on deep backhand clears (62% error rate)").
  - *Target Zone Conversion*: High-value court landing zones (e.g., "Target Zone 3: 75% of your winning points ended in front-right net zone").
  - *Rally Length Pacing*: Optimal rally duration and endurance trends.
  - *Serve Conversion*: First-strike serve retention rates.
- **Real-Time Win Probability & Momentum Gauge**: Dynamic win probability model calibrated for 21-point BWF scoring with real-time momentum index (-100 to +100), visual sparkline trend, and fatigue estimation based on sprint speed degradation.
- **Coach HUD**: Interactive glassmorphic tactical coach card overlay during live camera matches with toggle button and automatic intermission popups.

### 6. Smart Sensor & Audio Intelligence (Phase 2)
- **Acoustic Net Strike & Shuttle Hit Detection**:
  - Web Audio API real-time Fast Fourier Transform (FFT) frequency spectrum analysis.
  - Distinguishes high-frequency shuttlecock impact pops (3.5 kHz – 7.0 kHz transient) from net-cord tape scrapes (800 Hz – 2.5 kHz resonant).
  - Audio-Vision Fusion: Corroborates visual shuttle landing candidates occurring within $\pm 120$ ms of an acoustic transient peak, boosting line call certainty (+15-18%) and automatically flagging net-cord shots.
  - Configurable sensitivity threshold (10% to 100%) with graceful microphone permission fallback.
- **Bluetooth Remote Clicker & Wearable Controls**:
  - Full hands-free remote match operation using standard Bluetooth presentation remotes (PageUp/PageDown, Space, B/Blackout, Enter, MediaKeys) and volume buttons.
  - Mapped actions: Point Team A (+1), Point Team B (+1), Undo Last Point, Challenge / Flag Call (Hawk-Eye review), and Start/Stop Training Drill.
  - Interactive "Learn Key" customization modal allowing one-click binding to any wireless clicker.
  - Non-intrusive synthesized Web Audio feedback tones and physical haptics for blind tactile confirmation.

### 7. Broadcast & Visual Replay (Phase 3)
- **Virtual 3D Hawk-Eye Line Call Replay**:
  - Full-screen animated 3D recreation of close boundary calls on demand or automatically triggered on contentious calls (confidence < 70% or margin $\le 18$ mm).
  - High-resolution HTML5 Canvas rendering of BWF court surface, zoomed boundary lines (40mm scale), 3D parabolic shuttle descent flight path, cork base impact compression oval, and realistic chalk dust particle burst.
  - Broadcast presentation banner with exact millimeter distance: e.g. **"IN (by 8 mm)"** or **"OUT (by 14 mm)"**.
- **Olympic-Style Broadcast Lower-Thirds & TV Graphics**:
  - Glassmorphic animated lower-third TV overlays that slide in/out during live match play:
    - *Top Smash Speed*: "🏸 TOP SMASH: 382 KM/H • Viktor Axelsen"
    - *Rally of the Match*: "🔥 RALLY OF THE MATCH: 44 SHOTS (48s)"
    - *Game Point & Match Point*: High-contrast golden championship alerts.
    - *Interval Lead*: Mid-game intermission score updates.
  - Configurable toggle in store and auto-dismissing 4.2-second display timer.
- **Slow-Motion Smash Biomechanics Analyzer**:
  - In-memory 90-frame rolling keypoint buffer (3.0 seconds at 30 fps) capturing the full takeoff, apex reach, contact, and landing sequence.
  - Kinematic metrics: Jump clearance (cm), contact height relative to floor (meters), arm extension angle (target 165° – 180°), and rotational pronation velocity (°/sec).
  - Interactive scrubbable player with skeleton stick figure, joint angle arcs, and variable slow-mo speeds (0.25x, 0.5x, 1.0x).

### 8. Tactical Analytics & Post-Match Intelligence
- **Comprehensive Match Reports**: Points won/lost, conversion rates, forced vs. unforced error ratios, and clutch scoring at 18-18.
- **2D Court Heatmaps**: Player position densities, shuttle landing distributions, smash directions, and error clusters.
- **Movement Analytics**: Distance covered (meters), sprint speeds, court coverage percentage, and speed-drop fatigue indicators.
- **Multi-Format Exports**: Export structured CSV files, high-resolution social summary image cards, and printable PDF match reports.

### 6. Training Drills & Voice Features
- **Solo Training Mode**: Target-zone accuracy drills (short serves, drop shots, smashes) and cadence footwork timers.
- **Player Career Profiles**: Track head-to-head records, personal best smash speeds, and win streaks over time.
- **Hands-Free Voice Control**: Spoken score announcements ("Love all. Play", "Game point") and speech recognition commands ("Start", "Undo", "Point A", "Next Game").
- **Low-Power Mode**: Throttles inference frame rates on battery power to sustain performance across multi-set matches.
- **Multilingual Support**: English, 中文, 日本語, Bahasa Indonesia, Español, and Français.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & Design Tokens** | Tailwind CSS, Framer Motion, Lucide Icons |
| **Computer Vision & AI** | Web Workers, WebGL/WebGPU acceleration, ByteTrack, MoveNet |
| **State Management** | Zustand with custom middleware |
| **Local Persistence** | IndexedDB via Dexie.js (Zero cloud sync required) |
| **Charts & Graphics** | Recharts, HTML5 Canvas API |
| **PWA & Offline** | Vite PWA Plugin, Workbox Service Worker |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` or `Ctrl+K` | Open Command Palette |
| `Space` | Toggle Simulation Match / Rally |
| `U` | Undo Last Score Correction |
| `R` | Redo Score Correction |
| `C` | Toggle Court Calibration Overlay |
| `M` | Toggle 2D Mini-Court Radar |
| `Escape` | Dismiss Open Modal / Close Overlay |

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/achudan/smashsense.git
cd smashsense

# Install dependencies
npm install

# Start development server
npm run dev
```

### Running Tests
```bash
# Run unit tests with Vitest
npm run test

# Typecheck with TypeScript
npx tsc --noEmit
```

### Production Build
```bash
npm run build
```

---

## Architecture

```
smashsense/
├── src/
│   ├── camera/          # getUserMedia, wake lock, resolution selector, fps meter
│   ├── court/           # Homography, BWF court geometry, line calling, accuracy review
│   ├── detection/       # Web Worker inference bridge, adaptive frame skipper
│   ├── tracking/        # ByteTrack player tracker, Kalman shuttlecock trajectory tracker
│   ├── game/            # BWF scoring state machine, rally state machine, audit log
│   ├── training/        # Solo drill routines, target zone hit evaluator, cadence tracker
│   ├── voice/           # Speech synthesis announcements & speech recognition commands
│   ├── stats/           # Match analytics calculator, heatmaps, coaching engine, exports
│   ├── design/          # Apple HIG design tokens (typography, materials, spacing, colors)
│   ├── storage/         # IndexedDB schema (Dexie.js)
│   ├── utils/           # Web Vibration API physical haptics engine
│   └── ui/              # Apple-grade components (HUD, TopBar, MobileBottomBar, Modals)
```

---

## Privacy Notice
SmashSense runs completely inside your browser sandbox. Camera frames are never sent across the network or stored on any server.
