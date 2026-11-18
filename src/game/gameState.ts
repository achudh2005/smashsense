import { create } from 'zustand';
import { Point2D } from '../court/courtGeometry';
import { Matrix3x3, computeCourtCalibration } from '../court/homography';
import { TrackedPlayer, PlayerRole } from '../tracking/byteTrack';
import { ShuttlecockTrack } from '../tracking/shuttlecockTracker';
import { CameraResolution } from '../camera/cameraManager';

export interface MatchConfig {
  format: 'singles' | 'doubles';
  teamANames: { A1: string; A2?: string };
  teamBNames: { B1: string; B2?: string };
  firstServer: PlayerRole;
  cameraPosition: 'behind_baseline' | 'elevated_side' | 'custom';
}

export interface SmashSenseState {
  // Game & Match config
  config: MatchConfig;
  scoreA: number;
  scoreB: number;
  currentServer: PlayerRole;
  currentReceiver: PlayerRole;
  isMatchActive: boolean;

  // Calibration state
  isCalibrated: boolean;
  activeVenueName: string;
  screenCorners: Point2D[];
  courtToImageMatrix: Matrix3x3;
  imageToCourtMatrix: Matrix3x3;

  // Camera & Stream settings
  facingMode: 'user' | 'environment';
  resolution: CameraResolution;
  selectedCameraId?: string;
  isWakeLocked: boolean;

  // Live real-time detections
  trackedPlayers: TrackedPlayer[];
  shuttleTrack: ShuttlecockTrack | null;
  renderFps: number;
  inferenceFps: number;
  latencyMs: number;

  // UI modal and overlay toggles
  isSetupWizardOpen: boolean;
  isCalibrationMode: boolean;
  showMiniCourt: boolean;
  showCourtOverlay: boolean;
  showSkeleton: boolean;
  showShuttleTrail: boolean;
  isSimulationMode: boolean;

  // Actions
  updateConfig: (config: Partial<MatchConfig>) => void;
  setScores: (scoreA: number, scoreB: number) => void;
  incrementScore: (team: 'A' | 'B') => void;
  resetScore: () => void;
  setCalibrationCorners: (corners: Point2D[], venueName?: string) => void;
  setLiveDetections: (players: TrackedPlayer[], shuttle: ShuttlecockTrack | null) => void;
  setFpsStats: (renderFps: number, inferenceFps: number, latencyMs: number) => void;
  setCameraSettings: (settings: { facingMode?: 'user' | 'environment'; resolution?: CameraResolution; selectedCameraId?: string }) => void;
  setWakeLocked: (locked: boolean) => void;
  setCalibrationMode: (active: boolean) => void;
  setSetupWizardOpen: (open: boolean) => void;
  setSimulationMode: (sim: boolean) => void;
  toggleMiniCourt: () => void;
  toggleCourtOverlay: () => void;
  toggleSkeleton: () => void;
  toggleShuttleTrail: () => void;
}

// Default initial calibration (elevated perspective)
const initialScreenCorners: Point2D[] = [
  { x: 380, y: 120 }, // TL
  { x: 900, y: 120 }, // TR
  { x: 1140, y: 640 }, // BR
  { x: 140, y: 640 }, // BL
];
const initialCalibration = computeCourtCalibration(initialScreenCorners);

export const useSmashSenseStore = create<SmashSenseState>((set, get) => ({
  config: {
    format: 'singles',
    teamANames: { A1: 'Player A1' },
    teamBNames: { B1: 'Player B1' },
    firstServer: 'A1',
    cameraPosition: 'behind_baseline',
  },
  scoreA: 0,
  scoreB: 0,
  currentServer: 'A1',
  currentReceiver: 'B1',
  isMatchActive: true,

  isCalibrated: true,
  activeVenueName: 'Default Court Preset',
  screenCorners: initialScreenCorners,
  courtToImageMatrix: initialCalibration.matrix,
  imageToCourtMatrix: initialCalibration.inverse,

  facingMode: 'environment',
  resolution: '720p',
  isWakeLocked: false,

  trackedPlayers: [],
  shuttleTrack: null,
  renderFps: 0,
  inferenceFps: 0,
  latencyMs: 0,

  isSetupWizardOpen: false,
  isCalibrationMode: false,
  showMiniCourt: true,
  showCourtOverlay: true,
  showSkeleton: true,
  showShuttleTrail: true,
  isSimulationMode: false,

  updateConfig: (newConfig) =>
    set((state) => ({ config: { ...state.config, ...newConfig } })),

  setScores: (scoreA, scoreB) => set({ scoreA, scoreB }),

  incrementScore: (team) => {
    const { scoreA, scoreB } = get();
    const newA = team === 'A' ? scoreA + 1 : scoreA;
    const newB = team === 'B' ? scoreB + 1 : scoreB;

    // Determine next server according to BWF rules
    // In singles, even score serves from right court, odd from left court
    const isTeamAServing = team === 'A';
    const serverRole: PlayerRole = isTeamAServing ? 'A1' : 'B1';
    const receiverRole: PlayerRole = isTeamAServing ? 'B1' : 'A1';

    set({
      scoreA: newA,
      scoreB: newB,
      currentServer: serverRole,
      currentReceiver: receiverRole,
    });
  },

  resetScore: () => set({ scoreA: 0, scoreB: 0 }),

  setCalibrationCorners: (corners, venueName) => {
    const { matrix, inverse } = computeCourtCalibration(corners);
    set({
      screenCorners: corners,
      courtToImageMatrix: matrix,
      imageToCourtMatrix: inverse,
      isCalibrated: true,
      activeVenueName: venueName || get().activeVenueName,
    });
  },

  setLiveDetections: (players, shuttle) =>
    set({ trackedPlayers: players, shuttleTrack: shuttle }),

  setFpsStats: (renderFps, inferenceFps, latencyMs) =>
    set({ renderFps, inferenceFps, latencyMs }),

  setCameraSettings: (settings) =>
    set((state) => ({ ...state, ...settings })),

  setWakeLocked: (locked) => set({ isWakeLocked: locked }),

  setCalibrationMode: (active) => set({ isCalibrationMode: active }),

  setSetupWizardOpen: (open) => set({ isSetupWizardOpen: open }),

  setSimulationMode: (sim) => set({ isSimulationMode: sim }),

  toggleMiniCourt: () =>
    set((state) => ({ showMiniCourt: !state.showMiniCourt })),

  toggleCourtOverlay: () =>
    set((state) => ({ showCourtOverlay: !state.showCourtOverlay })),

  toggleSkeleton: () =>
    set((state) => ({ showSkeleton: !state.showSkeleton })),

  toggleShuttleTrail: () =>
    set((state) => ({ showShuttleTrail: !state.showShuttleTrail })),
}));
