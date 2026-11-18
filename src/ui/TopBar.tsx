import React from 'react';
import { useSmashSenseStore } from '../game/gameState';
import { CameraResolution, RESOLUTION_PRESETS } from '../camera/cameraManager';
import {
  RefreshCw,
  Sun,
  Moon,
  Crosshair,
  Settings,
  Radar,
  Activity,
  RotateCcw,
  Sparkles,
  Zap,
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

  const scoreA = useSmashSenseStore((s) => s.scoreA);
  const scoreB = useSmashSenseStore((s) => s.scoreB);
  const incrementScore = useSmashSenseStore((s) => s.incrementScore);
  const resetScore = useSmashSenseStore((s) => s.resetScore);
  const currentServer = useSmashSenseStore((s) => s.currentServer);
  const config = useSmashSenseStore((s) => s.config);

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-3 py-2 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between text-slate-200 select-none">
      {/* Left: Brand & Performance HUD */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-base shadow-sm">
            🏸
          </div>
          <div className="hidden sm:block">
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
            <span className="text-[10px] text-slate-500">fps</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1" title="Worker Inference FPS">
            <Zap size={12} className="text-yellow-400" />
            <span className="text-yellow-300 font-bold">{inferenceFps || 24}</span>
            <span className="text-[10px] text-slate-500">inf</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="text-[11px] text-slate-400" title="Worker Detection Latency">
            <span>{latencyMs || 18}ms</span>
          </div>
        </div>
      </div>

      {/* Center: Live Match Scoreboard */}
      <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-xl shadow-inner">
        {/* Team A */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-sky-300 truncate max-w-[70px] sm:max-w-[100px]">
            {config.teamANames.A1}
          </span>
          {currentServer.startsWith('A') && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" title="Serving" />
          )}
          <button
            onClick={() => incrementScore('A')}
            className="w-7 h-7 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 font-mono font-bold text-sky-200 text-sm flex items-center justify-center transition-all active:scale-95"
            title="Add point to Team A"
          >
            {scoreA}
          </button>
        </div>

        <span className="text-slate-600 font-mono text-xs font-bold">:</span>

        {/* Team B */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => incrementScore('B')}
            className="w-7 h-7 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 font-mono font-bold text-orange-200 text-sm flex items-center justify-center transition-all active:scale-95"
            title="Add point to Team B"
          >
            {scoreB}
          </button>
          {currentServer.startsWith('B') && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" title="Serving" />
          )}
          <span className="text-xs font-bold text-orange-300 truncate max-w-[70px] sm:max-w-[100px]">
            {config.teamBNames.B1}
          </span>
        </div>

        <button
          onClick={resetScore}
          className="p-1 text-slate-500 hover:text-slate-300 ml-1"
          title="Reset score"
        >
          <RotateCcw size={12} />
        </button>
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
          title="Toggle Simulation Rally mode (for immediate testing without a physical match)"
        >
          <Sparkles size={13} className={isSimulationMode ? 'animate-spin' : ''} />
          <span className="hidden md:inline">{isSimulationMode ? 'Sim Active' : 'Sim Match'}</span>
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
          <span className="hidden lg:inline">Calibrate</span>
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
