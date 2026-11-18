import React, { useState } from 'react';
import { useSmashSenseStore } from '../game/gameState';
import { CameraResolution, RESOLUTION_PRESETS } from '../camera/cameraManager';
import { ScoreboardOverlay } from './ScoreboardOverlay';
import { speechService } from '../voice/speechService';
import { Language } from '../i18n/translations';
import {
  RefreshCw,
  Sun,
  Moon,
  Crosshair,
  Settings,
  Radar,
  Activity,
  Sparkles,
  Zap,
  BarChart2,
  Trophy,
  Target,
  Tv,
  AlertTriangle,
  Users,
  Mic,
  MicOff,
  ShieldCheck,
  BatteryCharging,
  Battery,
  HelpCircle,
} from 'lucide-react';

interface TopBarProps {
  onSwitchCamera: () => void;
  onSelectResolution: (res: CameraResolution) => void;
  onToggleWakeLock: () => void;
  wakeLockActive: boolean;
  wakeLockSupported: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onSwitchCamera,
  onSelectResolution,
  onToggleWakeLock,
  wakeLockActive,
  wakeLockSupported,
}) => {
  const resolution = useSmashSenseStore((s) => s.resolution);
  const facingMode = useSmashSenseStore((s) => s.facingMode);
  const renderFps = useSmashSenseStore((s) => s.renderFps);
  const inferenceFps = useSmashSenseStore((s) => s.inferenceFps);
  const latencyMs = useSmashSenseStore((s) => s.latencyMs);

  const isCalibrationMode = useSmashSenseStore((s) => s.isCalibrationMode);
  const setCalibrationMode = useSmashSenseStore((s) => s.setCalibrationMode);
  const setSetupWizardOpen = useSmashSenseStore((s) => s.setSetupWizardOpen);
  const showMiniCourt = useSmashSenseStore((s) => s.showMiniCourt);
  const toggleMiniCourt = useSmashSenseStore((s) => s.toggleMiniCourt);
  const isSimulationMode = useSmashSenseStore((s) => s.isSimulationMode);
  const setSimulationMode = useSmashSenseStore((s) => s.setSimulationMode);
  const setStatsModalOpen = useSmashSenseStore((s) => s.setStatsModalOpen);
  const isLiveStatsDrawerOpen = useSmashSenseStore((s) => s.isLiveStatsDrawerOpen);
  const toggleLiveStatsDrawer = useSmashSenseStore((s) => s.toggleLiveStatsDrawer);

  const setTrainingModalOpen = useSmashSenseStore((s) => s.setTrainingModalOpen);
  const setLargeScoreboardOpen = useSmashSenseStore((s) => s.setLargeScoreboardOpen);
  const setFlaggedCallsModalOpen = useSmashSenseStore((s) => s.setFlaggedCallsModalOpen);
  const setProfilesModalOpen = useSmashSenseStore((s) => s.setProfilesModalOpen);
  const setPrivacyModalOpen = useSmashSenseStore((s) => s.setPrivacyModalOpen);
  const setOnboardingOpen = useSmashSenseStore((s) => s.setOnboardingOpen);
  const isLowPowerMode = useSmashSenseStore((s) => s.isLowPowerMode);
  const toggleLowPowerMode = useSmashSenseStore((s) => s.toggleLowPowerMode);
  const language = useSmashSenseStore((s) => s.language);
  const setLanguage = useSmashSenseStore((s) => s.setLanguage);
  const awardPoint = useSmashSenseStore((s) => s.awardPoint);

  const [isVoiceListening, setIsVoiceListening] = useState(false);

  const toggleVoiceCommands = () => {
    if (isVoiceListening) {
      speechService.stopListening();
      setIsVoiceListening(false);
    } else {
      speechService.startListening((cmd) => {
        if (cmd === 'START') setSimulationMode(true);
        else if (cmd === 'STOP') setSimulationMode(false);
        else if (cmd === 'UNDO') undoScore();
        else if (cmd === 'REDO') redoScore();
        else if (cmd === 'NEXT_GAME') startNextGame();
        else if (cmd === 'POINT_A') awardPoint('A', 'Voice command');
        else if (cmd === 'POINT_B') awardPoint('B', 'Voice command');
        else if (cmd === 'SCORE') {
          const isDeuce = snapshot.scoreA >= 20 && snapshot.scoreB >= 20 && snapshot.scoreA === snapshot.scoreB;
          const isGamePt = (snapshot.scoreA >= 20 || snapshot.scoreB >= 20) && Math.abs(snapshot.scoreA - snapshot.scoreB) >= 1;
          const isMatchPt = isGamePt && ((snapshot.gamesWonA === 1 && snapshot.scoreA >= 20) || (snapshot.gamesWonB === 1 && snapshot.scoreB >= 20));
          speechService.announceScore(
            snapshot.scoreA,
            snapshot.scoreB,
            snapshot.servingSide,
            isDeuce,
            isGamePt,
            isMatchPt
          );
        }
      });
      setIsVoiceListening(true);
    }
  };

  const snapshot = useSmashSenseStore((s) => s.snapshot);
  const auditLog = useSmashSenseStore((s) => s.auditLog);
  const completedGames = useSmashSenseStore((s) => s.completedGames);
  const config = useSmashSenseStore((s) => s.config);
  const undoScore = useSmashSenseStore((s) => s.undoScore);
  const redoScore = useSmashSenseStore((s) => s.redoScore);
  const manualScoreCorrection = useSmashSenseStore((s) => s.manualScoreCorrection);
  const startNextGame = useSmashSenseStore((s) => s.startNextGame);

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-3 py-2 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between text-slate-200 select-none">
      {/* Left: Brand & Performance HUD */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-base shadow-sm">
            🏸
          </div>
          <div className="hidden xl:block">
            <h1 className="text-sm font-black tracking-wide text-white flex items-center gap-1">
              SmashSense
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                LIVE
              </span>
            </h1>
            <p className="text-[9px] text-slate-400">Client-Side AI • Zero Video Uploaded</p>
          </div>
        </div>

        {/* FPS & Latency Meter */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono">
          <div className="flex items-center gap-1" title="Camera Render FPS">
            <Activity size={12} className="text-emerald-400" />
            <span className="text-emerald-300 font-bold">{renderFps || 30}</span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">fps</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1" title="Worker Inference FPS">
            <Zap size={12} className="text-yellow-400" />
            <span className="text-yellow-300 font-bold">{inferenceFps || 24}</span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">inf</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="text-[11px] text-slate-400" title="Worker Detection Latency">
            <span>{latencyMs || 18}ms</span>
          </div>
        </div>
      </div>

      {/* Center: Live BWF Match Scoreboard with Undo/Redo & Audit */}
      <div className="flex items-center justify-center">
        <ScoreboardOverlay
          snapshot={snapshot}
          auditLog={auditLog}
          completedGames={completedGames}
          teamAName={config.teamANames.A1}
          teamBName={config.teamBNames.B1}
          onUndo={undoScore}
          onRedo={redoScore}
          onManualScoreCorrection={manualScoreCorrection}
          onStartNextGame={startNextGame}
        />
      </div>

      {/* Right: Controls & Toggles */}
      <div className="flex items-center gap-1.5">
        {/* Simulation Mode Toggle (demo match) */}
        <button
          onClick={() => setSimulationMode(!isSimulationMode)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
            isSimulationMode
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          title="Toggle Simulation Rally mode"
        >
          <Sparkles size={13} className={isSimulationMode ? 'animate-spin' : ''} />
          <span className="hidden lg:inline">{isSimulationMode ? 'Sim Active' : 'Sim Match'}</span>
        </button>

        {/* Court Calibration Toggle */}
        <button
          onClick={() => setCalibrationMode(!isCalibrationMode)}
          className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
            isCalibrationMode
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          title="Calibrate Court Corners"
        >
          <Crosshair size={15} />
          <span className="hidden xl:inline">Calibrate</span>
        </button>

        {/* Resolution Selector */}
        <select
          value={resolution}
          onChange={(e) => onSelectResolution(e.target.value as CameraResolution)}
          className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none hidden sm:block"
          title="Camera Resolution"
        >
          {(Object.keys(RESOLUTION_PRESETS) as CameraResolution[]).map((res) => (
            <option key={res} value={res}>
              {res}
            </option>
          ))}
        </select>

        {/* Front / Back Camera Switch */}
        <button
          onClick={onSwitchCamera}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          title={`Switch camera (current: ${facingMode})`}
        >
          <RefreshCw size={15} />
        </button>

        {/* Wake Lock Screen On/Off */}
        {wakeLockSupported && (
          <button
            onClick={onToggleWakeLock}
            className={`p-2 rounded-lg transition-all ${
              wakeLockActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title={wakeLockActive ? 'Screen Wake Lock ON (Screen will not sleep)' : 'Screen Wake Lock OFF'}
          >
            {wakeLockActive ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}

        {/* Mini Court Toggle */}
        <button
          onClick={toggleMiniCourt}
          className={`p-2 rounded-lg transition-all ${
            showMiniCourt
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title="Toggle 2D Radar Mini-Court"
        >
          <Radar size={15} />
        </button>

        {/* Live Stats Drawer Toggle */}
        <button
          onClick={toggleLiveStatsDrawer}
          className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
            isLiveStatsDrawerOpen
              ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          title="Toggle Live Match Stats Drawer"
        >
          <BarChart2 size={15} />
          <span className="hidden xl:inline text-xs">Live Stats</span>
        </button>

        {/* Full Post-Match Analytics Dashboard Modal */}
        <button
          onClick={() => setStatsModalOpen(true)}
          className="p-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white transition-all flex items-center gap-1 shadow-sm"
          title="Open Post-Match Analytics & Report"
        >
          <Trophy size={15} />
          <span className="hidden xl:inline text-xs font-semibold">Report</span>
        </button>

        {/* Training Mode Modal */}
        <button
          onClick={() => setTrainingModalOpen(true)}
          className="p-2 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-300 transition-all flex items-center gap-1"
          title="Solo Training & Drills"
        >
          <Target size={15} />
          <span className="hidden xl:inline text-xs font-semibold">Drills</span>
        </button>

        {/* Jumbo Scoreboard Mode */}
        <button
          onClick={() => setLargeScoreboardOpen(true)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
          title="Jumbo Court Scoreboard (View from distance)"
        >
          <Tv size={15} />
        </button>

        {/* Flagged Line Calls Review */}
        <button
          onClick={() => setFlaggedCallsModalOpen(true)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition-all"
          title="Review Flagged / Low-Confidence Calls"
        >
          <AlertTriangle size={15} />
        </button>

        {/* Player Profiles & History */}
        <button
          onClick={() => setProfilesModalOpen(true)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 transition-all"
          title="Player Profiles & Head-to-Head Records"
        >
          <Users size={15} />
        </button>

        {/* Hands-Free Voice Commands Toggle */}
        <button
          onClick={toggleVoiceCommands}
          className={`p-2 rounded-lg transition-all ${
            isVoiceListening
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 animate-pulse'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title={isVoiceListening ? 'Voice Commands Active ("Start", "Undo", "Point A")' : 'Enable Hands-Free Voice Commands'}
        >
          {isVoiceListening ? <Mic size={15} /> : <MicOff size={15} />}
        </button>

        {/* Low Power Mode Toggle */}
        <button
          onClick={toggleLowPowerMode}
          className={`p-2 rounded-lg transition-all ${
            isLowPowerMode
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title={isLowPowerMode ? 'Low Power Mode ON (Throttled inference)' : 'Low Power Mode OFF'}
        >
          {isLowPowerMode ? <BatteryCharging size={15} /> : <Battery size={15} />}
        </button>

        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none hidden sm:block font-mono"
          title="Select UI Language"
        >
          <option value="en">EN</option>
          <option value="zh">中文</option>
          <option value="ja">日本語</option>
          <option value="id">ID</option>
          <option value="es">ES</option>
          <option value="fr">FR</option>
        </select>

        {/* Onboarding Help */}
        <button
          onClick={() => setOnboardingOpen(true)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          title="Quickstart Guide & Tutorial"
        >
          <HelpCircle size={15} />
        </button>

        {/* Privacy Modal Guarantee */}
        <button
          onClick={() => setPrivacyModalOpen(true)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400"
          title="Privacy Guarantee (Zero Video Uploaded)"
        >
          <ShieldCheck size={15} />
        </button>

        {/* Setup Wizard */}
        <button
          onClick={() => setSetupWizardOpen(true)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          title="Open Match Setup Wizard"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
