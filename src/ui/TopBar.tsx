import React, { useState, useEffect } from 'react';
import { useSmashSenseStore } from '../game/gameState';
import { CameraResolution, RESOLUTION_PRESETS } from '../camera/cameraManager';
import { ScoreboardOverlay } from './ScoreboardOverlay';
import { CommandPalette } from './CommandPalette';
import { BrandLogo } from './BrandLogo';
import { speechService } from '../voice/speechService';
import { Language } from '../i18n/translations';
import { triggerHaptic } from '../utils/haptics';
import {
  RefreshCw,
  Sun,
  Moon,
  Crosshair,
  Settings,
  Radar,
  Activity,
  Zap,
  BarChart2,
  Trophy,
  Target,
  Tv,
  AlertTriangle,
  Users,
  Mic,
  MicOff,
  BatteryCharging,
  Battery,
  HelpCircle,
  Command,
  ShieldCheck,
  Scan,
  Sparkles,
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
  const isAutoDetectEnabled = useSmashSenseStore((s) => s.isAutoDetectEnabled);
  const setAutoDetectEnabled = useSmashSenseStore((s) => s.setAutoDetectEnabled);
  const setSetupWizardOpen = useSmashSenseStore((s) => s.setSetupWizardOpen);
  const showMiniCourt = useSmashSenseStore((s) => s.showMiniCourt);
  const toggleMiniCourt = useSmashSenseStore((s) => s.toggleMiniCourt);
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
  const isTacticalCoachOpen = useSmashSenseStore((s) => s.isTacticalCoachOpen);
  const toggleTacticalCoach = useSmashSenseStore((s) => s.toggleTacticalCoach);
  const isLowPowerMode = useSmashSenseStore((s) => s.isLowPowerMode);
  const toggleLowPowerMode = useSmashSenseStore((s) => s.toggleLowPowerMode);
  const language = useSmashSenseStore((s) => s.language);
  const setLanguage = useSmashSenseStore((s) => s.setLanguage);
  const awardPoint = useSmashSenseStore((s) => s.awardPoint);

  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);

  // Global keyboard shortcut for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleVoiceCommands = () => {
    triggerHaptic('medium');
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
    <>
      <header className="absolute top-0 left-0 right-0 z-30 px-3 py-2 bg-slate-950/80 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between text-slate-200 select-none shadow-md">
        {/* Left: Brand & Performance Telemetry */}
        <div className="flex items-center gap-3">
          <BrandLogo size={28} showText={true} />

          {/* FPS & Latency Metric Capsule */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono tabular-nums">
            <div className="flex items-center gap-1" title="Camera Render Frame Rate">
              <Activity size={12} className="text-emerald-400" />
              <span className="text-emerald-300 font-bold">{renderFps || 30}</span>
              <span className="text-[10px] text-slate-400">fps</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1" title="Worker Neural Inference Rate">
              <Zap size={12} className="text-amber-400" />
              <span className="text-amber-300 font-bold">{inferenceFps || 24}</span>
              <span className="text-[10px] text-slate-400">inf</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="text-[11px] text-slate-400" title="Worker Processing Latency">
              <span>{latencyMs || 18}ms</span>
            </div>
          </div>
        </div>

        {/* Center: Live BWF Scoreboard Pill */}
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

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Command Palette Trigger Pill */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsCmdPaletteOpen(true);
            }}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-colors shadow-sm"
            title="Search Actions (⌘K)"
          >
            <Command size={13} className="text-slate-400" />
            <span className="text-xs font-medium">Actions</span>
            <kbd className="text-[10px] bg-white/10 px-1 py-0.5 rounded font-mono text-slate-400">⌘K</kbd>
          </button>

          {/* Court Calibration Toggle */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              setCalibrationMode(!isCalibrationMode);
            }}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              isCalibrationMode
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
            title="Calibrate Court Perspective"
          >
            <Crosshair size={15} />
            <span className="hidden xl:inline">Court</span>
          </button>

          {/* Auto-Detect AI Toggle */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setAutoDetectEnabled(!isAutoDetectEnabled);
            }}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              isAutoDetectEnabled
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
            }`}
            title={isAutoDetectEnabled ? 'Auto-Detect Active (Court & Players)' : 'Auto-Detect Paused'}
          >
            <Scan size={15} className={isAutoDetectEnabled ? 'animate-pulse' : ''} />
            <span className="hidden xl:inline">Auto-AI</span>
          </button>

          {/* Tactical AI Coach Toggle */}
          <button
            onClick={() => {
              triggerHaptic('light');
              toggleTacticalCoach();
            }}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              isTacticalCoachOpen
                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
            title="Toggle Tactical AI Coach & Live Win Probability"
          >
            <Sparkles size={15} className={isTacticalCoachOpen ? 'text-amber-300' : 'text-purple-400'} />
            <span className="hidden xl:inline">Coach</span>
          </button>

          {/* Mini Court Toggle */}
          <button
            onClick={() => {
              triggerHaptic('light');
              toggleMiniCourt();
            }}
            className={`p-2 rounded-lg transition-all ${
              showMiniCourt
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
            }`}
            title="Toggle Mini-Court Radar"
          >
            <Radar size={15} />
          </button>

          {/* Live Stats Drawer Toggle */}
          <button
            onClick={() => {
              triggerHaptic('light');
              toggleLiveStatsDrawer();
            }}
            className={`hidden sm:flex p-2 rounded-lg transition-all items-center gap-1 ${
              isLiveStatsDrawerOpen
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
            title="Toggle Live Match Stats Drawer"
          >
            <BarChart2 size={15} />
          </button>

          {/* Full Post-Match Analytics Dashboard Modal */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setStatsModalOpen(true);
            }}
            className="p-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white transition-all flex items-center gap-1 shadow-sm"
            title="Open Post-Match Analytics Report"
          >
            <Trophy size={15} />
            <span className="hidden xl:inline text-xs font-semibold">Report</span>
          </button>

          {/* Training Mode Modal */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setTrainingModalOpen(true);
            }}
            className="hidden md:flex p-2 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-300 transition-all items-center gap-1"
            title="Solo Training & Drills"
          >
            <Target size={15} />
            <span className="hidden xl:inline text-xs font-semibold">Drills</span>
          </button>

          {/* Jumbo Scoreboard Mode */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setLargeScoreboardOpen(true);
            }}
            className="hidden lg:flex p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
            title="Jumbo Court Scoreboard (View from distance)"
          >
            <Tv size={15} />
          </button>

          {/* Flagged Line Calls Review */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setFlaggedCallsModalOpen(true);
            }}
            className="hidden xl:flex p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 transition-all"
            title="Review Flagged / Low-Confidence Calls"
          >
            <AlertTriangle size={15} />
          </button>

          {/* Player Profiles & History */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setProfilesModalOpen(true);
            }}
            className="hidden xl:flex p-2 rounded-lg bg-white/5 hover:bg-white/10 text-sky-300 border border-white/10 transition-all"
            title="Player Profiles & History"
          >
            <Users size={15} />
          </button>

          {/* Hands-Free Voice Commands Toggle */}
          <button
            onClick={toggleVoiceCommands}
            className={`hidden sm:flex p-2 rounded-lg transition-all ${
              isVoiceListening
                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400 animate-pulse'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
            }`}
            title={isVoiceListening ? 'Voice Commands Active' : 'Enable Voice Commands'}
          >
            {isVoiceListening ? <Mic size={15} /> : <MicOff size={15} />}
          </button>

          {/* Low Power Mode Toggle */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              toggleLowPowerMode();
            }}
            className={`hidden md:flex p-2 rounded-lg transition-all ${
              isLowPowerMode
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
            }`}
            title={isLowPowerMode ? 'Low Power Mode Active' : 'Low Power Mode'}
          >
            {isLowPowerMode ? <BatteryCharging size={15} /> : <Battery size={15} />}
          </button>

          {/* Resolution Selector */}
          <select
            value={resolution}
            onChange={(e) => onSelectResolution(e.target.value as CameraResolution)}
            className="hidden 2xl:block bg-white/5 text-slate-300 text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none"
            title="Camera Resolution"
          >
            {(Object.keys(RESOLUTION_PRESETS) as CameraResolution[]).map((res) => (
              <option key={res} value={res} className="bg-slate-900 text-white">
                {res}
              </option>
            ))}
          </select>

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="hidden 2xl:block bg-white/5 text-slate-300 text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none font-mono"
            title="Select UI Language"
          >
            <option value="en" className="bg-slate-900 text-white">EN</option>
            <option value="zh" className="bg-slate-900 text-white">中文</option>
            <option value="ja" className="bg-slate-900 text-white">日本語</option>
            <option value="id" className="bg-slate-900 text-white">ID</option>
            <option value="es" className="bg-slate-900 text-white">ES</option>
            <option value="fr" className="bg-slate-900 text-white">FR</option>
          </select>

          {/* Front / Back Camera Switch */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onSwitchCamera();
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
            title={`Switch camera (current: ${facingMode})`}
          >
            <RefreshCw size={15} />
          </button>

          {/* Wake Lock Screen On/Off */}
          {wakeLockSupported && (
            <button
              onClick={() => {
                triggerHaptic('selection');
                onToggleWakeLock();
              }}
              className={`hidden sm:flex p-2 rounded-lg transition-all ${
                wakeLockActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
              }`}
              title={wakeLockActive ? 'Display Wake Lock Active' : 'Display Wake Lock Inactive'}
            >
              {wakeLockActive ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}

          {/* Quickstart Help Guide */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setOnboardingOpen(true);
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
            title="Quickstart Guide"
          >
            <HelpCircle size={15} />
          </button>

          {/* Privacy Guarantee */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setPrivacyModalOpen(true);
            }}
            className="hidden sm:flex p-2 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/10 transition-colors"
            title="Privacy Guarantee (Zero Video Uploaded)"
          >
            <ShieldCheck size={15} />
          </button>

          {/* Setup Wizard & Settings */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setSetupWizardOpen(true);
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
            title="Match Setup & Preferences"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
      />
    </>
  );
};
