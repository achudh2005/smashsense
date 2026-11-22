import { describe, it, expect } from 'vitest';
import {
  getZoneIndex,
  getZoneNameFromIndex,
  determineErrorType,
  createDetailedMatchEvent,
} from '../matchEventModel';
import { CompletedRally } from '../../game/rallyStateMachine';
import { GameStateSnapshot } from '../../game/scoringEngine';

describe('Match Event Model & Zone Mapping', () => {
  it('maps all 9 tactical landing zones to correct numeric indices', () => {
    expect(getZoneIndex('Front-Left')).toBe(1);
    expect(getZoneIndex('Front-Center')).toBe(2);
    expect(getZoneIndex('Front-Right')).toBe(3);
    expect(getZoneIndex('Mid-Left')).toBe(4);
    expect(getZoneIndex('Mid-Center')).toBe(5);
    expect(getZoneIndex('Mid-Right')).toBe(6);
    expect(getZoneIndex('Back-Left')).toBe(7);
    expect(getZoneIndex('Back-Center')).toBe(8);
    expect(getZoneIndex('Back-Right')).toBe(9);
  });

  it('inverts numeric index back to zone name faithfully', () => {
    for (let i = 1; i <= 9; i++) {
      const name = getZoneNameFromIndex(i);
      expect(getZoneIndex(name)).toBe(i);
    }
  });

  it('determines error types correctly for winners and errors', () => {
    const winnerRally: CompletedRally = {
      id: 'r1',
      rallyNumber: 1,
      gameIndex: 1,
      startTime: 100,
      endTime: 105,
      durationSeconds: 5,
      shotCount: 6,
      maxSpeedKmh: 310,
      winningTeam: 'A',
      creditedPlayer: 'A1',
      pointType: 'WINNER',
      endingStroke: 'smash',
      lineCall: {
        call: 'IN',
        confidencePercent: 99,
        isUncertain: false,
        distanceToLineCm: 25,
        closestLineName: 'Right Sideline',
        landingCourt: { x: 5.2, y: 11.5 },
        landingZone: 'Back-Right',
      },
      flightMetrics: { speedKmh: 310, shotDirection: 'cross', landingZone: 'Back-Right' },
      actions: [],
    };

    expect(determineErrorType(winnerRally)).toBeUndefined();

    const outRally: CompletedRally = {
      ...winnerRally,
      pointType: 'UNFORCED_ERROR',
      lineCall: { ...winnerRally.lineCall, call: 'OUT' },
    };
    expect(determineErrorType(outRally)).toBe('OUT');
  });

  it('creates comprehensive DetailedMatchEvent with interval and game point telemetry', () => {
    const mockRally: CompletedRally = {
      id: 'r-11',
      rallyNumber: 15,
      gameIndex: 1,
      startTime: 1000,
      endTime: 1008,
      durationSeconds: 8,
      shotCount: 12,
      maxSpeedKmh: 280,
      winningTeam: 'A',
      creditedPlayer: 'A1',
      pointType: 'WINNER',
      endingStroke: 'drop',
      lineCall: {
        call: 'IN',
        confidencePercent: 95,
        isUncertain: false,
        distanceToLineCm: 15,
        closestLineName: 'Short Service Line',
        landingCourt: { x: 2.1, y: 7.2 },
        landingZone: 'Front-Left',
      },
      flightMetrics: { speedKmh: 280, shotDirection: 'straight', landingZone: 'Front-Left' },
      actions: [],
    };

    const mockSnap: GameStateSnapshot = {
      gameIndex: 1,
      scoreA: 11,
      scoreB: 8,
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

    const playerNames = {
      A1: 'Viktor Axelsen',
      A2: 'Partner A',
      B1: 'Lee Zii Jia',
      B2: 'Partner B',
    };

    const event = createDetailedMatchEvent(mockRally, mockSnap, playerNames);

    expect(event.rallyNumber).toBe(15);
    expect(event.shotZoneIndex).toBe(1); // Front-Left is Zone 1
    expect(event.winner.playerName).toBe('Viktor Axelsen');
    expect(event.scoreState.isIntervalPoint).toBe(true);
    expect(event.scoreState.lead).toBe(3);
  });
});
