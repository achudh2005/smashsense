/**
 * Built-in Tournament & Bracket Generation Engine
 * Supports Single Elimination, Double Elimination, and Round-Robin formats
 * with automatic winner progression and IndexedDB persistence.
 */

import { db, TournamentRecord, TournamentMatch } from '../storage/db';

export type { TournamentRecord, TournamentMatch };

export interface RoundRobinStanding {
  playerName: string;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
}

/**
 * Generates single-elimination tournament bracket structure
 */
export function generateSingleElimination(
  title: string,
  participants: string[]
): TournamentRecord {
  if (participants.length < 2) {
    throw new Error('Tournament requires at least 2 participants');
  }

  // Pad to nearest power of 2 (2, 4, 8, 16)
  const power = Math.ceil(Math.log2(participants.length));
  const bracketSize = Math.pow(2, power);
  const totalRounds = power;

  const paddedParticipants = [...participants];
  while (paddedParticipants.length < bracketSize) {
    paddedParticipants.push('BYE');
  }

  const matches: TournamentMatch[] = [];
  const rounds: TournamentMatch[][] = [];

  // Generate all rounds from finals back to round 1
  for (let r = 0; r < totalRounds; r++) {
    const roundMatchesCount = Math.pow(2, totalRounds - r - 1);
    const currentRoundMatches: TournamentMatch[] = [];

    for (let m = 0; m < roundMatchesCount; m++) {
      const matchId = `t_m_r${r + 1}_${m + 1}`;
      let playerA = 'TBD';
      let playerB = 'TBD';

      // First round gets actual participants
      if (r === 0) {
        playerA = paddedParticipants[m * 2] || 'TBD';
        playerB = paddedParticipants[m * 2 + 1] || 'TBD';
      }

      const match: TournamentMatch = {
        id: matchId,
        roundIndex: r + 1,
        matchIndex: m + 1,
        playerA,
        playerB,
        isCompleted: false,
      };

      // Handle automatic BYE advancement in round 1
      if (r === 0) {
        if (playerA === 'BYE' && playerB !== 'BYE' && playerB !== 'TBD') {
          match.winner = playerB;
          match.isCompleted = true;
          match.scoreA = 0;
          match.scoreB = 21;
        } else if (playerB === 'BYE' && playerA !== 'BYE' && playerA !== 'TBD') {
          match.winner = playerA;
          match.isCompleted = true;
          match.scoreA = 21;
          match.scoreB = 0;
        }
      }

      currentRoundMatches.push(match);
      matches.push(match);
    }
    rounds.push(currentRoundMatches);
  }

  // Link matches to their next round target match
  for (let r = 0; r < totalRounds - 1; r++) {
    const curRound = rounds[r];
    const nextRound = rounds[r + 1];

    curRound.forEach((match, idx) => {
      const nextMatchIdx = Math.floor(idx / 2);
      const nextMatch = nextRound[nextMatchIdx];
      if (nextMatch) {
        match.nextMatchId = nextMatch.id;
        // If match had a BYE winner, forward immediately to next match
        if (match.isCompleted && match.winner) {
          if (idx % 2 === 0) nextMatch.playerA = match.winner;
          else nextMatch.playerB = match.winner;
        }
      }
    });
  }

  return {
    title,
    format: 'single_elimination',
    participants,
    matches,
    status: 'IN_PROGRESS',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Generates a round-robin schedule where every participant plays every other participant
 */
export function generateRoundRobin(
  title: string,
  participants: string[]
): TournamentRecord {
  if (participants.length < 2) {
    throw new Error('Tournament requires at least 2 participants');
  }

  const matches: TournamentMatch[] = [];
  let matchIndex = 1;

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({
        id: `rr_m_${matchIndex}`,
        roundIndex: 1,
        matchIndex: matchIndex++,
        playerA: participants[i],
        playerB: participants[j],
        isCompleted: false,
      });
    }
  }

  return {
    title,
    format: 'round_robin',
    participants,
    matches,
    status: 'IN_PROGRESS',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Updates a match result and advances the winner in single elimination
 */
export function updateTournamentMatchResult(
  tournament: TournamentRecord,
  matchId: string,
  scoreA: number,
  scoreB: number
): TournamentRecord {
  const updatedMatches = tournament.matches.map((m) => ({ ...m }));
  const match = updatedMatches.find((m) => m.id === matchId);

  if (!match) return tournament;

  const winner = scoreA > scoreB ? match.playerA : match.playerB;
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.winner = winner;
  match.isCompleted = true;

  // Advance winner to next round match in single elimination
  if (match.nextMatchId) {
    const nextMatch = updatedMatches.find((m) => m.id === match.nextMatchId);
    if (nextMatch) {
      // If current match index is even/odd determines slot A or B
      if (match.matchIndex % 2 === 1) {
        nextMatch.playerA = winner;
      } else {
        nextMatch.playerB = winner;
      }
    }
  }

  // Check if finals completed
  const allCompleted = updatedMatches.every((m) => m.isCompleted);
  let champion = tournament.champion;
  let status = tournament.status;

  if (tournament.format === 'single_elimination') {
    const finalMatch = updatedMatches[updatedMatches.length - 1];
    if (finalMatch && finalMatch.isCompleted && finalMatch.winner) {
      champion = finalMatch.winner;
      status = 'COMPLETED';
    }
  } else if (allCompleted) {
    status = 'COMPLETED';
    const standings = calculateRoundRobinStandings({ ...tournament, matches: updatedMatches });
    if (standings.length > 0) {
      champion = standings[0].playerName;
    }
  }

  return {
    ...tournament,
    matches: updatedMatches,
    status,
    champion,
    updatedAt: Date.now(),
  };
}

/**
 * Calculates Round-Robin standings table with tie-breakers
 */
export function calculateRoundRobinStandings(
  tournament: TournamentRecord
): RoundRobinStanding[] {
  const standingsMap: Record<string, RoundRobinStanding> = {};

  tournament.participants.forEach((name) => {
    standingsMap[name] = {
      playerName: name,
      played: 0,
      won: 0,
      lost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
    };
  });

  tournament.matches.forEach((m) => {
    if (!m.isCompleted || m.scoreA === undefined || m.scoreB === undefined) return;

    const sA = standingsMap[m.playerA];
    const sB = standingsMap[m.playerB];

    if (sA) {
      sA.played++;
      sA.pointsFor += m.scoreA;
      sA.pointsAgainst += m.scoreB;
      sA.pointDiff = sA.pointsFor - sA.pointsAgainst;
      if (m.scoreA > m.scoreB) sA.won++;
      else sA.lost++;
    }

    if (sB) {
      sB.played++;
      sB.pointsFor += m.scoreB;
      sB.pointsAgainst += m.scoreA;
      sB.pointDiff = sB.pointsFor - sB.pointsAgainst;
      if (m.scoreB > m.scoreA) sB.won++;
      else sB.lost++;
    }
  });

  return Object.values(standingsMap).sort((a, b) => {
    // 1. Most wins
    if (b.won !== a.won) return b.won - a.won;
    // 2. Point differential
    return b.pointDiff - a.pointDiff;
  });
}

export class TournamentManager {
  public async save(tournament: TournamentRecord): Promise<number> {
    const id = await db.tournaments.put(tournament);
    return Number(id);
  }

  public async getAll(): Promise<TournamentRecord[]> {
    return db.tournaments.toArray();
  }

  public async getById(id: number): Promise<TournamentRecord | undefined> {
    return db.tournaments.get(id);
  }

  public async delete(id: number): Promise<void> {
    await db.tournaments.delete(id);
  }
}

export const tournamentManager = new TournamentManager();
