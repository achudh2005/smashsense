import React, { useState } from 'react';
import { GameStateSnapshot, ScoreAuditEntry, Team } from '../game/scoringEngine';
import { AuditLogModal } from './AuditLogModal';
import { haptics } from '../utils/haptics';
import {
  Undo2,
  Redo2,
  ShieldCheck,
  Edit3,
  X,
  Clock,
  ArrowRightLeft
} from 'lucide-react';

interface ScoreboardOverlayProps {
  snapshot: GameStateSnapshot;
  auditLog: ReadonlyArray<ScoreAuditEntry>;
  completedGames: ReadonlyArray<{ gameIndex: number; scoreA: number; scoreB: number; winner: Team }>;
  teamAName: string;
  teamBName: string;
  onUndo: () => void;
  onRedo: () => void;
  onManualScoreCorrection: (scoreA: number, scoreB: number, reason: string) => void;
  onStartNextGame: () => void;
}

export const ScoreboardOverlay: React.FC<ScoreboardOverlayProps> = ({
  snapshot,
  auditLog,
  completedGames,
  teamAName,
  teamBName,
  onUndo,
  onRedo,
  onManualScoreCorrection,
  onStartNextGame,
}) => {
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isManualEditOpen, setIsManualEditOpen] = useState(false);
  const [customScoreA, setCustomScoreA] = useState(snapshot.scoreA);
  const [customScoreB, setCustomScoreB] = useState(snapshot.scoreB);
  const [manualReason, setManualReason] = useState('Umpire adjustment');

  // Match Status Indicators
  const isDeuce = snapshot.scoreA >= 20 && snapshot.scoreB >= 20 && !snapshot.isGameOver;
  const isGamePoint =
    !snapshot.isGameOver &&
    ((snapshot.scoreA >= 20 && snapshot.scoreA > snapshot.scoreB) ||
      (snapshot.scoreB >= 20 && snapshot.scoreB > snapshot.scoreA));
  const isMatchPoint =
    isGamePoint &&
    ((snapshot.gamesWonA === 1 && snapshot.scoreA > snapshot.scoreB) ||
      (snapshot.gamesWonB === 1 && snapshot.scoreB > snapshot.scoreA));

  const serverRole = snapshot.currentServer;
  const serverCourt = snapshot.positions[serverRole]?.court || 'right';

  const handleApplyManualEdit = () => {
    haptics.success();
    onManualScoreCorrection(customScoreA, customScoreB, manualReason);
    setIsManualEditOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 select-none">
        {/* Main BWF TV-Style Scoreboard Pill */}
        <div className="flex items-center bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 gap-2">
          {/* Game Indicator & Set Scores */}
          <div className="px-2.5 py-1 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] font-mono flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Game {snapshot.gameIndex + 1}
            </span>
            <div className="flex items-center gap-1 font-bold">
              <span className="text-sky-400">{snapshot.gamesWonA}</span>
              <span className="text-slate-600">-</span>
              <span className="text-orange-400">{snapshot.gamesWonB}</span>
            </div>
          </div>

          {/* Completed Previous Sets (if any) */}
          {completedGames.map((g) => (
            <div
              key={g.gameIndex}
              className="px-2 py-1 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[10px] font-mono hidden md:flex flex-col justify-center text-slate-400"
            >
              <span>G{g.gameIndex + 1}</span>
              <span className="font-bold text-slate-300">
                {g.scoreA}-{g.scoreB}
              </span>
            </div>
          ))}

          {/* Team A Score Block */}
          <div className="flex items-center gap-2 px-2 py-0.5">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                {snapshot.currentServer.startsWith('A') && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"
                    title={`Serving from ${serverCourt} court`}
                  />
                )}
                <span className="text-xs font-bold text-slate-100 truncate max-w-[80px] sm:max-w-[120px]">
                  {teamAName}
                </span>
              </div>
              <span className="text-[9px] font-mono text-sky-400 block">
                {snapshot.positions.A1.court === 'right' ? 'Right' : 'Left'} Court
              </span>
            </div>

            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center font-mono font-black text-xl text-sky-200 shadow-inner">
              {snapshot.scoreA}
            </div>
          </div>

          <span className="text-slate-600 font-mono font-black text-sm">:</span>

          {/* Team B Score Block */}
          <div className="flex items-center gap-2 px-2 py-0.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-400/50 flex items-center justify-center font-mono font-black text-xl text-orange-200 shadow-inner">
              {snapshot.scoreB}
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100 truncate max-w-[80px] sm:max-w-[120px]">
                  {teamBName}
                </span>
                {snapshot.currentServer.startsWith('B') && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"
                    title={`Serving from ${serverCourt} court`}
                  />
                )}
              </div>
              <span className="text-[9px] font-mono text-orange-400 block">
                {snapshot.positions.B1.court === 'right' ? 'Right' : 'Left'} Court
              </span>
            </div>
          </div>

          {/* Action / Correction Buttons */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            {/* Undo */}
            <button
              onClick={() => {
                haptics.light();
                onUndo();
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Undo last point"
            >
              <Undo2 size={14} />
            </button>

            {/* Redo */}
            <button
              onClick={() => {
                haptics.light();
                onRedo();
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Redo previously undone point"
            >
              <Redo2 size={14} />
            </button>

            {/* Manual Edit */}
            <button
              onClick={() => {
                setCustomScoreA(snapshot.scoreA);
                setCustomScoreB(snapshot.scoreB);
                setIsManualEditOpen(true);
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Manual Score Correction"
            >
              <Edit3 size={14} />
            </button>

            {/* Audit Log Modal Button */}
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300"
              title="Open BWF Score Audit Trail"
            >
              <ShieldCheck size={14} />
            </button>
          </div>
        </div>

        {/* Live Match State Badges (Deuce, Match Point, Game Point, Interval) */}
        {isMatchPoint ? (
          <div className="bg-red-500/20 border border-red-500 text-red-300 text-[10px] font-black px-2.5 py-1 rounded-xl animate-bounce tracking-wider uppercase">
            MATCH POINT
          </div>
        ) : isGamePoint ? (
          <div className="bg-amber-500/20 border border-amber-500 text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-xl animate-pulse tracking-wider uppercase">
            GAME POINT
          </div>
        ) : isDeuce ? (
          <div className="bg-purple-500/20 border border-purple-500 text-purple-300 text-[10px] font-black px-2.5 py-1 rounded-xl tracking-wider uppercase">
            DEUCE (2-PT LEAD)
          </div>
        ) : null}

        {snapshot.isInterval && (
          <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-xl tracking-wider uppercase flex items-center gap-1">
            <Clock size={11} />
            {snapshot.intervalType === 'end_of_game' ? 'END OF GAME' : '11-PT INTERVAL'}
          </div>
        )}

        {snapshot.sidesSwapped && (
          <div className="bg-sky-500/20 border border-sky-500 text-sky-300 text-[10px] font-bold px-2 py-1 rounded-xl flex items-center gap-1">
            <ArrowRightLeft size={11} />
            CHANGE ENDS
          </div>
        )}

        {/* Next Game Button if Game is Over */}
        {snapshot.isGameOver && !snapshot.isMatchOver && (
          <button
            onClick={onStartNextGame}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-900/40 animate-pulse"
          >
            Start Game {snapshot.gameIndex + 2}
          </button>
        )}
      </div>

      {/* Manual Score Correction Modal */}
      {isManualEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Edit3 size={15} className="text-emerald-400" />
                Manual Score Correction
              </h3>
              <button
                onClick={() => setIsManualEditOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-sky-400 truncate block">
                  {teamAName}
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={customScoreA}
                  onChange={(e) => setCustomScoreA(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 text-center text-xl font-mono font-bold text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-orange-400 truncate block">
                  {teamBName}
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={customScoreB}
                  onChange={(e) => setCustomScoreB(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 text-center text-xl font-mono font-bold text-white focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Reason for Adjustment</label>
              <input
                type="text"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                placeholder="e.g. Umpire overruled call"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsManualEditOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyManualEdit}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold"
              >
                Apply Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        entries={auditLog}
        teamAName={teamAName}
        teamBName={teamBName}
      />
    </>
  );
};
