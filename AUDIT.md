# SmashSense Product & Interface Audit

**Auditor:** Principal Web Engineer & Product Designer (Apple-Platform / Human Interface Guidelines)  
**Date:** November 2026  
**Scope:** Complete frontend architecture, design system, interaction ergonomics, computer vision HUD, and BWF scoring engine.

---

## 1. Visual Design & Aesthetic Language

| Area | Current Issue | Severity | Target Resolution |
| :--- | :--- | :--- | :--- |
| **Iconography** | Use of raw emoji (`🏸`, `🔥`, `🎯`, `🐢`, `⚡`, `🔒`) in headers, buttons, and callout badges. | **High** | Replace all emoji with precision 1.5pt SVG icons (Lucide / SF Symbols-inspired outline iconography) and a custom bespoke SVG brand mark. |
| **Color Palette** | Neon saturated purple/blue gradients (`from-purple-500/10 via-slate-900`, `shadow-purple-900/40`) characteristic of generic AI templates. | **High** | Transition to a disciplined monochrome slate/zinc neutral foundation with one purposeful court accent (International Electric Emerald `#00C853` / Cupertino Azure `#007AFF`). |
| **Translucency & Materials** | Inconsistent backdrop blur opacities; raw rgba overlays without true Apple glass material tiering. | **Medium** | Implement semantic material tokens (`ultraThin`, `thin`, `regular`, `thick`) with CSS backdrop filters, hairline borders (`1px solid rgba(255,255,255,0.08)`), and soft multi-layer ambient shadows. |
| **Typography & Numerals** | Variable font styles without tabular numeral alignment; numbers shift slightly when scores tick up. | **High** | Enforce SF Pro / Inter font stack with `tabular-nums` (`font-feature-settings: "tnum"`) across all scoreboards, telemetry meters, clocks, and charts. Limit to 4 text hierarchies per screen. |
| **Brand Identity** | Emoji-based logo mark. | **Medium** | Design a geometric minimal vector mark representing a court intersection and aerodynamic shuttlecock trajectory. |

---

## 2. Interaction & Platform Craft (iOS & macOS Ergonomics)

| Area | Current Issue | Severity | Target Resolution |
| :--- | :--- | :--- | :--- |
| **Mobile Ergonomics** | Navigation controls concentrated at top-right, out of comfortable one-handed thumb reach on iPhone form factors. Missing safe area padding. | **High** | Introduce a bottom tab bar and action drawer for mobile with `env(safe-area-inset-bottom)` compliance, 44pt minimum touch targets, and sheet grabbers. |
| **Haptic Feedback** | No tactile confirmation when points are awarded, undone, or line calls triggered. | **Medium** | Integrate standard Web Vibration API (`navigator.vibrate`) with distinct tactile signatures: `light` (tap), `success` (winner), `warning` (out/fault), `medium` (undo). |
| **Desktop Workflows** | Missing quick action accelerator for desktop power users. | **Medium** | Implement macOS Spotlight-style Command Palette (`Cmd+K` / `Ctrl+K`) for switching cameras, launching drills, exporting reports, and triggering calibration. |
| **Motion Physics** | Static show/hide modals without natural deceleration curves. | **High** | Integrate Framer Motion with spring physics (`stiffness: 380, damping: 30`) for sheet presentations, backdrop fades, and score transitions. Respect `prefers-reduced-motion`. |
| **Keyboard Accessibility** | Incomplete keyboard focus rings; tab stops not managed in dialog overlays. | **High** | Implement accessible focus rings (`focus-visible:ring-2 focus-visible:ring-emerald-500`), dialog focus trapping, and ARIA 1.2 dialog semantics. |

---

## 3. Copywriting & Voice

| Area | Current Issue | Target Resolution |
| :--- | :--- | :--- |
| **Product Voice** | Gimmicky, hype-driven filler phrases ("Ice in the veins at 18-18+", "Deadly drop shot touch", "Welcome to SmashSense"). | Calm, analytical, professional sports diagnostic voice: "High error rate on frontcourt drops", "Strong win percentage in long rallies", "Place camera 2m behind baseline". |
| **Error Handling** | Generic alert boxes ("Camera access required: NotFoundError"). | Human-centered recovery instructions: "Camera Unavailable. SmashSense requires camera access to track player positions. Check browser permissions in your address bar." |

---

## 4. Computer Vision HUD & Tracking Polish

| Area | Current Issue | Target Resolution |
| :--- | :--- | :--- |
| **HUD Clutter** | Overlapping bounding box tags and visual noise over active player poses. | Minimalist court boundary overlay with subtle 1px stroke, refined player pill tags, and unobtrusive tracking confidence indicator. |
| **Shuttle Smoothing** | Rapid speed fluctuations during extreme motion blur. | Enhanced Kalman filter state covariance with outlier rejection for false-positive white background reflections. |
| **Court Calibration Loupe** | Hard to tap exact 4-court corners on mobile touchscreens without finger obscuring the pin. | Interactive magnification loupe (2.5x zoom window) positioned above the touch point when dragging calibration corner pins. |

---

## 5. Architectural Quality & Polish Plan
1. **Design Tokens (`src/design/tokens.ts`)**: Unified semantic colors, radii, materials, typographic scale, and spacing.
2. **Interaction Utilities (`src/utils/haptics.ts`, `src/hooks/useKeyboardShortcuts.ts`)**.
3. **Command Palette (`src/ui/CommandPalette.tsx`)**: Global macOS-style quick launcher.
4. **Magnification Loupe Calibration (`src/ui/CalibrationOverlay.tsx`)**.
5. **Scoreboard & HUD Refresh (`src/ui/TopBar.tsx`, `src/ui/ScoreboardOverlay.tsx`, `src/ui/LiveCameraView.tsx`)**.
6. **Design System Showcase Page (`src/ui/DesignSystemShowcase.tsx`)**.
7. **Exhaustive Automated Verification**: Vitest unit test suite, TypeScript strict compliance, Vite PWA build.
