import { db, PlayerProfileRecord } from '../storage/db';
import { MatchAnalysisReport } from '../stats/matchStatsCalculator';

export interface HeadToHeadRecord {
  playerA: string;
  playerB: string;
  totalEncounters: number;
  winsA: number;
  winsB: number;
  lastPlayedAt: number;
}

export interface PlayerPersonalBests {
  playerName: string;
  topSmashSpeedKmh: number;
  longestScoringStreak: number;
  highestWinRatePercent: number;
  totalMatchesWon: number;
}

export interface PlayerWeeklyTrend {
  weekLabel: string;
  matchesPlayed: number;
  winRate: number;
  avgSmashSpeed: number;
}

export class PlayerProfileService {
  /**
   * Fetch all player profiles from IndexedDB
   */
  public async getAllProfiles(): Promise<PlayerProfileRecord[]> {
    return await db.playerProfiles.orderBy('name').toArray();
  }

  /**
   * Get or create a player profile
   */
  public async getOrCreateProfile(name: string): Promise<PlayerProfileRecord> {
    const existing = await db.playerProfiles.where('name').equalsIgnoreCase(name.trim()).first();
    if (existing) return existing;

    const newProfile: PlayerProfileRecord = {
      name: name.trim(),
      totalMatches: 0,
      matchesWon: 0,
      matchesLost: 0,
      winRate: 0,
      topSmashSpeedKmh: 0,
      totalSmashes: 0,
      bestScoringStreak: 0,
      updatedAt: Date.now(),
    };

    const id = await db.playerProfiles.add(newProfile);
    newProfile.id = Number(id);
    return newProfile;
  }

  /**
   * Automatically updates player profiles when a match concludes
   */
  public async recordMatchCompletion(
    winnerNames: string[],
    loserNames: string[],
    report: MatchAnalysisReport
  ): Promise<void> {
    for (const name of winnerNames) {
      if (!name) continue;
      const profile = await this.getOrCreateProfile(name);
      profile.totalMatches++;
      profile.matchesWon++;
      profile.winRate = Math.round((profile.matchesWon / profile.totalMatches) * 100);

      // Check stats from report
      const playerStat = Object.values(report.players).find(
        (p) => p && p.name.toLowerCase() === name.toLowerCase()
      );
      if (playerStat) {
        if (playerStat.topSmashSpeedKmh > profile.topSmashSpeedKmh) {
          profile.topSmashSpeedKmh = playerStat.topSmashSpeedKmh;
        }
        profile.totalSmashes += playerStat.smashesAttempted;
        if (playerStat.maxScoringStreak > profile.bestScoringStreak) {
          profile.bestScoringStreak = playerStat.maxScoringStreak;
        }
      }
      profile.updatedAt = Date.now();
      await db.playerProfiles.put(profile);
    }

    for (const name of loserNames) {
      if (!name) continue;
      const profile = await this.getOrCreateProfile(name);
      profile.totalMatches++;
      profile.matchesLost++;
      profile.winRate = Math.round((profile.matchesWon / profile.totalMatches) * 100);

      const playerStat = Object.values(report.players).find(
        (p) => p && p.name.toLowerCase() === name.toLowerCase()
      );
      if (playerStat) {
        if (playerStat.topSmashSpeedKmh > profile.topSmashSpeedKmh) {
          profile.topSmashSpeedKmh = playerStat.topSmashSpeedKmh;
        }
        profile.totalSmashes += playerStat.smashesAttempted;
      }
      profile.updatedAt = Date.now();
      await db.playerProfiles.put(profile);
    }
  }

  /**
   * Calculates Head-to-Head record between two players from match history
   */
  public async getHeadToHead(playerA: string, playerB: string): Promise<HeadToHeadRecord> {
    const matches = await db.matches.toArray();
    let winsA = 0;
    let winsB = 0;
    let lastPlayed = 0;

    for (const m of matches) {
      const teamAHasPlayerA = m.teamANames.some((n) => n.toLowerCase() === playerA.toLowerCase());
      const teamBHasPlayerA = m.teamBNames.some((n) => n.toLowerCase() === playerA.toLowerCase());

      const teamAHasPlayerB = m.teamANames.some((n) => n.toLowerCase() === playerB.toLowerCase());
      const teamBHasPlayerB = m.teamBNames.some((n) => n.toLowerCase() === playerB.toLowerCase());

      if ((teamAHasPlayerA && teamBHasPlayerB) || (teamBHasPlayerA && teamAHasPlayerB)) {
        if (m.createdAt > lastPlayed) lastPlayed = m.createdAt;

        const teamAWon = m.scoreA > m.scoreB;
        if (teamAHasPlayerA) {
          if (teamAWon) winsA++;
          else winsB++;
        } else {
          if (teamAWon) winsB++;
          else winsA++;
        }
      }
    }

    return {
      playerA,
      playerB,
      totalEncounters: winsA + winsB,
      winsA,
      winsB,
      lastPlayedAt: lastPlayed,
    };
  }

  /**
   * Get personal best records across all players or for a specific player
   */
  public async getPersonalBests(playerName: string): Promise<PlayerPersonalBests> {
    const profile = await this.getOrCreateProfile(playerName);
    return {
      playerName: profile.name,
      topSmashSpeedKmh: profile.topSmashSpeedKmh,
      longestScoringStreak: profile.bestScoringStreak,
      highestWinRatePercent: profile.winRate,
      totalMatchesWon: profile.matchesWon,
    };
  }
}

export const playerProfileService = new PlayerProfileService();
