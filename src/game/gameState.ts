import { create } from 'zustand';
import { Point2D } from '../court/courtGeometry';
import { Matrix3x3, computeCourtCalibration } from '../court/homography';
import { TrackedPlayer, PlayerRole } from '../tracking/byteTrack';
import { ShuttlecockTrack } from '../tracking/shuttlecockTracker';
import { CameraResolution } from '../camera/cameraManager';
import { BwfScoringEngine, GameStateSnapshot, ScoreAuditEntry, Team } from './scoringEngine';
import { RallyStateMachine, CompletedRally, RallyState } from './rallyStateMachine';
import { PlayerActionEvent } from '../detection/motionClassifier';
import { LineCallEvaluation } from '../court/lineCallEngine';

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
  scoringEngine: BwfScoringEngine;
  rallyStateMachine: RallyStateMachine;
  snapshot: GameStateSnapshot;
  auditLog: ReadonlyArray<ScoreAuditEntry>;
  completedGames: ReadonlyArray<{ gameIndex: number; scoreA: number; scoreB: number; winner: Team }>;

  // Live rally & Action state
  rallyState: RallyState;
  currentShotCount: number;
  recentPlayerActions: PlayerActionEvent[];
  completedRallies: CompletedRally[];
  allPlayerActions: PlayerActionEvent[];
  activeLandingCall: {
    call: LineCallEvaluation;
    pointType?: 'WINNER' | 'UNFORCED_ERROR' | 'FORCED_ERROR';
    endingStroke?: any;
    maxSpeedKmh?: number;
    winningTeam?: Team;
  } | null;
  lastLandingPoint: Point2D | null;

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
  isStatsModalOpen: boolean;
  isLiveStatsDrawerOpen: boolean;

  // Actions
  updateConfig: (config: Partial<MatchConfig>) => void;
  awardPoint: (team: Team, reason?: string) => void;
  undoScore: () => void;
  redoScore: () => void;
  manualScoreCorrection: (scoreA: number, scoreB: number, reason: string) => void;
  startNextGame: () => void;
  dismissLandingCall: () => void;

  setCalibrationCorners: (corners: Point2D[], venueName?: string) => void;
  setLiveDetections: (players: TrackedPlayer[], shuttle: ShuttlecockTrack | null) => void;
  setFpsStats: (renderFps: number, inferenceFps: number, latencyMs: number) => void;
  setCameraSettings: (settings: { facingMode?: 'user' | 'environment'; resolution?: CameraResolution; selectedCameraId?: string }) => void;
  setWakeLocked: (locked: boolean) => void;
  setCalibrationMode: (active: boolean) => void;
  setSetupWizardOpen: (open: boolean) => void;
  setSimulationMode: (sim: boolean) => void;
  setStatsModalOpen: (open: boolean) => void;
  setLiveStatsDrawerOpen: (open: boolean) => void;
  toggleStatsModal: () => void;
  toggleLiveStatsDrawer: () => void;
  toggleMiniCourt: () => void;
  toggleCourtOverlay: () => void;
  toggleSkeleton: () => void;
  toggleShuttleTrail: () => void;
  handleCompletedRally: (rally: CompletedRally) => void;
  addPlayerAction: (action: PlayerActionEvent) => void;
}

// Initial default calibration
const initialScreenCorners: Point2D[] = [
  { x: 380, y: 120 }, // TL
  { x: 900, y: 120 }, // TR
  { x: 1140, y: 640 }, // BR
  { x: 140, y: 640 }, // BL
];
const initialCalibration = computeCourtCalibration(initialScreenCorners);

const initialConfig: MatchConfig = {
  format: 'singles',
  teamANames: { A1: 'Viktor Axelsen' },
  teamBNames: { B1: 'Lee Zii Jia' },
  firstServer: 'A1',
  cameraPosition: 'behind_baseline',
};

const initialScoringEngine = new BwfScoringEngine({
  format: initialConfig.format,
  teamANames: initialConfig.teamANames,
  teamBNames: initialConfig.teamBNames,
  initialServer: initialConfig.firstServer,
});

const initialRallyStateMachine = new RallyStateMachine(initialScoringEngine);

