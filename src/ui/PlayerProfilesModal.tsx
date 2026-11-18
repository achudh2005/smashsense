import React, { useState, useEffect, useCallback } from 'react';
import { playerProfileService, HeadToHeadRecord } from '../history/playerProfileService';
import { PlayerProfileRecord } from '../storage/db';
import {
  X,
  Users,
  Trophy,
  Flame,
  Swords,
  TrendingUp,
  Award,
  UserPlus,
} from 'lucide-react';

interface PlayerProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerProfilesModal: React.FC<PlayerProfilesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [profiles, setProfiles] = useState<PlayerProfileRecord[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfileRecord | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHeadRecord | null>(null);
  const [opponentName, setOpponentName] = useState<string>('');
  const [newPlayerName, setNewPlayerName] = useState('');

  const loadData = useCallback(async () => {
    const list = await playerProfileService.getAllProfiles();
    setProfiles(list);
    if (list.length > 0 && !selectedPlayer) {
      setSelectedPlayer(list[0]);
    }
  }, [selectedPlayer]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  useEffect(() => {
    if (selectedPlayer && opponentName && selectedPlayer.name !== opponentName) {
      playerProfileService.getHeadToHead(selectedPlayer.name, opponentName).then(setHeadToHead);
    } else {
      setHeadToHead(null);
    }
  }, [selectedPlayer, opponentName]);

  if (!isOpen) return null;

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const created = await playerProfileService.getOrCreateProfile(newPlayerName.trim());
    setNewPlayerName('');
    await loadData();
    setSelectedPlayer(created);
  };

  return (
    <div
      role="dialog"
      aria-label="Player Profiles & History"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Player Profiles &amp; Career Records
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono px-2 py-0.5 rounded border border-sky-500/30">
                  {profiles.length} Players
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personal bests, head-to-head records, and historical progression
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Layout: Master-Detail */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Left: Players List */}
          <div className="p-4 overflow-y-auto space-y-3">
            <form onSubmit={handleCreateProfile} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="New player name..."
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="flex-1 bg-slate-950 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 text-slate-200"
              />
              <button
                type="submit"
                className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors"
                title="Add Player Profile"
              >
                <UserPlus size={14} />
              </button>
            </form>

            <div className="space-y-1.5">
              {profiles.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No player profiles found. Add one above or finish a match!
                </div>
              ) : (
                profiles.map((p) => {
                  const isSelected = selectedPlayer?.name === p.name;
                  return (
                    <div
                      key={p.name}
                      onClick={() => setSelectedPlayer(p)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-sky-950/40 border-sky-500 shadow-md'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {p.totalMatches} matches • {p.winRate}% win rate
                        </div>
                      </div>
                      {p.topSmashSpeedKmh > 0 && (
                        <div className="text-[11px] font-mono font-bold text-amber-400">
                          {p.topSmashSpeedKmh}k
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Selected Player Detail */}
          <div className="md:col-span-2 p-6 overflow-y-auto space-y-6">
            {selectedPlayer ? (
              <>
                {/* Profile Header Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-r from-sky-500/10 via-slate-950 to-transparent border border-sky-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-2xl">
                      {selectedPlayer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">{selectedPlayer.name}</h3>
                      <p className="text-xs text-slate-400">
                        {selectedPlayer.totalMatches} Matches Played • {selectedPlayer.matchesWon} Won /{' '}
                        {selectedPlayer.matchesLost} Lost
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-500 uppercase font-sans block">
                      Win Percentage
                    </span>
                    <span className="text-2xl font-black text-emerald-400">
                      {selectedPlayer.winRate}%
                    </span>
                  </div>
                </div>

                {/* Personal Bests Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Trophy size={14} className="text-amber-400" />
                    <span>Personal Career Bests</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                        <Flame size={13} className="text-amber-400" />
                        <span>Top Smash</span>
                      </div>
                      <div className="text-xl font-black font-mono text-amber-300">
                        {selectedPlayer.topSmashSpeedKmh > 0
                          ? `${selectedPlayer.topSmashSpeedKmh} km/h`
                          : '--'}
                      </div>
                    </div>

                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                        <TrendingUp size={13} className="text-emerald-400" />
                        <span>Best Streak</span>
                      </div>
                      <div className="text-xl font-black font-mono text-emerald-300">
                        {selectedPlayer.bestScoringStreak > 0
                          ? `${selectedPlayer.bestScoringStreak} pts`
                          : '--'}
                      </div>
                    </div>

                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                        <Award size={13} className="text-purple-400" />
                        <span>Total Smashes</span>
                      </div>
                      <div className="text-xl font-black font-mono text-purple-300">
                        {selectedPlayer.totalSmashes}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Head-to-Head Comparison Tool */}
                <div className="bg-slate-950/50 p-5 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Swords size={14} className="text-sky-400" />
                      <span>Head-to-Head Rivalry Record</span>
                    </h4>

                    {/* Opponent Selector */}
                    <select
                      value={opponentName}
                      onChange={(e) => setOpponentName(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-2.5 py-1 focus:outline-none"
                    >
                      <option value="">Select Opponent...</option>
                      {profiles
                        .filter((p) => p.name !== selectedPlayer.name)
                        .map((p) => (
                          <option key={p.name} value={p.name}>
                            vs {p.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {headToHead ? (
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div className="text-center flex-1">
                        <div className="font-bold text-sky-400 text-sm">{headToHead.playerA}</div>
                        <div className="text-3xl font-black font-mono text-white mt-1">
                          {headToHead.winsA}
                        </div>
                      </div>

                      <div className="px-4 text-xs font-mono font-bold text-slate-500 uppercase">
                        {headToHead.totalEncounters} Encounters
                      </div>

                      <div className="text-center flex-1">
                        <div className="font-bold text-orange-400 text-sm">{headToHead.playerB}</div>
                        <div className="text-3xl font-black font-mono text-white mt-1">
                          {headToHead.winsB}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-500">
                      Select an opponent above to view historical Head-to-Head win/loss records.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Select a player on the left to view their career profile and statistics.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
