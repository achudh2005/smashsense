import React, { useState } from 'react';
import { InGameCoachReport } from '../tactical/tacticalSuggestionEngine';
import { WinProbabilityResult } from '../tactical/winProbabilityEngine';
import { Sparkles, TrendingUp, Target, ShieldAlert, Zap, ChevronUp, ChevronDown, X } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface TacticalCoachCardProps {
  report: InGameCoachReport;
  winProb: WinProbabilityResult;
  teamAName: string;
  teamBName: string;
  onDismiss?: () => void;
}

export const TacticalCoachCard: React.FC<TacticalCoachCardProps> = ({
  report,
  winProb,
  teamAName,
  teamBName,
  onDismiss,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isInterval = report.intervalPhase === 'GAME_11_INTERVAL' || report.intervalPhase === 'GAME_END';

  return (
    <div className="w-full max-w-md bg-slate-950/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden text-white transition-all duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-sky-950/60 to-purple-950/60 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Sparkles size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold tracking-wide">Tactical AI Coach</span>
              {isInterval && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  {report.intervalPhase === 'GAME_11_INTERVAL' ? '11-Pt Break' : 'Game Break'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-none">
              Game {report.gameIndex} • Score: {report.currentScoreText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              haptics.selection();
              setIsCollapsed(!isCollapsed);
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title={isCollapsed ? 'Expand Coach' : 'Collapse Coach'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {onDismiss && (
            <button
              onClick={() => {
                haptics.light();
                onDismiss();
              }}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Close Card"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3.5 space-y-3 text-xs">
          {/* Win Probability & Momentum Gauge */}
          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-sky-300 truncate max-w-[120px]">
                {teamAName} ({winProb.winProbabilityA}%)
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <TrendingUp size={12} className={winProb.momentumScore > 0 ? 'text-sky-400' : 'text-orange-400'} />
                {winProb.statusText}
              </span>
              <span className="font-semibold text-orange-400 truncate max-w-[120px]">
                {teamBName} ({winProb.winProbabilityB}%)
              </span>
            </div>

            {/* Split Bar Meter */}
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-500 ease-out"
                style={{ width: `${winProb.winProbabilityA}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500 ease-out"
                style={{ width: `${winProb.winProbabilityB}%` }}
              />
            </div>

            {/* Momentum Trend Sparkline */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>Momentum</span>
              <div className="flex items-center gap-1">
                {winProb.momentumTrend.slice(-6).map((val, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 rounded-full transition-all ${
                      val > 0 ? 'bg-sky-400' : val < 0 ? 'bg-orange-400' : 'bg-slate-600'
                    }`}
                    style={{ height: `${Math.max(4, Math.abs(val) * 0.16)}px` }}
                  />
                ))}
              </div>
              <span className="font-mono text-slate-300">
                {winProb.momentumScore > 0 ? `+${winProb.momentumScore}` : winProb.momentumScore}
              </span>
            </div>
          </div>

          {/* Tactical Advice Items */}
          <div className="space-y-2">
            {report.adviceList.map((adv) => (
              <div
                key={adv.id}
                className="bg-slate-900/50 hover:bg-slate-900/80 rounded-xl p-2.5 border border-white/5 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {adv.category === 'opponent_weakness' ? (
                      <ShieldAlert size={13} className="text-amber-400 shrink-0" />
                    ) : adv.category === 'target_zone' ? (
                      <Target size={13} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Zap size={13} className="text-sky-400 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-200 text-xs">{adv.headline}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 font-mono text-slate-300">
                    {adv.derivedMetric}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">{adv.detail}</p>
                <div className="text-[10px] text-emerald-400/90 font-medium bg-emerald-950/40 rounded-lg px-2 py-1 border border-emerald-500/20">
                  👉 {adv.suggestedAction}
                </div>
              </div>
            ))}
          </div>

          {/* Target Zone 9-Grid Mini Visualizer if available */}
          {report.topTargetZone && (
            <div className="bg-slate-900/40 rounded-xl p-2.5 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-200">Recommended Target Pocket</span>
                <p className="text-[10px] text-slate-400">
                  Zone {report.topTargetZone.zoneIndex} ({report.topTargetZone.zoneName}) • {report.topTargetZone.winPercent}% conversion
                </p>
              </div>

              {/* 3x3 Mini Grid */}
              <div className="grid grid-cols-3 gap-0.5 w-14 h-14 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((zoneNum) => {
                  const isHighlighted = zoneNum === report.topTargetZone?.zoneIndex;
                  return (
                    <div
                      key={zoneNum}
                      className={`flex items-center justify-center text-[8px] font-mono font-bold rounded-sm ${
                        isHighlighted
                          ? 'bg-emerald-500 text-slate-950 shadow-sm animate-pulse'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {zoneNum}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
