import { describe, it, expect } from 'vitest';
import { generateRuleBasedInsights } from '../coachingEngine';
import { MatchAnalysisReport } from '../matchStatsCalculator';

describe('CoachingEngine', () => {
  it('generates drop shot warning when drop error rate exceeds 40%', () => {
    const mockReport: Partial<MatchAnalysisReport> = {
      totalRallies: 20,
      longestRallyShots: 12,
      maxShuttleSpeedKmh: 240,
      pressureStats: {
        totalPressurePoints: 2,
        pointsWonTeamA: 1,
        pointsWonTeamB: 1,
        pressureWinRateA: 50,
        pressureWinRateB: 50,
        comebacksTeamA: 0,
        comebacksTeamB: 0,
      },
      players: {
        A1: {
          role: 'A1',
          name: 'Viktor Axelsen',
          team: 'A',
          pointsWon: 12,
          pointsLost: 8,
          winPercentage: 60,
          winners: 5,
          unforcedErrors: 4,
          forcedErrors: 1,
          netDifferential: 1,
          smashesAttempted: 10,
          smashesWon: 6,
          smashSuccessRate: 60,
          topSmashSpeedKmh: 310,
          dropsAttempted: 10,
          dropErrors: 5, // 50% errors!
          dropSuccessRate: 50,
          servePointsPlayed: 10,
          servePointsWon: 6,
          serveWinRate: 60,
          serviceFaults: 0,
          receivePointsPlayed: 10,
          receivePointsWon: 6,
          receiveWinRate: 60,
          missedReturns: 1,
          shuttlesLeftUnreached: 0,
          netErrors: 1,
          outErrors: 3,
          pointsWonShortRally: 4,
          pointsWonMediumRally: 5,
          pointsWonLongRally: 3,
          maxScoringStreak: 4,
          distanceCoveredMeters: 450,
          avgSpeedKmh: 12,
          maxSpeedKmh: 22,
          courtCoveragePercent: 78,
          avgRecoveryTimeSec: 1.2,
          fatigueIndexPercent: 5,
          positionHistory: [],
        },
        A2: undefined as any,
        B1: undefined as any,
        B2: undefined as any,
      },
      awards: [],
      momentumTimeline: [],
      heatmaps: {
        playerPositions: [],
        shuttleLandings: [],
        smashVectors: [],
        errorLocations: [],
      },
    };

    const insights = generateRuleBasedInsights(mockReport as MatchAnalysisReport);
    expect(insights.length).toBeGreaterThan(0);
    const dropInsight = insights.find((i) => i.id === 'drop-errors-A1');
    expect(dropInsight).toBeDefined();
    expect(dropInsight?.severity).toBe('warning');
    expect(dropInsight?.description).toContain('misses 50% of drop attempts');
  });

  it('detects long rally vulnerability when a team loses majority of 8+ shot rallies', () => {
    const mockReport: Partial<MatchAnalysisReport> = {
      totalRallies: 20,
      longestRallyShots: 16,
      maxShuttleSpeedKmh: 200,
      pressureStats: {
        totalPressurePoints: 2,
        pointsWonTeamA: 1,
        pointsWonTeamB: 1,
        pressureWinRateA: 50,
        pressureWinRateB: 50,
        comebacksTeamA: 0,
        comebacksTeamB: 0,
      },
      players: {
        A1: {
          role: 'A1',
          name: 'Player A',
          team: 'A',
          pointsWon: 8,
          pointsLost: 12,
          winPercentage: 40,
          winners: 2,
          unforcedErrors: 5,
          forcedErrors: 2,
          netDifferential: -3,
          smashesAttempted: 4,
          smashesWon: 1,
          smashSuccessRate: 25,
          topSmashSpeedKmh: 180,
          dropsAttempted: 2,
          dropErrors: 0,
          dropSuccessRate: 100,
          servePointsPlayed: 8,
          servePointsWon: 3,
          serveWinRate: 37,
          serviceFaults: 0,
          receivePointsPlayed: 8,
          receivePointsWon: 3,
          receiveWinRate: 37,
          missedReturns: 2,
          shuttlesLeftUnreached: 1,
          netErrors: 1,
          outErrors: 2,
          pointsWonShortRally: 3,
          pointsWonMediumRally: 4,
          pointsWonLongRally: 1, // Only 1 long rally won
          maxScoringStreak: 2,
          distanceCoveredMeters: 500,
          avgSpeedKmh: 11,
          maxSpeedKmh: 20,
          courtCoveragePercent: 70,
          avgRecoveryTimeSec: 1.5,
          fatigueIndexPercent: 12,
          positionHistory: [],
        },
        B1: {
          role: 'B1',
          name: 'Player B',
          team: 'B',
          pointsWon: 12,
          pointsLost: 8,
          winPercentage: 60,
          winners: 6,
          unforcedErrors: 2,
          forcedErrors: 0,
          netDifferential: 4,
          smashesAttempted: 6,
          smashesWon: 4,
          smashSuccessRate: 66,
          topSmashSpeedKmh: 220,
          dropsAttempted: 4,
          dropErrors: 0,
          dropSuccessRate: 100,
          servePointsPlayed: 8,
          servePointsWon: 5,
          serveWinRate: 62,
          serviceFaults: 0,
          receivePointsPlayed: 8,
          receivePointsWon: 5,
          receiveWinRate: 62,
          missedReturns: 0,
          shuttlesLeftUnreached: 0,
          netErrors: 0,
          outErrors: 1,
          pointsWonShortRally: 2,
          pointsWonMediumRally: 2,
          pointsWonLongRally: 8, // 8 long rallies won!
          maxScoringStreak: 5,
          distanceCoveredMeters: 600,
          avgSpeedKmh: 13,
          maxSpeedKmh: 24,
          courtCoveragePercent: 85,
          avgRecoveryTimeSec: 1.1,
          fatigueIndexPercent: 4,
          positionHistory: [],
        },
        A2: undefined as any,
        B2: undefined as any,
      },
      awards: [],
      momentumTimeline: [],
      heatmaps: {
        playerPositions: [],
        shuttleLandings: [],
        smashVectors: [],
        errorLocations: [],
      },
    };

    const insights = generateRuleBasedInsights(mockReport as MatchAnalysisReport);
    const enduranceWarning = insights.find((i) => i.id === 'rally-endurance-b');
    expect(enduranceWarning).toBeDefined();
    expect(enduranceWarning?.title).toBe('Vulnerability in Extended Rallies');
  });
});
