import React from 'react';
import { LineCallEvaluation } from '../court/lineCallEngine';
import { PointType } from '../game/rallyStateMachine';
import { StrokeType } from '../detection/motionClassifier';
import { AlertTriangle, Zap, Crosshair } from 'lucide-react';

interface LandingCallBannerProps {
  call: LineCallEvaluation | null;
  pointType?: PointType;
  endingStroke?: StrokeType;
  maxSpeedKmh?: number;
  winningTeam?: 'A' | 'B';
  teamAName: string;
  teamBName: string;
  onDismiss?: () => void;
}

export const LandingCallBanner: React.FC<LandingCallBannerProps> = ({
  call,
  pointType,
  endingStroke,
  maxSpeedKmh,
  winningTeam,
  teamAName,
  teamBName,
  onDismiss,
}) => {
  if (!call) return null;

  const isCallIn = call.call === 'IN';
  const winnerName = winningTeam === 'A' ? teamAName : teamBName;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-lg animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div
        className={`rounded-2xl p-4 shadow-2xl backdrop-blur-md border flex items-center justify-between gap-4 transition-all ${
          isCallIn
            ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100 shadow-emerald-950/50'
            : 'bg-rose-950/90 border-rose-500/60 text-rose-100 shadow-rose-950/50'
        }`}
      >
        {/* Left: IN/OUT Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl tracking-wider shadow-lg ${
              isCallIn
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-rose-500 text-white shadow-rose-500/30'
            }`}
          >
            {call.call}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white">
                Point to {winnerName}
              </span>
              {call.isUncertain && (
                <span className="flex items-center gap-1 bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  <AlertTriangle size={11} />
                  UNCERTAIN CALL
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
              <span>{call.distanceToLineCm} cm from {call.closestLineName}</span>
              <span className="text-slate-500">•</span>
              <span className="font-mono font-semibold">{call.confidencePercent}% Confidence</span>
            </p>

            {pointType && (
              <div className="flex items-center gap-2 mt-1 text-[11px] font-medium">
                <span
                  className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                    pointType === 'WINNER'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : pointType === 'FORCED_ERROR'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {pointType.replace('_', ' ')}
                </span>
                {endingStroke && (
                  <span className="text-slate-300 capitalize font-mono">
                    {endingStroke.replace('_', ' ')}
                  </span>
                )}
                {maxSpeedKmh && maxSpeedKmh > 0 && (
                  <span className="flex items-center gap-0.5 text-yellow-300 font-mono">
                    <Zap size={11} />
                    {maxSpeedKmh} km/h
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Landing Zone Badge */}
        <div className="flex flex-col items-end gap-1 text-right shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900/80 rounded-lg border border-slate-700/80 text-[11px] text-slate-300">
            <Crosshair size={12} className="text-sky-400" />
            <span>{call.landingZone}</span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[10px] text-slate-400 hover:text-white mt-1 underline"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
