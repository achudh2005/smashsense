import React from 'react';
import { MatchAnalysisReport, PlayerComprehensiveStats } from '../stats/matchStatsCalculator';
import {
  X,
  Trophy,
  Activity,
  Flame,
  ChevronRight,
  BarChart2,
  Maximize2,
} from 'lucide-react';

interface LiveStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullReport: () => void;
  report: MatchAnalysisReport;
  teamAName: string;
  teamBName: string;
  isDoubles?: boolean;
}

export const LiveStatsDrawer: React.FC<LiveStatsDrawerProps> = ({
  isOpen,
  onClose,
  onOpenFullReport,
  report,
  teamAName,
  teamBName,
}) => {
  if (!isOpen) return null;

  const { players, awards } = report;

  // Active players
  const playerList = Object.values(players).filter((p): p is PlayerComprehensiveStats => Boolean(p));
  const teamAPlayers = playerList.filter((p) => p.role.startsWith('A'));
  const teamBPlayers = playerList.filter((p) => p.role.startsWith('B'));

  // Calculate team aggregated metrics
  const teamAPoints = teamAPlayers.reduce((acc, p) => acc + p.pointsWon, 0);
  const teamBPoints = teamBPlayers.reduce((acc, p) => acc + p.pointsWon, 0);
  const totalPoints = teamAPoints + teamBPoints || 1;
  const teamAPct = Math.round((teamAPoints / totalPoints) * 100);
  const teamBPct = 100 - teamAPct;

  const teamAWinners = teamAPlayers.reduce((acc, p) => acc + p.winners, 0);
  const teamBWinners = teamBPlayers.reduce((acc, p) => acc + p.winners, 0);

  const teamAUFE = teamAPlayers.reduce((acc, p) => acc + p.unforcedErrors, 0);
  const teamBUFE = teamBPlayers.reduce((acc, p) => acc + p.unforcedErrors, 0);

  const teamASmashes = teamAPlayers.reduce((acc, p) => acc + p.smashesAttempted, 0);
  const teamBSmashes = teamBPlayers.reduce((acc, p) => acc + p.smashesAttempted, 0);

  const shortRalliesCount =
    teamAPlayers.reduce((acc, p) => acc + p.pointsWonShortRally, 0) +
    teamBPlayers.reduce((acc, p) => acc + p.pointsWonShortRally, 0);
  const midRalliesCount =
    teamAPlayers.reduce((acc, p) => acc + p.pointsWonMediumRally, 0) +
    teamBPlayers.reduce((acc, p) => acc + p.pointsWonMediumRally, 0);
  const longRalliesCount =
    teamAPlayers.reduce((acc, p) => acc + p.pointsWonLongRally, 0) +
    teamBPlayers.reduce((acc, p) => acc + p.pointsWonLongRally, 0);

  const mvpAward = awards.find((a) => a.type === 'MVP');

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-80 sm:w-96 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col text-slate-200 transition-all transform animate-in slide-in-from-right duration-200"
      aria-label="Live Match Analytics"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BarChart2 size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              Live Match Stats
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">
                LIVE
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {report.totalRallies} Rallies • {report.longestRallyShots} Max Shots
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenFullReport}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Open Full Post-Match Analytics Dashboard"
          >
            <Maximize2 size={15} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Close Drawer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Team Score & Point Share Bar */}
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-sky-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              {teamAName} ({teamAPoints})
            </span>
            <span className="text-orange-400 flex items-center gap-1">
              {teamBName} ({teamBPoints})
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            </span>
          </div>

          {/* Progress bar split */}
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-sky-500 transition-all duration-300 flex items-center justify-center text-[9px] font-bold text-white"
              style={{ width: `${teamAPct}%` }}
            >
              {teamAPct > 15 ? `${teamAPct}%` : ''}
            </div>
            <div
              className="bg-orange-500 transition-all duration-300 flex items-center justify-center text-[9px] font-bold text-white"
              style={{ width: `${teamBPct}%` }}
            >
              {teamBPct > 15 ? `${teamBPct}%` : ''}
            </div>
          </div>
        </div>

        {/* Live Momentum / Fast Insights */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/80">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
              <Flame size={12} className="text-amber-400" />
              <span>Top Smash</span>
            </div>
            <div className="text-base font-black font-mono text-amber-300">
              {report.maxShuttleSpeedKmh > 0 ? `${report.maxShuttleSpeedKmh} km/h` : '--'}
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/80">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
              <Activity size={12} className="text-emerald-400" />
              <span>Longest Rally</span>
            </div>
            <div className="text-base font-black font-mono text-emerald-300">
              {report.longestRallyShots > 0 ? `${report.longestRallyShots} shots` : '--'}
            </div>
          </div>
        </div>

        {/* Live MVP / Leader Badge */}
        {mvpAward && (
          <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Trophy size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {mvpAward.badgeLabel}
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {mvpAward.playerName}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{mvpAward.reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Side-by-Side Key Metrics Comparison */}
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Key Metrics Comparison
          </h3>

          <div className="space-y-2 text-xs">
            {/* Winners */}
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60 font-mono">
              <span className="text-sky-400 font-bold">{teamAWinners}</span>
              <span className="text-slate-400 font-sans text-[11px]">Winners</span>
              <span className="text-orange-400 font-bold">{teamBWinners}</span>
            </div>

            {/* Unforced Errors */}
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60 font-mono">
              <span className="text-sky-400 font-bold">{teamAUFE}</span>
              <span className="text-slate-400 font-sans text-[11px]">Unforced Errors</span>
              <span className="text-orange-400 font-bold">{teamBUFE}</span>
            </div>

            {/* Smashes Made */}
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60 font-mono">
              <span className="text-sky-400 font-bold">{teamASmashes}</span>
              <span className="text-slate-400 font-sans text-[11px]">Smashes Total</span>
              <span className="text-orange-400 font-bold">{teamBSmashes}</span>
            </div>

            {/* Average Duration */}
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60 font-mono">
              <span className="text-slate-300 font-bold col-span-3 text-center w-full">
                {report.avgRallyDurationSec.toFixed(1)}s avg rally duration
              </span>
            </div>
          </div>
        </div>

        {/* Per-Player Mini Breakdown */}
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Player Contributions
          </h3>

          <div className="space-y-2">
            {playerList.map((player) => {
              const isTeamA = player.role.startsWith('A');
              return (
                <div
                  key={player.role}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isTeamA ? 'bg-sky-400' : 'bg-orange-400'
                      }`}
                    />
                    <div className="truncate">
                      <span className="font-semibold text-slate-200">
                        {player.name}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">({player.role})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-emerald-400" title="Points Won">
                      +{player.pointsWon}
                    </span>
                    <span className="text-slate-500">/</span>
                    <span className="text-red-400" title="Errors">
                      -{player.unforcedErrors}
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-amber-400" title="Top Smash">
                      {player.topSmashSpeedKmh > 0 ? `${player.topSmashSpeedKmh}k` : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rally Length Breakdown Mini */}
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Rally Length Distribution
          </h3>
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-sans block">Short (&lt;4)</span>
              <span className="text-slate-200 font-bold">{shortRalliesCount}</span>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-sans block">Mid (4-7)</span>
              <span className="text-slate-200 font-bold">{midRalliesCount}</span>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-sans block">Long (8+)</span>
              <span className="text-slate-200 font-bold">{longRalliesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Call-to-action */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80">
        <button
          onClick={onOpenFullReport}
          className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all"
        >
          <span>Open Full Match Analysis</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </aside>
  );
};
