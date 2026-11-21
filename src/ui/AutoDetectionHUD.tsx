import React from 'react';
import { useSmashSenseStore } from '../game/gameState';
import { CheckCircle2, Scan, RefreshCw, ArrowLeftRight, Crosshair, UserCheck } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface AutoDetectionHUDProps {
  onReScan?: () => void;
  onFineTune?: () => void;
  onSwapSides?: () => void;
}

export const AutoDetectionHUD: React.FC<AutoDetectionHUDProps> = ({
  onReScan,
  onFineTune,
  onSwapSides,
}) => {
  const isAutoDetectEnabled = useSmashSenseStore((s) => s.isAutoDetectEnabled);
  const autoCourtStatus = useSmashSenseStore((s) => s.autoCourtStatus);
  const autoCourtConfidence = useSmashSenseStore((s) => s.autoCourtConfidence);
  const autoCourtMessage = useSmashSenseStore((s) => s.autoCourtMessage);
  const trackedPlayers = useSmashSenseStore((s) => s.trackedPlayers);
  const isCalibrationMode = useSmashSenseStore((s) => s.isCalibrationMode);
  const setCalibrationMode = useSmashSenseStore((s) => s.setCalibrationMode);

  if (!isAutoDetectEnabled || isCalibrationMode) {
    return null;
  }

  const isLocked = autoCourtStatus === 'LOCKED';
  const confidencePercent = Math.round(autoCourtConfidence * 100);
  const identifiedPlayers = trackedPlayers.filter(
    (p) => p.assignedRole || p.identificationStatus === 'LOCKED'
  );

  const handleFineTuneClick = () => {
    haptics.selection();
    if (onFineTune) {
      onFineTune();
    } else {
      setCalibrationMode(true);
    }
  };

  const handleReScanClick = () => {
    haptics.medium();
    if (onReScan) {
      onReScan();
    }
  };

  const handleSwapSidesClick = () => {
    haptics.light();
    if (onSwapSides) {
      onSwapSides();
    }
  };

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto transition-all duration-300 ease-out max-w-[94vw] w-max">
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/75 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-xs text-white">
        {/* Court Status Indicator */}
        <div className="flex items-center gap-2">
          {isLocked ? (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Scan className="w-3.5 h-3.5 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
            </div>
          )}

          <div className="flex flex-col pr-1">
            <div className="flex items-center gap-1.5 font-medium leading-tight">
              <span>{isLocked ? 'Court Calibrated' : 'Auto-Detecting Court'}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                  isLocked
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}
              >
                {confidencePercent > 0 ? `${confidencePercent}%` : 'Scanning'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 truncate max-w-[170px] sm:max-w-xs">
              {autoCourtMessage}
            </span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-white/10" />

        {/* Players Identified Chips */}
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {identifiedPlayers.length > 0 ? (
            <div className="flex items-center gap-1">
              {identifiedPlayers.slice(0, 2).map((player) => (
                <div
                  key={player.trackId}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-white/5 text-[11px] font-mono"
                  title={`${player.customName || player.assignedRole} (${player.courtSide || 'Active'})`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: player.jerseyColor?.hex || (player.team === 'A' ? '#38bdf8' : '#f97316'),
                    }}
                  />
                  <span className="font-semibold text-slate-200">
                    {player.assignedRole || (player.team === 'A' ? 'A1' : 'B1')}
                  </span>
                  <span className="text-[10px] text-slate-400 max-w-[60px] truncate hidden sm:inline">
                    {player.customName || 'Player'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">Detecting players...</span>
          )}
        </div>

        {/* Control Actions */}
        <div className="flex items-center gap-1 pl-1">
          <button
            onClick={handleFineTuneClick}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-[11px] text-slate-200 transition-colors"
            title="Fine-tune court corners manually"
          >
            <Crosshair className="w-3 h-3 text-sky-400" />
            <span className="hidden sm:inline">Fine-Tune</span>
          </button>

          <button
            onClick={handleSwapSidesClick}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-slate-300 transition-colors"
            title="Swap Player Sides (Team A / Team B)"
          >
            <ArrowLeftRight className="w-3 h-3" />
          </button>

          <button
            onClick={handleReScanClick}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-slate-300 transition-colors"
            title="Re-Scan Court & Players"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
