import { describe, it, expect } from 'vitest';
import {
  generateTacticalAdvice,
  isCoachIntervalTrigger,
} from '../tacticalSuggestionEngine';
import { DetailedMatchEvent } from '../matchEventModel';
import { GameStateSnapshot } from '../../game/scoringEngine';

describe('Tactical Suggestion Engine (In-Game Coach)', () => {
  const playerNames = {
    A1: 'Viktor Axelsen',
    A2: 'Partner A',
    B1: 'Lee Zii Jia',
    B2: 'Partner B',
  };

  const defaultSnap: GameStateSnapshot = {
    gameIndex: 1,
    scoreA: 11,
    scoreB: 7,
    servingSide: 'A',
    currentServer: 'A1',
    currentReceiver: 'B1',
    positions: {
      A1: { court: 'left', isServingOrReceiving: true },
      B1: { court: 'left', isServingOrReceiving: true },
    },
    isInterval: true,
    intervalType: 'mid_game_11',
    sidesSwapped: false,
    isGameOver: false,
    isMatchOver: false,
    gamesWonA: 0,
    gamesWonB: 0,
  };

  it('triggers coach interval check at 11 points or game completion', () => {
    expect(isCoachIntervalTrigger(defaultSnap)).toBe(true);
    expect(isCoachIntervalTrigger({ ...defaultSnap, scoreA: 8, scoreB: 6 })).toBe(false);
    expect(isCoachIntervalTrigger({ ...defaultSnap, isGameOver: true })).toBe(true);
  });

  it('detects opponent weakness on specific strokes with real derived percentage', () => {
    // Generate events where opponent Lee Zii Jia makes 4 errors out of 5 clears
    const events: DetailedMatchEvent[] = [
      {
        id: '1',
        rallyNumber: 1,
        gameIndex: 1,
        timestamp: 1000,
        shotType: 'clear',
        shotZone: 'Back-Right',
        shotZoneIndex: 9,
        winner: { team: 'A', playerRole: 'A1', playerName: 'Viktor Axelsen' },
        errorType: 'OUT',
        rallyLength: { shotCount: 6, durationSeconds: 4 },
        server: { team: 'A', playerRole: 'A1' },
        scoreState: { scoreA: 1, scoreB: 0, lead: 1, isGamePoint: false, isMatchPoint: false, isIntervalPoint: false },
        shuttleSpeedKmh: 260,
        pointType: 'UNFORCED_ERROR',
      },
      {
        id: '2',
        rallyNumber: 2,
        gameIndex: 1,
        timestamp: 2000,
        shotType: 'clear',
        shotZone: 'Back-Left',
        shotZoneIndex: 7,
        winner: { team: 'A', playerRole: 'A1', playerName: 'Viktor Axelsen' },
        errorType: 'OUT',
        rallyLength: { shotCount: 8, durationSeconds: 6 },
        server: { team: 'A', playerRole: 'A1' },
        scoreState: { scoreA: 2, scoreB: 0, lead: 2, isGamePoint: false, isMatchPoint: false, isIntervalPoint: false },
        shuttleSpeedKmh: 240,
        pointType: 'UNFORCED_ERROR',
      },
      {
        id: '3',
        rallyNumber: 3,
        gameIndex: 1,
        timestamp: 3000,
        shotType: 'clear',
        shotZone: 'Back-Right',
        shotZoneIndex: 9,
        winner: { team: 'A', playerRole: 'A1', playerName: 'Viktor Axelsen' },
        errorType: 'NET',
        rallyLength: { shotCount: 5, durationSeconds: 3 },
        server: { team: 'A', playerRole: 'A1' },
        scoreState: { scoreA: 3, scoreB: 0, lead: 3, isGamePoint: false, isMatchPoint: false, isIntervalPoint: false },
        shuttleSpeedKmh: 270,
        pointType: 'FORCED_ERROR',
      },
      {
        id: '4',
        rallyNumber: 4,
        gameIndex: 1,
        timestamp: 4000,
        shotType: 'clear',
        shotZone: 'Back-Center',
        shotZoneIndex: 8,
        winner: { team: 'B', playerRole: 'B1', playerName: 'Lee Zii Jia' },
        rallyLength: { shotCount: 7, durationSeconds: 5 },
        server: { team: 'B', playerRole: 'B1' },
        scoreState: { scoreA: 3, scoreB: 1, lead: 2, isGamePoint: false, isMatchPoint: false, isIntervalPoint: false },
        shuttleSpeedKmh: 290,
        pointType: 'WINNER',
      },
      {
        id: '5',
        rallyNumber: 5,
        gameIndex: 1,
        timestamp: 5000,
        shotType: 'clear',
        shotZone: 'Back-Left',
        shotZoneIndex: 7,
        winner: { team: 'A', playerRole: 'A1', playerName: 'Viktor Axelsen' },
        errorType: 'OUT',
        rallyLength: { shotCount: 9, durationSeconds: 7 },
        server: { team: 'A', playerRole: 'A1' },
        scoreState: { scoreA: 4, scoreB: 1, lead: 3, isGamePoint: false, isMatchPoint: false, isIntervalPoint: false },
        shuttleSpeedKmh: 250,
        pointType: 'UNFORCED_ERROR',
      },
      {
        id: '6',
        rallyNumber: 6,
        gameIndex: 1,
        timestamp: 6000,
        shotType: 'drop',
        shotZone: 'Front-Right',
        shotZoneIndex: 3,
        winner: { team: 'A', playerRole: 'A1', playerName: 'Viktor Axelsen' },
        rallyLength: { shotCount: 4, durationSeconds: 2 },
        server: { team: 'A', playerRole: 'A1' },
        scoreState: { scoreA: 5, scoreB: 1, lead: 4, isGamePoint: false, isMatchPoint: false, isIntervalPoint: false },
        shuttleSpeedKmh: 180,
        pointType: 'WINNER',
      },
    ];

    const report = generateTacticalAdvice(events, defaultSnap, playerNames, 'A');

    expect(report.adviceList.length).toBeGreaterThan(0);
    const oppTip = report.adviceList.find((a) => a.category === 'opponent_weakness');
    expect(oppTip).toBeDefined();
    expect(oppTip?.headline).toContain('clears');
    expect(oppTip?.derivedMetric).toContain('80% error rate on clear');
  });

  it('identifies top target zone with real winning percentage', () => {
    // Generate events where 4 out of 5 winning points landed in Zone 3 (Front-Right)
    const events: DetailedMatchEvent[] = [];
    for (let i = 1; i <= 4; i++) {
      events.push({
        id: `z-${i}`,
        rallyNumber: i,
        gameIndex: 1,
        timestamp: i * 1000,
        shotType: 'net_shot',
        shotZone: 'Front-Right',
        shotZoneIndex: 3,
        winner: { team: 'A', playerRole: 'A1', playerName: 'Viktor Axelsen' },
        rallyLength: { shotCount: 4, durationSeconds: 3 },
        server: { team: 'A', playerRole: 'A1' },
        scoreState: { scoreA: i, scoreB: 0, lead: i, isGamePoint: false, isMatchPoint: false, isIntervalPoint: false },
        shuttleSpeedKmh: 140,
        pointType: 'WINNER',
      });
    }
    // 1 win in Zone 7
    events.push({
      id: 'z-5',
      rallyNumber: 5,
      gameIndex: 1,
      timestamp: 5000,
      shotType: 'smash',
      shotZone: 'Back-Left',
      shotZoneIndex: 7,
      winner: { team: 'A', playerRole: 'A1', playerName: 'Viktor Axelsen' },
      rallyLength: { shotCount: 6, durationSeconds: 4 },
      server: { team: 'A', playerRole: 'A1' },
      scoreState: { scoreA: 5, scoreB: 0, lead: 5, isGamePoint: false, isMatchPoint: false, isIntervalPoint: false },
      shuttleSpeedKmh: 310,
      pointType: 'WINNER',
    });
    // 1 loss
    events.push({
      id: 'z-6',
      rallyNumber: 6,
      gameIndex: 1,
      timestamp: 6000,
      shotType: 'smash',
      shotZone: 'Mid-Center',
      shotZoneIndex: 5,
      winner: { team: 'B', playerRole: 'B1', playerName: 'Lee Zii Jia' },
      rallyLength: { shotCount: 5, durationSeconds: 3 },
      server: { team: 'B', playerRole: 'B1' },
      scoreState: { scoreA: 5, scoreB: 1, lead: 4, isGamePoint: false, isMatchPoint: false, isIntervalPoint: false },
      shuttleSpeedKmh: 320,
      pointType: 'WINNER',
    });

    const report = generateTacticalAdvice(events, defaultSnap, playerNames, 'A');
    const targetTip = report.adviceList.find((a) => a.category === 'target_zone');

    expect(targetTip).toBeDefined();
    expect(targetTip?.targetZoneIndex).toBe(3);
    expect(targetTip?.derivedMetric).toContain('80% conversion in Zone 3');
  });
});
