import React from 'react';
import { GameStateSnapshot, Team } from '../game/scoringEngine';
import { X, Volume2, VolumeX, RotateCcw, Plus, Play } from 'lucide-react';
import { speechService } from '../voice/speechService';

interface LargeScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: GameStateSnapshot;
  teamAName: string;
  teamBName: string;
  onAwardPoint: (team: Team) => void;
  onUndo: () => void;
  onStartNextGame: () => void;
}

export const LargeScoreboardModal: React.FC<LargeScoreboardModalProps> = ({
  isOpen,
  onClose,
  snapshot,
  teamAName,
  teamBName,
  onAwardPoint,
  onUndo,
  onStartNextGame,
}) => {
  if (!isOpen) return null;

  const [voiceEnabled, setVoiceEnabled] = React.useState(speechService.getVoiceEnabled());

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    speechService.setVoiceEnabled(next);
  };

  const isServerA = snapshot.servingSide === 'A';
  const isServerB = snapshot.servingSide === 'B';

  return (
    <div
      role="dialog"
      aria-label="Jumbo Badminton Scoreboard"
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none animate-in fade-in duration-200"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-xl">
            🏸
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wide">
              Game {snapshot.gameIndex}{' '}
              <span className="text-sm font-semibold text-slate-400 ml-2">
                (Best of 3 • BWF 21)
              </span>
            </h1>
            <p className="text-xs text-slate-500">Jumbo Court Display Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleVoice}
            className={`p-3 rounded-xl border transition-all ${
              voiceEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={voiceEnabled ? 'Voice Announcements ON' : 'Voice Announcements OFF'}
          >
            {voiceEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>

          <button
            onClick={onClose}
            className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Exit Jumbo Scoreboard"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Jumbo Score Displays */}
      <div className="grid grid-cols-2 gap-6 sm:gap-12 flex-1 items-center justify-center my-6">
        {/* Team A Jumbo Box */}
        <div
          onClick={() => onAwardPoint('A')}
          className={`h-full max-h-[500px] flex flex-col items-center justify-center rounded-3xl p-6 sm:p-8 border-2 transition-all cursor-pointer relative overflow-hidden group ${
            isServerA
              ? 'bg-sky-950/40 border-sky-500 shadow-2xl shadow-sky-950/60'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          {isServerA && (
            <div className="absolute top-4 right-4 bg-sky-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
              Serving
            </div>
          )}

          <h2 className="text-2xl sm:text-4xl font-extrabold text-sky-400 mb-2 truncate max-w-full text-center">
            {teamAName}
          </h2>
          <div className="text-xs uppercase tracking-wider text-slate-400 font-mono mb-4">
            Games: {snapshot.gamesWonA}
          </div>

          <div className="text-8xl sm:text-[160px] md:text-[200px] font-black font-mono leading-none tracking-tight text-white group-hover:scale-105 transition-transform">
            {snapshot.scoreA}
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-sky-400/80 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus size={14} />
            <span>Tap to add point</span>
          </div>
        </div>

        {/* Team B Jumbo Box */}
        <div
          onClick={() => onAwardPoint('B')}
          className={`h-full max-h-[500px] flex flex-col items-center justify-center rounded-3xl p-6 sm:p-8 border-2 transition-all cursor-pointer relative overflow-hidden group ${
            isServerB
              ? 'bg-orange-950/40 border-orange-500 shadow-2xl shadow-orange-950/60'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          {isServerB && (
            <div className="absolute top-4 right-4 bg-orange-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
              Serving
            </div>
          )}

          <h2 className="text-2xl sm:text-4xl font-extrabold text-orange-400 mb-2 truncate max-w-full text-center">
            {teamBName}
          </h2>
          <div className="text-xs uppercase tracking-wider text-slate-400 font-mono mb-4">
            Games: {snapshot.gamesWonB}
          </div>

          <div className="text-8xl sm:text-[160px] md:text-[200px] font-black font-mono leading-none tracking-tight text-white group-hover:scale-105 transition-transform">
            {snapshot.scoreB}
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-orange-400/80 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus size={14} />
            <span>Tap to add point</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
        <button
          onClick={onUndo}
          className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-sm sm:text-base flex items-center gap-2 transition-all"
        >
          <RotateCcw size={18} />
          <span>Undo Last Point</span>
        </button>

        {snapshot.isGameOver && (
          <button
            onClick={onStartNextGame}
            className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base sm:text-lg flex items-center gap-2 shadow-xl shadow-emerald-900/40 animate-pulse transition-all"
          >
            <Play size={20} />
            <span>Start Next Game</span>
          </button>
        )}

        <div className="text-slate-500 text-xs sm:text-sm font-mono text-center sm:text-right">
          Hands-Free Voice: say &quot;Point A&quot;, &quot;Point B&quot;, or &quot;Undo&quot;
        </div>
      </div>
    </div>
  );
};
