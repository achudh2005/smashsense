import { describe, it, expect } from 'vitest';
import { calculateWinProbability } from '../winProbabilityEngine';
import { GameStateSnapshot } from '../../game/scoringEngine';
import { DetailedMatchEvent } from '../matchEventModel';

describe('Win Probability & Momentum Engine', () => {
  const baseSnap: GameStateSnapshot = {
    gameIndex: 1,
    scoreA: 0,
    scoreB: 0,
    servingSide: 'A',
    currentServer: 'A1',
    currentReceiver: 'B1',
    positions: {
      A1: { court: 'right', isServingOrReceiving: true },
      B1: { court: 'right', isServingOrReceiving: true },
    },
    isInterval: false,
    sidesSwapped: false,
    isGameOver: false,
    isMatchOver: false,
    gamesWonA: 0,
    gamesWonB: 0,
  };

  it('evaluates starting 0-0 match near 50-50 probability', () => {
    const res = calculateWinProbability(baseSnap, []);
    expect(res.winProbabilityA).toBeGreaterThanOrEqual(48);
    expect(res.winProbabilityA).toBeLessThanOrEqual(54);
    expect(res.winProbabilityA + res.winProbabilityB).toBe(100);
  });

  it('increases Team A probability significantly when holding a dominant lead', () => {
    const dominantSnap: GameStateSnapshot = {
      ...baseSnap,
      scoreA: 18,
      scoreB: 9,
    };
    const res = calculateWinProbability(dominantSnap, []);
    expect(res.winProbabilityA).toBeGreaterThan(85);
    expect(res.winProbabilityB).toBeLessThan(15);
  });

  it('awards 100% win probability upon game/match completion', () => {
    const overSnap: GameStateSnapshot = {
      ...baseSnap,
      scoreA: 21,
      scoreB: 15,
      isGameOver: true,
      matchWinner: 'A',
      gamesWonA: 2,
      gamesWonB: 0,
    };
    const res = calculateWinProbability(overSnap, []);
    expect(res.winProbabilityA).toBe(100);
    expect(res.winProbabilityB).toBe(0);
    expect(res.statusText).toContain('Won the Match');
  });

  it('tracks momentum swing and trendline across recent rallies', () => {
    const events: DetailedMatchEvent[] = [];
    // Team A wins 6 consecutive points
    for (let i = 1; i <= 6; i++) {
      events.push({
        id: `ev-${i}`,
        rallyNumber: i,
        gameIndex: 1,
        timestamp: i * 1000,
        shotType: 'smash',
        shotZone: 'Mid-Center',
        shotZoneIndex: 5,
        winner: { team: 'A', playerRole: 'A1', playerName: 'Viktor Axelsen' },
        rallyLength: { shotCount: 4, durationSeconds: 2 },
        server: { team: 'A', playerRole: 'A1' },
        scoreState: { scoreA: i, scoreB: 0, lead: i, isGamePoint: false, isMatchPoint: false, isIntervalPoint: false },
        shuttleSpeedKmh: 340,
        pointType: 'WINNER',
      });
    }

    const res = calculateWinProbability({ ...baseSnap, scoreA: 6, scoreB: 0 }, events);
    expect(res.momentumScore).toBeGreaterThan(50);
    expect(res.momentumDominantTeam).toBe('A');
    expect(res.momentumTrend.length).toBeGreaterThan(0);
    expect(res.statusText).toContain('Surge');
  });
});
