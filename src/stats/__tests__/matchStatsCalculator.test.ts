import { describe, it, expect } from 'vitest';
import { calculateMatchAnalysis } from '../matchStatsCalculator';
import { CompletedRally } from '../../game/rallyStateMachine';
import { PlayerActionEvent } from '../../detection/motionClassifier';

describe('Match Stats & Comprehensive Analytics', () => {
  const mockRallies: CompletedRally[] = [
    {
      id: 'r1',
      rallyNumber: 1,
      gameIndex: 1,
      startTime: 1000,
      endTime: 1008,
      durationSeconds: 8,
      shotCount: 6,
      maxSpeedKmh: 245,
      winningTeam: 'A',
      creditedPlayer: 'A1',
      pointType: 'WINNER',
      endingStroke: 'smash',
      lineCall: {
        call: 'IN',
        confidencePercent: 98,
        isUncertain: false,
        distanceToLineCm: 15,
        closestLineName: 'Sideline',
        landingCourt: { x: 5.2, y: 11.5 },
        landingZone: 'Back-Right',
      },
      flightMetrics: {
        speedKmh: 245,
        shotDirection: 'cross',
        landingZone: 'Back-Right',
      },
      actions: [],
    },
    {
      id: 'r2',
      rallyNumber: 2,
      gameIndex: 1,
      startTime: 1020,
      endTime: 1025,
      durationSeconds: 5,
      shotCount: 3,
      maxSpeedKmh: 130,
      winningTeam: 'A',
      creditedPlayer: 'A1',
      pointType: 'WINNER',
      endingStroke: 'drop',
      lineCall: {
        call: 'IN',
        confidencePercent: 95,
        isUncertain: false,
        distanceToLineCm: 8,
        closestLineName: 'Short Service Line',
        landingCourt: { x: 2.0, y: 7.2 },
        landingZone: 'Front-Left',
      },
      flightMetrics: {
        speedKmh: 130,
        shotDirection: 'straight',
        landingZone: 'Front-Left',
      },
      actions: [],
    },
    {
      id: 'r3',
      rallyNumber: 3,
      gameIndex: 1,
      startTime: 1040,
      endTime: 1055,
      durationSeconds: 15,
      shotCount: 14,
      maxSpeedKmh: 210,
      winningTeam: 'B',
      creditedPlayer: 'B1',
      pointType: 'UNFORCED_ERROR',
      endingStroke: 'clear',
      lineCall: {
        call: 'OUT',
        confidencePercent: 99,
        isUncertain: false,
        distanceToLineCm: 20,
        closestLineName: 'Baseline',
        landingCourt: { x: 3.0, y: 13.6 },
        landingZone: 'Back-Center',
      },
      flightMetrics: {
        speedKmh: 210,
        shotDirection: 'straight',
        landingZone: 'Back-Center',
      },
      actions: [],
    },
  ];

  const mockEvents: PlayerActionEvent[] = [
    {
      id: 'e1',
      timestamp: 1002,
      playerId: 1,
      playerRole: 'A1',
      team: 'A',
      courtPosition: { x: 3.0, y: 2.0 },
      category: 'stroke',
      action: 'jump_smash',
      confidence: 0.95,
      metrics: { shuttleSpeedKmh: 245 },
    },
    {
      id: 'e2',
      timestamp: 1004,
      playerId: 1,
      playerRole: 'A1',
      team: 'A',
      courtPosition: { x: 3.1, y: 2.5 },
      category: 'movement',
      action: 'lunge',
      confidence: 0.92,
    },
  ];

  it('computes accurate match metrics, winners, and unforced errors', () => {
    const report = calculateMatchAnalysis(mockRallies, mockEvents, 'singles', {
      A1: 'Viktor Axelsen',
      B1: 'Lee Zii Jia',
    });

    expect(report.totalRallies).toBe(3);
    expect(report.longestRallyShots).toBe(14);
    expect(report.longestRallyDurationSec).toBe(15);
    expect(report.maxShuttleSpeedKmh).toBe(245);

    // Player A1
    const pA1 = report.players.A1;
    expect(pA1.winners).toBe(2);
    expect(pA1.pointsWon).toBe(2);
    expect(pA1.smashesAttempted).toBe(1);
    expect(pA1.smashesWon).toBe(1);
    expect(pA1.smashSuccessRate).toBe(100);
    expect(pA1.topSmashSpeedKmh).toBe(245);
    expect(pA1.pointsWonShortRally).toBe(1);
    expect(pA1.pointsWonMediumRally).toBe(1);

    // Player B1
    const pB1 = report.players.B1;
    expect(pB1.pointsWon).toBe(1);
    expect(pB1.pointsWonLongRally).toBe(1);
  });

  it('determines MVP based on algorithmic performance score', () => {
    const report = calculateMatchAnalysis(mockRallies, mockEvents, 'singles', {
      A1: 'Viktor Axelsen',
      B1: 'Lee Zii Jia',
    });

    const mvpAward = report.awards.find((a) => a.type === 'MVP');
    expect(mvpAward).toBeDefined();
    expect(mvpAward?.playerRole).toBe('A1');
    expect(mvpAward?.playerName).toBe('Viktor Axelsen');
    expect(mvpAward?.reason).toContain('winners');
  });

  it('constructs a continuous momentum timeline with rally score differentials', () => {
    const report = calculateMatchAnalysis(mockRallies, mockEvents, 'singles');
    expect(report.momentumTimeline.length).toBe(3);

    // Rally 1: Team A leads 1-0 (+1)
    expect(report.momentumTimeline[0].diff).toBe(1);
    expect(report.momentumTimeline[0].winningTeam).toBe('A');

    // Rally 2: Team A leads 2-0 (+2)
    expect(report.momentumTimeline[1].diff).toBe(2);

    // Rally 3: Team A leads 2-1 (+1)
    expect(report.momentumTimeline[2].diff).toBe(1);
    expect(report.momentumTimeline[2].winningTeam).toBe('B');
  });
});
