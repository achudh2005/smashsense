import React from 'react';
import { PlayerActionEvent } from '../detection/motionClassifier';
import { Activity, Zap, Footprints, AlertCircle } from 'lucide-react';

interface PlayerActionFeedProps {
  actions: PlayerActionEvent[];
}

export const PlayerActionFeed: React.FC<PlayerActionFeedProps> = ({ actions }) => {
  if (actions.length === 0) return null;

  const recentActions = actions.slice(-4).reverse();

  return (
    <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none select-none max-w-xs">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
        <Activity size={12} className="text-emerald-400 animate-pulse" />
        Live Player Motion Feed
      </div>

      {recentActions.map((act) => {
        const isTeamA = act.team === 'A';
        const teamColor = isTeamA ? 'text-sky-300 border-sky-500/40' : 'text-orange-300 border-orange-500/40';

        let icon = <Activity size={12} />;
        if (act.category === 'movement') icon = <Footprints size={12} className="text-emerald-400" />;
        else if (act.category === 'stroke') icon = <Zap size={12} className="text-yellow-400" />;
        else if (act.category === 'miss') icon = <AlertCircle size={12} className="text-rose-400" />;

        return (
          <div
            key={act.id}
            className="animate-in fade-in slide-in-from-bottom-2 duration-200 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-3 text-xs shadow-lg"
          >
            <div className="flex items-center gap-2">
              {icon}
              <span className={`font-mono font-bold text-[11px] ${teamColor}`}>
                {act.playerName || act.playerRole}
              </span>
              <span className="text-slate-200 font-semibold capitalize text-[11px]">
                {act.action.replace(/_/g, ' ')}
              </span>
            </div>

            {act.metrics?.shuttleSpeedKmh && (
              <span className="font-mono text-[10px] text-yellow-300 font-bold">
                {act.metrics.shuttleSpeedKmh} km/h
              </span>
            )}
            {act.metrics?.jumpHeightM && (
              <span className="font-mono text-[10px] text-sky-300 font-bold">
                +{act.metrics.jumpHeightM}m
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
