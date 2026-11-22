import React, { useState, useEffect, useCallback } from 'react';
import {
  TournamentRecord,
  TournamentMatch,
  generateSingleElimination,
  generateRoundRobin,
  updateTournamentMatchResult,
  calculateRoundRobinStandings,
  tournamentManager,
} from '../tournament/tournamentManager';
import { useSmashSenseStore } from '../game/gameState';
import {
  X,
  Trophy,
  Plus,
  Play,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { haptics } from '../utils/haptics';

interface TournamentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TournamentManagerModal: React.FC<TournamentManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Creation form state
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<'single_elimination' | 'round_robin'>('single_elimination');
  const [participantsInput, setParticipantsInput] = useState('');

  // Manual score dialog state
  const [scoringMatch, setScoringMatch] = useState<TournamentMatch | null>(null);
  const [inputScoreA, setInputScoreA] = useState('21');
  const [inputScoreB, setInputScoreB] = useState('18');

  const updateConfig = useSmashSenseStore((s) => s.updateConfig);

  const loadTournaments = useCallback(async () => {
    const list = await tournamentManager.getAll();
    setTournaments(list);
    if (list.length > 0 && !selectedTournament) {
      setSelectedTournament(list[list.length - 1]);
    }
  }, [selectedTournament]);

  useEffect(() => {
    if (isOpen) {
      loadTournaments();
    }
  }, [isOpen, loadTournaments]);

  if (!isOpen) return null;

  const handleCreateTournament = async () => {
    if (!title.trim()) return;

    const names = participantsInput
      .split(/[,\n]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length < 2) return;

    const t = format === 'single_elimination'
      ? generateSingleElimination(title.trim(), names)
      : generateRoundRobin(title.trim(), names);

    const id = await tournamentManager.save(t);
    t.id = id;

    setTournaments((prev) => [...prev, t]);
    setSelectedTournament(t);
    setIsCreating(false);
    setTitle('');
    setParticipantsInput('');
    haptics.success();
  };

  const handleDeleteTournament = async (id: number) => {
    await tournamentManager.delete(id);
    setTournaments((prev) => prev.filter((t) => t.id !== id));
    if (selectedTournament?.id === id) {
      setSelectedTournament(null);
    }
    haptics.warning();
  };

  const handlePlayInCamera = (match: TournamentMatch) => {
    if (match.playerA === 'TBD' || match.playerB === 'TBD') return;

    // Update match config in SmashSense state
    updateConfig({
      teamANames: { A1: match.playerA },
      teamBNames: { B1: match.playerB },
      format: 'singles',
    });

    haptics.success();
    onClose();
  };

  const handleSaveScore = async () => {
    if (!selectedTournament || !scoringMatch) return;

    const sA = parseInt(inputScoreA) || 0;
    const sB = parseInt(inputScoreB) || 0;

    const updated = updateTournamentMatchResult(selectedTournament, scoringMatch.id, sA, sB);
    await tournamentManager.save(updated);

    setSelectedTournament(updated);
    setTournaments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setScoringMatch(null);
    haptics.success();
  };

  const handlePreset = (count: 4 | 8) => {
    if (count === 4) {
      setParticipantsInput('Viktor Axelsen, Lee Zii Jia, Shi Yuqi, Anders Antonsen');
    } else {
      setParticipantsInput('Viktor Axelsen, Lee Zii Jia, Shi Yuqi, Anders Antonsen, Chou Tien Chen, Anthony Ginting, Jonatan Christie, Kodai Naraoka');
    }
  };

  // Group matches by round for bracket view
  const roundsGrouped: Record<number, TournamentMatch[]> = {};
  if (selectedTournament) {
    selectedTournament.matches.forEach((m) => {
      if (!roundsGrouped[m.roundIndex]) roundsGrouped[m.roundIndex] = [];
      roundsGrouped[m.roundIndex].push(m);
    });
  }

  const roundRobinStandings = selectedTournament && selectedTournament.format === 'round_robin'
    ? calculateRoundRobinStandings(selectedTournament)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-lg animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">Tournament & Bracket Manager</h2>
                {selectedTournament?.champion && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Champion: {selectedTournament.champion}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">Single elimination brackets & round-robin tournament schedules</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Tournament
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tournament Selector Bar */}
        {tournaments.length > 0 && !isCreating && (
          <div className="px-6 py-2.5 border-b border-neutral-800 bg-neutral-900/40 flex items-center gap-2 overflow-x-auto shrink-0">
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTournament(t)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedTournament?.id === t.id
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                <span>{t.title}</span>
                <span className="opacity-75 text-[10px]">({t.participants.length}P)</span>
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isCreating ? (
            /* CREATION VIEW */
            <div className="max-w-xl mx-auto space-y-5 p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Create New Tournament
                </h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Tournament Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Summer Smash Open 2026"
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Tournament Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormat('single_elimination')}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        format === 'single_elimination'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      Single Elimination (Bracket)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat('round_robin')}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        format === 'round_robin'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      Round-Robin (All-Play-All)
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-neutral-400 font-medium">Participant Player Names</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handlePreset(4)}
                        className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      >
                        4 Players Preset
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePreset(8)}
                        className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      >
                        8 Players Preset
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={participantsInput}
                    onChange={(e) => setParticipantsInput(e.target.value)}
                    placeholder="Enter player names separated by commas or lines..."
                    className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-100 text-xs font-sans leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleCreateTournament}
                  disabled={!title.trim() || !participantsInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs transition-colors"
                >
                  Generate Tournament Bracket
                </button>
              </div>
            </div>
          ) : selectedTournament ? (
            /* BRACKET OR ROUND ROBIN VIEW */
            <div className="space-y-6">
              {/* Tournament Title & Actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedTournament.title}
                    <span className="text-xs font-normal text-neutral-400 font-mono">
                      ({selectedTournament.format === 'single_elimination' ? 'Single Elimination' : 'Round-Robin'})
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {selectedTournament.participants.length} Players • Created on {new Date(selectedTournament.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {selectedTournament.id && (
                  <button
                    onClick={() => handleDeleteTournament(selectedTournament.id!)}
                    className="p-2 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    title="Delete Tournament"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* SINGLE ELIMINATION BRACKET */}
              {selectedTournament.format === 'single_elimination' ? (
                <div className="flex gap-6 overflow-x-auto pb-4">
                  {Object.entries(roundsGrouped).map(([roundNum, matches]) => (
                    <div key={roundNum} className="w-64 shrink-0 space-y-4">
                      <div className="text-xs font-black uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-1.5 flex items-center justify-between">
                        <span>
                          {parseInt(roundNum) === Object.keys(roundsGrouped).length
                            ? '🏆 Championship Final'
                            : `Round ${roundNum}`}
                        </span>
                        <span className="text-[10px] text-neutral-500">{matches.length} Matches</span>
                      </div>

                      <div className="space-y-3">
                        {matches.map((m) => {
                          const isTbd = m.playerA === 'TBD' || m.playerB === 'TBD';
                          const isBye = m.playerA === 'BYE' || m.playerB === 'BYE';

                          return (
                            <div
                              key={m.id}
                              className={`p-3 rounded-2xl border text-xs transition-all ${
                                m.isCompleted
                                  ? 'bg-neutral-900/60 border-neutral-800'
                                  : 'bg-neutral-900 border-neutral-700 shadow-md'
                              }`}
                            >
                              {/* Player A Row */}
                              <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                                <span
                                  className={`truncate font-medium ${
                                    m.winner === m.playerA ? 'text-amber-300 font-bold' : 'text-neutral-200'
                                  }`}
                                >
                                  {m.playerA}
                                </span>
                                <span className="font-mono font-bold text-neutral-300">
                                  {m.scoreA !== undefined ? m.scoreA : '—'}
                                </span>
                              </div>

                              {/* Player B Row */}
                              <div className="flex items-center justify-between py-1">
                                <span
                                  className={`truncate font-medium ${
                                    m.winner === m.playerB ? 'text-amber-300 font-bold' : 'text-neutral-200'
                                  }`}
                                >
                                  {m.playerB}
                                </span>
                                <span className="font-mono font-bold text-neutral-300">
                                  {m.scoreB !== undefined ? m.scoreB : '—'}
                                </span>
                              </div>

                              {/* Match Actions */}
                              {!m.isCompleted && !isTbd && !isBye && (
                                <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center gap-2">
                                  <button
                                    onClick={() => handlePlayInCamera(m)}
                                    className="flex-1 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    Play Match
                                  </button>
                                  <button
                                    onClick={() => setScoringMatch(m)}
                                    className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px]"
                                  >
                                    Score
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ROUND ROBIN VIEW */
                <div className="space-y-6">
                  {/* Standings Table */}
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
                    <div className="px-5 py-3 border-b border-neutral-800 font-bold text-xs text-neutral-200">
                      Tournament Standings
                    </div>
                    <table className="w-full text-xs text-left">
                      <thead className="bg-neutral-900 text-neutral-400 font-mono text-[11px] uppercase">
                        <tr>
                          <th className="px-4 py-2.5">Rank</th>
                          <th className="px-4 py-2.5">Player</th>
                          <th className="px-3 py-2.5 text-center">P</th>
                          <th className="px-3 py-2.5 text-center">W</th>
                          <th className="px-3 py-2.5 text-center">L</th>
                          <th className="px-3 py-2.5 text-center">Diff</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60 font-medium">
                        {roundRobinStandings.map((s, idx) => (
                          <tr key={s.playerName} className="hover:bg-neutral-800/40">
                            <td className="px-4 py-2.5 font-bold text-amber-400">#{idx + 1}</td>
                            <td className="px-4 py-2.5 text-white font-semibold">{s.playerName}</td>
                            <td className="px-3 py-2.5 text-center font-mono">{s.played}</td>
                            <td className="px-3 py-2.5 text-center font-mono text-emerald-400">{s.won}</td>
                            <td className="px-3 py-2.5 text-center font-mono text-rose-400">{s.lost}</td>
                            <td className="px-3 py-2.5 text-center font-mono">
                              {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Round Robin Match Schedule */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Matches Schedule ({selectedTournament.matches.length} Total)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedTournament.matches.map((m) => (
                        <div
                          key={m.id}
                          className="p-3.5 rounded-2xl border border-neutral-800 bg-neutral-900/50 text-xs flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-bold text-neutral-200">
                              {m.playerA} vs {m.playerB}
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              {m.isCompleted ? `Result: ${m.scoreA} - ${m.scoreB} (${m.winner} won)` : 'Pending match'}
                            </div>
                          </div>

                          {!m.isCompleted && (
                            <button
                              onClick={() => handlePlayInCamera(m)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] shrink-0"
                            >
                              Play
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <Trophy className="w-8 h-8 text-neutral-600" />
              <p className="text-xs">No tournaments found. Create your first bracket!</p>
            </div>
          )}
        </div>

        {/* Manual Scoring Submodal */}
        {scoringMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4 text-xs text-neutral-100 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="font-bold">Enter Match Score</span>
                <button onClick={() => setScoringMatch(null)}>
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium truncate flex-1">{scoringMatch.playerA}</span>
                  <input
                    type="number"
                    value={inputScoreA}
                    onChange={(e) => setInputScoreA(e.target.value)}
                    className="w-16 px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-center font-mono font-bold"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium truncate flex-1">{scoringMatch.playerB}</span>
                  <input
                    type="number"
                    value={inputScoreB}
                    onChange={(e) => setInputScoreB(e.target.value)}
                    className="w-16 px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-center font-mono font-bold"
                  />
                </div>

                <button
                  onClick={handleSaveScore}
                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold"
                >
                  Confirm Match Score
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
