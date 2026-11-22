import React, { useState, useEffect, useRef } from 'react';
import { useSmashSenseStore } from '../game/gameState';
import { PlayerRole } from '../tracking/byteTrack';
import { Team } from '../game/scoringEngine';
import {
  X,
  Clock,
  Volume2,
  Undo2,
} from 'lucide-react';
import { haptics } from '../utils/haptics';

interface UmpireTabletModeProps {
  isOpen: boolean;
  onClose: () => void;
}

export type UmpireFaultType =
  | 'SERVICE_HIGH_1_15M'
  | 'SERVICE_FOOT_FAULT'
  | 'SERVICE_RACKET_HEAD'
  | 'SERVICE_DELAY'
  | 'FAULT_NET_TOUCH'
  | 'FAULT_PLAYER_TOUCH'
  | 'FAULT_DOUBLE_HIT'
  | 'FAULT_OBSTRUCTION';

export interface PlayerDisciplineCard {
  yellow: number;
  red: number;
  isDisqualified: boolean;
}

const FAULT_LABELS: Record<UmpireFaultType, { title: string; category: 'SERVICE' | 'GENERAL' }> = {
  SERVICE_HIGH_1_15M: { title: 'Serve > 1.15m', category: 'SERVICE' },
  SERVICE_FOOT_FAULT: { title: 'Foot Fault', category: 'SERVICE' },
  SERVICE_RACKET_HEAD: { title: 'Racket Not Down', category: 'SERVICE' },
  SERVICE_DELAY: { title: 'Delay of Serve', category: 'SERVICE' },
  FAULT_NET_TOUCH: { title: 'Net Touch', category: 'GENERAL' },
  FAULT_PLAYER_TOUCH: { title: 'Body / Shirt Touch', category: 'GENERAL' },
  FAULT_DOUBLE_HIT: { title: 'Double Hit', category: 'GENERAL' },
  FAULT_OBSTRUCTION: { title: 'Obstruction', category: 'GENERAL' },
};

/**
 * Synthesizes an official umpire electric buzzer sound on countdown completion
 */
function playUmpireBuzzer(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    // Ignore audio errors
  }
}

