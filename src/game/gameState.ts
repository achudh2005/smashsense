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
import { accuracyManager } from '../court/accuracyManager';
import { speechService } from '../voice/speechService';
import { Language } from '../i18n/translations';
import { DetailedMatchEvent, createDetailedMatchEvent } from '../tactical/matchEventModel';
import { isCoachIntervalTrigger } from '../tactical/tacticalSuggestionEngine';
import { db } from '../storage/db';

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
  detailedMatchEvents: DetailedMatchEvent[];
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

  // Auto-detection telemetry
  isAutoDetectEnabled: boolean;
  autoCourtStatus: 'SCANNING' | 'ACQUIRED' | 'LOCKED' | 'FALLBACK';
  autoCourtConfidence: number;
  autoCourtMessage: string;
  identifiedPlayersCount: number;

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
  isTrainingModalOpen: boolean;
  isLargeScoreboardOpen: boolean;
  isFlaggedCallsModalOpen: boolean;
  isProfilesModalOpen: boolean;
  isPrivacyModalOpen: boolean;
  isOnboardingOpen: boolean;
  isTacticalCoachOpen: boolean;
  isLowPowerMode: boolean;
  language: Language;

  // Actions
  updateConfig: (config: Partial<MatchConfig>) => void;
  awardPoint: (team: Team, reason?: string) => void;
  undoScore: () => void;
  redoScore: () => void;
  manualScoreCorrection: (scoreA: number, scoreB: number, reason: string) => void;
  startNextGame: () => void;
  dismissLandingCall: () => void;

  setCalibrationCorners: (corners: Point2D[], venueName?: string) => void;
  setAutoDetectEnabled: (enabled: boolean) => void;
  setAutoCourtState: (state: { status: 'SCANNING' | 'ACQUIRED' | 'LOCKED' | 'FALLBACK'; confidence: number; message: string; corners?: Point2D[] }) => void;
  setIdentifiedPlayersCount: (count: number) => void;
  setLiveDetections: (players: TrackedPlayer[], shuttle: ShuttlecockTrack | null) => void;
  setFpsStats: (renderFps: number, inferenceFps: number, latencyMs: number) => void;
  setCameraSettings: (settings: { facingMode?: 'user' | 'environment'; resolution?: CameraResolution; selectedCameraId?: string }) => void;
  setWakeLocked: (locked: boolean) => void;
  setCalibrationMode: (active: boolean) => void;
  setSetupWizardOpen: (open: boolean) => void;
  setSimulationMode: (sim: boolean) => void;
  setStatsModalOpen: (open: boolean) => void;
  setLiveStatsDrawerOpen: (open: boolean) => void;
  setTrainingModalOpen: (open: boolean) => void;
  setLargeScoreboardOpen: (open: boolean) => void;
  setFlaggedCallsModalOpen: (open: boolean) => void;
  setProfilesModalOpen: (open: boolean) => void;
  setPrivacyModalOpen: (open: boolean) => void;
  setOnboardingOpen: (open: boolean) => void;
  setTacticalCoachOpen: (open: boolean) => void;
  toggleTacticalCoach: () => void;
  setLowPowerMode: (low: boolean) => void;
  setLanguage: (lang: Language) => void;
  toggleStatsModal: () => void;
  toggleLiveStatsDrawer: () => void;
  toggleTrainingModal: () => void;
  toggleLargeScoreboard: () => void;
  toggleFlaggedCallsModal: () => void;
  toggleProfilesModal: () => void;
  togglePrivacyModal: () => void;
  toggleOnboarding: () => void;
  toggleLowPowerMode: () => void;
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

  isAutoDetectEnabled: true,
  autoCourtStatus: 'SCANNING',
  autoCourtConfidence: 0,
  autoCourtMessage: 'Scanning for court...',
  identifiedPlayersCount: 0,

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
  detailedMatchEvents: [],
  isSetupWizardOpen: false,
  isCalibrationMode: false,
  showMiniCourt: true,
  showCourtOverlay: true,
  showSkeleton: true,
  showShuttleTrail: true,
  isSimulationMode: false,
  isStatsModalOpen: false,
  isLiveStatsDrawerOpen: false,
  isTrainingModalOpen: false,
  isLargeScoreboardOpen: false,
  isFlaggedCallsModalOpen: false,
  isProfilesModalOpen: false,
  isPrivacyModalOpen: false,
  isOnboardingOpen: false,
  isTacticalCoachOpen: false,
  isLowPowerMode: false,
  language: 'en',

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
    const snap = engine.getSnapshot();
    const config = get().config;

    const isDeuce = snap.scoreA >= 20 && snap.scoreB >= 20 && snap.scoreA === snap.scoreB;
    const isGamePt = (snap.scoreA >= 20 || snap.scoreB >= 20) && Math.abs(snap.scoreA - snap.scoreB) >= 1;
    const isMatchPt = isGamePt && ((snap.gamesWonA === 1 && snap.scoreA >= 20) || (snap.gamesWonB === 1 && snap.scoreB >= 20));
    const winnerName = snap.isGameOver ? (snap.matchWinner === 'A' || snap.scoreA > snap.scoreB ? config.teamANames.A1 : config.teamBNames.B1) : undefined;

    speechService.announceScore(
      snap.scoreA,
      snap.scoreB,
      snap.servingSide,
      isDeuce,
      isGamePt,
      isMatchPt,
      winnerName
    );

    set({
      snapshot: snap,
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
    const snap = engine.getSnapshot();
    const config = get().config;

    // Accuracy tooling: flag uncertain calls
    if (accuracyManager.shouldFlagCall(rally.lineCall)) {
      accuracyManager.logFlaggedCall(rally.lineCall, rally.rallyNumber, rally.gameIndex);
    }

    // Voice announcement
    speechService.announceCall(rally.lineCall.call);
    const isDeuce = snap.scoreA >= 20 && snap.scoreB >= 20 && snap.scoreA === snap.scoreB;
    const isGamePt = (snap.scoreA >= 20 || snap.scoreB >= 20) && Math.abs(snap.scoreA - snap.scoreB) >= 1;
    const isMatchPt = isGamePt && ((snap.gamesWonA === 1 && snap.scoreA >= 20) || (snap.gamesWonB === 1 && snap.scoreB >= 20));
    const winnerName = snap.isGameOver ? (snap.matchWinner === 'A' || snap.scoreA > snap.scoreB ? config.teamANames.A1 : config.teamBNames.B1) : undefined;

    speechService.announceScore(
      snap.scoreA,
      snap.scoreB,
      snap.servingSide,
      isDeuce,
      isGamePt,
      isMatchPt,
      winnerName
    );

    // Build detailed match event for tactical AI
    const playerNamesMap: Record<PlayerRole, string> = {
      A1: config.teamANames.A1,
      A2: config.teamANames.A2 || 'Partner A',
      B1: config.teamBNames.B1,
      B2: config.teamBNames.B2 || 'Partner B',
    };
    const detailedEvent = createDetailedMatchEvent(rally, snap, playerNamesMap);
    db.detailedEvents.add(detailedEvent).catch(console.warn);

    const isIntervalTrigger = isCoachIntervalTrigger(snap);

    set((state) => ({
      snapshot: snap,
      auditLog: engine.getAuditLog(),
      completedGames: engine.getCompletedGames(),
      completedRallies: [...state.completedRallies, rally],
      allPlayerActions: [...state.allPlayerActions, ...rally.actions],
      detailedMatchEvents: [...state.detailedMatchEvents, detailedEvent],
      isTacticalCoachOpen: isIntervalTrigger ? true : state.isTacticalCoachOpen,
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

  setAutoDetectEnabled: (enabled) => set({ isAutoDetectEnabled: enabled }),

  setAutoCourtState: ({ status, confidence, message, corners }) => {
    const updates: Partial<SmashSenseState> = {
      autoCourtStatus: status,
      autoCourtConfidence: confidence,
      autoCourtMessage: message,
    };
    if (corners) {
      const { matrix, inverse } = computeCourtCalibration(corners);
      updates.screenCorners = corners;
      updates.courtToImageMatrix = matrix;
      updates.imageToCourtMatrix = inverse;
      updates.isCalibrated = true;
    }
    set(updates);
  },

  setIdentifiedPlayersCount: (count) => set({ identifiedPlayersCount: count }),

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

  setTrainingModalOpen: (open) => set({ isTrainingModalOpen: open }),

  setLargeScoreboardOpen: (open) => set({ isLargeScoreboardOpen: open }),

  setFlaggedCallsModalOpen: (open) => set({ isFlaggedCallsModalOpen: open }),

  setProfilesModalOpen: (open) => set({ isProfilesModalOpen: open }),

  setPrivacyModalOpen: (open) => set({ isPrivacyModalOpen: open }),

  setOnboardingOpen: (open) => set({ isOnboardingOpen: open }),

  setTacticalCoachOpen: (open) => set({ isTacticalCoachOpen: open }),

  toggleTacticalCoach: () => set((state) => ({ isTacticalCoachOpen: !state.isTacticalCoachOpen })),

  setLowPowerMode: (low) => set({ isLowPowerMode: low }),

  setLanguage: (lang) => set({ language: lang }),

  toggleStatsModal: () => set((state) => ({ isStatsModalOpen: !state.isStatsModalOpen })),

  toggleLiveStatsDrawer: () => set((state) => ({ isLiveStatsDrawerOpen: !state.isLiveStatsDrawerOpen })),

  toggleTrainingModal: () => set((state) => ({ isTrainingModalOpen: !state.isTrainingModalOpen })),

  toggleLargeScoreboard: () => set((state) => ({ isLargeScoreboardOpen: !state.isLargeScoreboardOpen })),

  toggleFlaggedCallsModal: () => set((state) => ({ isFlaggedCallsModalOpen: !state.isFlaggedCallsModalOpen })),

  toggleProfilesModal: () => set((state) => ({ isProfilesModalOpen: !state.isProfilesModalOpen })),

  togglePrivacyModal: () => set((state) => ({ isPrivacyModalOpen: !state.isPrivacyModalOpen })),

  toggleOnboarding: () => set((state) => ({ isOnboardingOpen: !state.isOnboardingOpen })),

  toggleLowPowerMode: () => set((state) => ({ isLowPowerMode: !state.isLowPowerMode })),

  toggleMiniCourt: () =>
    set((state) => ({ showMiniCourt: !state.showMiniCourt })),

  toggleCourtOverlay: () =>
    set((state) => ({ showCourtOverlay: !state.showCourtOverlay })),

  toggleSkeleton: () =>
    set((state) => ({ showSkeleton: !state.showSkeleton })),

  toggleShuttleTrail: () =>
    set((state) => ({ showShuttleTrail: !state.showShuttleTrail })),
}));