export const useSmashSenseStore = create<SmashSenseState>((set, get) => ({
  config: initialConfig,
  scoringEngine: initialScoringEngine,
  rallyStateMachine: initialRallyStateMachine,
  snapshot: initialScoringEngine.getSnapshot(),
  auditLog: initialScoringEngine.getAuditLog(),
  completedGames: initialScoringEngine.getCompletedGames(),

  rallyState: 'IDLE',
  currentShotCount: 0,
  recentPlayerActions: [],
  activeLandingCall: null,
  lastLandingPoint: null,

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

  completedRallies: [],
  allPlayerActions: [],
  isSetupWizardOpen: false,
  isCalibrationMode: false,
  showMiniCourt: true,
  showCourtOverlay: true,
  showSkeleton: true,
  showShuttleTrail: true,
  isSimulationMode: false,
  isStatsModalOpen: false,
  isLiveStatsDrawerOpen: false,

  updateConfig: (newConfig) => {
    const updated = { ...get().config, ...newConfig };
    const newEngine = new BwfScoringEngine({
      format: updated.format,
      teamANames: updated.teamANames,
      teamBNames: updated.teamBNames,
      initialServer: updated.firstServer,
    });
    const newRallySM = new RallyStateMachine(newEngine);

    set({
      config: updated,
      scoringEngine: newEngine,
      rallyStateMachine: newRallySM,
      snapshot: newEngine.getSnapshot(),
      auditLog: newEngine.getAuditLog(),
      completedGames: newEngine.getCompletedGames(),
      recentPlayerActions: [],
      activeLandingCall: null,
    });
  },

  awardPoint: (team, reason = 'Point scored') => {
    const engine = get().scoringEngine;
    engine.awardPoint(team, { reason, isAutoCall: false });
    set({
      snapshot: engine.getSnapshot(),
      auditLog: engine.getAuditLog(),
      completedGames: engine.getCompletedGames(),
    });
  },

  undoScore: () => {
    const engine = get().scoringEngine;
    engine.undo();
    set({
      snapshot: engine.getSnapshot(),
      auditLog: engine.getAuditLog(),
      completedGames: engine.getCompletedGames(),
    });
  },

  redoScore: () => {
    const engine = get().scoringEngine;
    engine.redo();
    set({
      snapshot: engine.getSnapshot(),
      auditLog: engine.getAuditLog(),
      completedGames: engine.getCompletedGames(),
    });
  },

  manualScoreCorrection: (scoreA, scoreB, reason) => {
    const engine = get().scoringEngine;
    engine.manualScoreCorrection(scoreA, scoreB, reason);
    set({
      snapshot: engine.getSnapshot(),
      auditLog: engine.getAuditLog(),
      completedGames: engine.getCompletedGames(),
    });
  },

  startNextGame: () => {
    const engine = get().scoringEngine;
    engine.startNextGame();
    set({
      snapshot: engine.getSnapshot(),
      auditLog: engine.getAuditLog(),
      completedGames: engine.getCompletedGames(),
      activeLandingCall: null,
    });
  },

  dismissLandingCall: () => set({ activeLandingCall: null }),

  handleCompletedRally: (rally: CompletedRally) => {
    const engine = get().scoringEngine;
    set((state) => ({
      snapshot: engine.getSnapshot(),
      auditLog: engine.getAuditLog(),
      completedGames: engine.getCompletedGames(),
      completedRallies: [...state.completedRallies, rally],
      allPlayerActions: [...state.allPlayerActions, ...rally.actions],
      activeLandingCall: {
        call: rally.lineCall,
        pointType: rally.pointType,
        endingStroke: rally.endingStroke,
        maxSpeedKmh: rally.maxSpeedKmh,
        winningTeam: rally.winningTeam,
      },
      lastLandingPoint: rally.lineCall.landingCourt,
    }));
  },

  addPlayerAction: (action) => {
    set((state) => {
      const updated = [...state.recentPlayerActions, action];
      if (updated.length > 25) updated.shift();
      return {
        recentPlayerActions: updated,
        allPlayerActions: [...state.allPlayerActions, action],
      };
    });
  },

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

  setStatsModalOpen: (open) => set({ isStatsModalOpen: open }),

  setLiveStatsDrawerOpen: (open) => set({ isLiveStatsDrawerOpen: open }),

  toggleStatsModal: () => set((state) => ({ isStatsModalOpen: !state.isStatsModalOpen })),

  toggleLiveStatsDrawer: () => set((state) => ({ isLiveStatsDrawerOpen: !state.isLiveStatsDrawerOpen })),

  toggleMiniCourt: () =>
    set((state) => ({ showMiniCourt: !state.showMiniCourt })),

  toggleCourtOverlay: () =>
    set((state) => ({ showCourtOverlay: !state.showCourtOverlay })),

  toggleSkeleton: () =>
    set((state) => ({ showSkeleton: !state.showSkeleton })),

  toggleShuttleTrail: () =>
    set((state) => ({ showShuttleTrail: !state.showShuttleTrail })),
}));