export const UmpireTabletMode: React.FC<UmpireTabletModeProps> = ({
  isOpen,
  onClose,
}) => {
  const snapshot = useSmashSenseStore((s) => s.snapshot);
  const config = useSmashSenseStore((s) => s.config);
  const awardPoint = useSmashSenseStore((s) => s.awardPoint);
  const undoScore = useSmashSenseStore((s) => s.undoScore);

  // Interval timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Discipline cards per player
  const [cards, setCards] = useState<Record<PlayerRole, PlayerDisciplineCard>>({
    A1: { yellow: 0, red: 0, isDisqualified: false },
    A2: { yellow: 0, red: 0, isDisqualified: false },
    B1: { yellow: 0, red: 0, isDisqualified: false },
    B2: { yellow: 0, red: 0, isDisqualified: false },
  });

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRole>('A1');
  const timerRef = useRef<number | null>(null);

  // Timer countdown loop
  useEffect(() => {
    if (!isTimerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          playUmpireBuzzer();
          haptics.warning();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  if (!isOpen) return null;

  const startInterval = (durationSeconds: number) => {
    setTimerSeconds(durationSeconds);
    setIsTimerRunning(true);
    haptics.selection();
  };

  const handlePoint = (team: Team) => {
    awardPoint(team, 'Umpire Tap');
    haptics.medium();
  };

  const handleFault = (fault: UmpireFaultType) => {
    const info = FAULT_LABELS[fault];
    // In badminton, a fault results in a point to the opponent
    const offendingTeam = selectedPlayer.startsWith('A') ? 'A' : 'B';
    const winningTeam = offendingTeam === 'A' ? 'B' : 'A';
    awardPoint(winningTeam, `Fault: ${info.title} (${selectedPlayer})`);
    haptics.warning();
  };

  const issueYellowCard = (role: PlayerRole) => {
    setCards((prev) => ({
      ...prev,
      [role]: { ...prev[role], yellow: prev[role].yellow + 1 },
    }));
    haptics.medium();
  };

  const issueRedCard = (role: PlayerRole) => {
    // Red card in BWF gives point to opponent
    const winningTeam = role.startsWith('A') ? 'B' : 'A';
    awardPoint(winningTeam, `BWF Red Card penalty on ${role}`);
    setCards((prev) => ({
      ...prev,
      [role]: { ...prev[role], red: prev[role].red + 1 },
    }));
    haptics.warning();
  };

  const issueBlackCard = (role: PlayerRole) => {
    setCards((prev) => ({
      ...prev,
      [role]: { ...prev[role], isDisqualified: true },
    }));
    haptics.warning();
  };

  const playerNames: Record<PlayerRole, string> = {
    A1: config.teamANames.A1,
    A2: config.teamANames.A2 || 'Partner A',
    B1: config.teamBNames.B1,
    B2: config.teamBNames.B2 || 'Partner B',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white select-none animate-fadeIn">
      {/* Top Umpire Status Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-lg bg-red-600 text-white font-black text-xs tracking-wider uppercase">
            BWF UMPIRE MODE
          </div>
          <span className="text-xs text-neutral-400 font-medium">
            Game {snapshot.gameIndex + 1} • Server: <span className="text-amber-300 font-bold">{snapshot.currentServer}</span> ({playerNames[snapshot.currentServer]})
          </span>
        </div>

        {/* Interval Timer in Header */}
        <div className="flex items-center gap-3">
          {timerSeconds > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Clock className="w-4 h-4 animate-spin" />
              <span className="font-mono text-base font-black">
                {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => startInterval(60)}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold"
            >
              60s Break
            </button>
            <button
              onClick={() => startInterval(120)}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold"
            >
              120s Break
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Scores (55%) | Right Faults & Discipline (45%) */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden divide-x divide-neutral-800">
        {/* LEFT COLUMN: Oversized Score Buttons (64px+ targets) */}
        <div className="col-span-7 p-6 flex flex-col justify-between space-y-4 bg-neutral-950">
          <div className="grid grid-cols-2 gap-4 flex-1">
            {/* Team A Button */}
            <button
              onClick={() => handlePoint('A')}
              className="group relative flex flex-col items-center justify-center rounded-3xl p-6 bg-gradient-to-b from-sky-950/60 to-sky-900/40 border-2 border-sky-500/50 hover:border-sky-400 active:scale-98 transition-all shadow-xl shadow-sky-950/40"
            >
              <span className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">
                {config.teamANames.A1}
              </span>
              <span className="text-8xl sm:text-9xl font-black font-mono tracking-tight text-white group-hover:scale-105 transition-transform">
                {snapshot.scoreA}
              </span>
              <span className="mt-4 px-4 py-1.5 rounded-full bg-sky-500 text-neutral-950 font-bold text-xs uppercase tracking-wider">
                POINT TEAM A (+1)
              </span>
            </button>

            {/* Team B Button */}
            <button
              onClick={() => handlePoint('B')}
              className="group relative flex flex-col items-center justify-center rounded-3xl p-6 bg-gradient-to-b from-orange-950/60 to-orange-900/40 border-2 border-orange-500/50 hover:border-orange-400 active:scale-98 transition-all shadow-xl shadow-orange-950/40"
            >
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">
                {config.teamBNames.B1}
              </span>
              <span className="text-8xl sm:text-9xl font-black font-mono tracking-tight text-white group-hover:scale-105 transition-transform">
                {snapshot.scoreB}
              </span>
              <span className="mt-4 px-4 py-1.5 rounded-full bg-orange-500 text-neutral-950 font-bold text-xs uppercase tracking-wider">
                POINT TEAM B (+1)
              </span>
            </button>
          </div>

          {/* Quick Undo & Interval Buzzer Control */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                undoScore();
                haptics.warning();
              }}
              className="min-h-[56px] px-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-sm flex items-center gap-2 border border-neutral-800 active:scale-95 transition-all"
            >
              <Undo2 className="w-5 h-5 text-amber-400" />
              Undo Last Call
            </button>

            <button
              onClick={playUmpireBuzzer}
              className="min-h-[56px] px-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold text-sm flex items-center gap-2 border border-neutral-800"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
              Test Buzzer
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Official BWF Faults & Card Tracking */}
        <div className="col-span-5 p-6 flex flex-col justify-between space-y-5 bg-neutral-900/40 overflow-y-auto">
          {/* Active Offending Player Selector */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Focus Player for Call / Card
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['A1', 'A2', 'B1', 'B2'] as PlayerRole[]).map((r) => {
                const isSelected = selectedPlayer === r;
                const c = cards[r];
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setSelectedPlayer(r);
                      haptics.light();
                    }}
                    className={`min-h-[48px] p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-neutral-800 border-sky-500 text-white'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{r} • {playerNames[r]}</div>
                      <div className="text-[10px] text-neutral-500">
                        {r.startsWith('A') ? 'Team A' : 'Team B'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {c.yellow > 0 && (
                        <span className="w-2.5 h-3.5 bg-yellow-400 rounded-sm inline-block shadow-sm" />
                      )}
                      {c.red > 0 && (
                        <span className="w-2.5 h-3.5 bg-red-600 rounded-sm inline-block shadow-sm" />
                      )}
                      {c.isDisqualified && (
                        <span className="w-2.5 h-3.5 bg-black border border-neutral-500 rounded-sm inline-block shadow-sm" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick BWF Fault Action Buttons (Min 64x64 targets) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Official Fault Triggers (Opponent +1 Pt)
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {(Object.keys(FAULT_LABELS) as UmpireFaultType[]).map((f) => {
                const info = FAULT_LABELS[f];
                const isService = info.category === 'SERVICE';
                return (
                  <button
                    key={f}
                    onClick={() => handleFault(f)}
                    className={`min-h-[60px] p-3 rounded-2xl border text-left flex flex-col justify-center active:scale-95 transition-all ${
                      isService
                        ? 'bg-neutral-900 hover:bg-neutral-800/80 border-amber-500/30 text-amber-200'
                        : 'bg-neutral-900 hover:bg-neutral-800/80 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase text-neutral-400">
                      {info.category}
                    </span>
                    <span className="text-xs font-bold tracking-tight text-white">
                      {info.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BWF Discipline Cards: Yellow / Red / Black */}
          <div className="pt-2 border-t border-neutral-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Disciplinary Cards ({selectedPlayer})
            </span>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => issueYellowCard(selectedPlayer)}
                className="min-h-[56px] rounded-2xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <span className="w-3.5 h-5 bg-yellow-400 rounded-sm shadow-md" />
                <span>Yellow (Warn)</span>
              </button>

              <button
                onClick={() => issueRedCard(selectedPlayer)}
                className="min-h-[56px] rounded-2xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <span className="w-3.5 h-5 bg-red-600 rounded-sm shadow-md" />
                <span>Red (Fault +1)</span>
              </button>

              <button
                onClick={() => issueBlackCard(selectedPlayer)}
                className="min-h-[56px] rounded-2xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-600 text-neutral-300 font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <span className="w-3.5 h-5 bg-black border border-neutral-400 rounded-sm shadow-md" />
                <span>Black (Disq)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
