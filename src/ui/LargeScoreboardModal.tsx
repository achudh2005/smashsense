import React from 'react';
import { GameStateSnapshot, Team } from '../game/scoringEngine';
import { X, Volume2, VolumeX, RotateCcw, Plus, Play } from 'lucide-react';
import { speechService } from '../voice/speechService';
import { BrandLogo } from './BrandLogo';
import { triggerHaptic } from '../utils/haptics';
import { motion } from 'framer-motion';

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
  const [voiceEnabled, setVoiceEnabled] = React.useState(speechService.getVoiceEnabled());

  if (!isOpen) return null;

  const toggleVoice = () => {
    triggerHaptic('selection');
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    speechService.setVoiceEnabled(next);
  };

  const isServerA = snapshot.servingSide === 'A';
  const isServerB = snapshot.servingSide === 'B';

  const handlePointTap = (team: Team) => {
    triggerHaptic('medium');
    onAwardPoint(team);
  };

  return (
    <div
      role="dialog"
      aria-label="Jumbo Badminton Scoreboard"
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <BrandLogo size={32} showText={false} />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Game {snapshot.gameIndex}{' '}
              <span className="text-sm font-normal text-slate-400 ml-2">
                (BWF 21 • Best of 3)
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-mono">Distance Scoreboard Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleVoice}
            className={`p-3 rounded-2xl border transition-all ${
              voiceEnabled
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-white/5 text-slate-500 border-white/10'
            }`}
            title={voiceEnabled ? 'Voice Announcements Active' : 'Voice Announcements Muted'}
          >
            {voiceEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
            title="Close Scoreboard"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Main Jumbo Score Displays */}
      <div className="grid grid-cols-2 gap-6 sm:gap-12 flex-1 items-center justify-center my-6">
        {/* Team A Box */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => handlePointTap('A')}
          className={`h-full max-h-[520px] flex flex-col items-center justify-center rounded-3xl p-6 sm:p-8 border transition-all cursor-pointer relative overflow-hidden group ${
            isServerA
              ? 'bg-sky-950/20 border-sky-500/50 shadow-2xl ring-1 ring-sky-500/30'
              : 'bg-white/[0.02] border-white/10 hover:border-white/20'
          }`}
        >
          {isServerA && (
            <div className="absolute top-4 right-4 bg-sky-500 text-slate-950 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Serving
            </div>
          )}

          <h2 className="text-2xl sm:text-4xl font-bold text-sky-400 mb-2 truncate max-w-full text-center tracking-tight">
            {teamAName}
          </h2>
          <div className="text-xs uppercase tracking-wider text-slate-400 font-mono mb-4">
            Sets: {snapshot.gamesWonA}
          </div>

          <div className="text-8xl sm:text-[160px] md:text-[200px] font-bold font-mono leading-none tracking-tighter tabular-nums text-white group-hover:scale-[1.02] transition-transform">
            {snapshot.scoreA}
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-sky-400/80 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus size={14} />
            <span>Tap to record point</span>
          </div>
        </motion.div>

        {/* Team B Box */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => handlePointTap('B')}
          className={`h-full max-h-[520px] flex flex-col items-center justify-center rounded-3xl p-6 sm:p-8 border transition-all cursor-pointer relative overflow-hidden group ${
            isServerB
              ? 'bg-amber-950/20 border-amber-500/50 shadow-2xl ring-1 ring-amber-500/30'
              : 'bg-white/[0.02] border-white/10 hover:border-white/20'
          }`}
        >
          {isServerB && (
            <div className="absolute top-4 right-4 bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Serving
            </div>
          )}

          <h2 className="text-2xl sm:text-4xl font-bold text-amber-400 mb-2 truncate max-w-full text-center tracking-tight">
            {teamBName}
          </h2>
          <div className="text-xs uppercase tracking-wider text-slate-400 font-mono mb-4">
            Sets: {snapshot.gamesWonB}
          </div>

          <div className="text-8xl sm:text-[160px] md:text-[200px] font-bold font-mono leading-none tracking-tighter tabular-nums text-white group-hover:scale-[1.02] transition-transform">
            {snapshot.scoreB}
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-400/80 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus size={14} />
            <span>Tap to record point</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Footer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
        <button
          onClick={() => {
            triggerHaptic('light');
            onUndo();
          }}
          className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold text-sm sm:text-base flex items-center gap-2 transition-all"
        >
          <RotateCcw size={18} />
          <span>Undo Call</span>
        </button>

        {snapshot.isGameOver && (
          <button
            onClick={() => {
              triggerHaptic('success');
              onStartNextGame();
            }}
            className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base sm:text-lg flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all"
          >
            <Play size={20} />
            <span>Start Next Game</span>
          </button>
        )}

        <div className="text-slate-400 text-xs sm:text-sm font-mono text-center sm:text-right">
          Voice shortcuts active: &quot;Point A&quot; • &quot;Point B&quot; • &quot;Undo&quot;
        </div>
      </div>
    </div>
  );
};
