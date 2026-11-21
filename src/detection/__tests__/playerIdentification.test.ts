import { describe, it, expect } from 'vitest';
import {
  classifyJerseyColor,
  PlayerIdentifier,
} from '../playerIdentification';
import { TrackedPlayer } from '../../tracking/byteTrack';
import { MatchConfig } from '../../game/gameState';

describe('Player Identification & Jersey Classification', () => {
  it('correctly classifies standard jersey colors from RGB', () => {
    // Red jersey
    const red = classifyJerseyColor(220, 20, 30);
    expect(red.name).toBe('Red');
    expect(red.isLight).toBe(false);

    // Yellow jersey
    const yellow = classifyJerseyColor(240, 230, 20);
    expect(yellow.name).toBe('Yellow');
    expect(yellow.isLight).toBe(true);

    // Blue jersey
    const blue = classifyJerseyColor(20, 100, 230);
    expect(blue.name).toContain('Blue');

    // White jersey
    const white = classifyJerseyColor(250, 250, 250);
    expect(white.name).toBe('White');
    expect(white.isLight).toBe(true);

    // Black jersey
    const black = classifyJerseyColor(20, 20, 20);
    expect(black.name).toBe('Black');
    expect(black.isLight).toBe(false);
  });

  it('identifies Far Court as Team A and Near Court as Team B', () => {
    const identifier = new PlayerIdentifier();
    const config: MatchConfig = {
      format: 'singles',
      teamANames: { A1: 'Viktor Axelsen' },
      teamBNames: { B1: 'Lee Zii Jia' },
      firstServer: 'A1',
      cameraPosition: 'behind_baseline',
    };

    const players: TrackedPlayer[] = [
      {
        trackId: 1,
        team: 'A',
        bbox: { x: 500, y: 150, width: 80, height: 160 },
        courtPosition: { x: 3.0, y: 3.5 }, // Far court (y < 6.7m)
        score: 0.9,
        state: 'tracked',
        timeSinceUpdate: 0,
        totalHits: 5,
        movementTrail: [],
      },
      {
        trackId: 2,
        team: 'B',
        bbox: { x: 520, y: 480, width: 100, height: 200 },
        courtPosition: { x: 3.0, y: 9.8 }, // Near court (y >= 6.7m)
        score: 0.95,
        state: 'tracked',
        timeSinceUpdate: 0,
        totalHits: 5,
        movementTrail: [],
      },
    ];

    const results = identifier.identifyPlayers(players, config);

    expect(results.size).toBe(2);

    const player1 = results.get(1);
    expect(player1?.role).toBe('A1');
    expect(player1?.customName).toBe('Viktor Axelsen');
    expect(player1?.courtSide).toContain('Far Court');

    const player2 = results.get(2);
    expect(player2?.role).toBe('B1');
    expect(player2?.customName).toBe('Lee Zii Jia');
    expect(player2?.courtSide).toContain('Near Court');
  });

  it('swaps sides cleanly when requested', () => {
    const identifier = new PlayerIdentifier();
    const config: MatchConfig = {
      format: 'singles',
      teamANames: { A1: 'Viktor Axelsen' },
      teamBNames: { B1: 'Lee Zii Jia' },
      firstServer: 'A1',
      cameraPosition: 'behind_baseline',
    };

    const players: TrackedPlayer[] = [
      {
        trackId: 10,
        team: 'A',
        bbox: { x: 400, y: 180, width: 70, height: 140 },
        courtPosition: { x: 2.5, y: 3.0 },
        score: 0.9,
        state: 'tracked',
        timeSinceUpdate: 0,
        totalHits: 4,
        movementTrail: [],
      },
    ];

    identifier.identifyPlayers(players, config);
    identifier.swapSides(config);

    const updated = identifier.identifyPlayers(players, config);
    const p = updated.get(10);
    expect(p?.role).toBe('B1');
    expect(p?.customName).toBe('Lee Zii Jia');
    expect(p?.team).toBe('B');
  });
});
