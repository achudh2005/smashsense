import { describe, it, expect } from 'vitest';
import {
  generateSingleElimination,
  generateRoundRobin,
  updateTournamentMatchResult,
  calculateRoundRobinStandings,
} from '../tournamentManager';

describe('Tournament & Bracket Generation Engine', () => {
  it('generates a 4-player single elimination bracket with semifinal and final matches', () => {
    const players = ['Viktor Axelsen', 'Lee Zii Jia', 'Shi Yuqi', 'Anders Antonsen'];
    const tournament = generateSingleElimination('Championship 2026', players);

    expect(tournament.matches.length).toBe(3); // 2 semifinals + 1 final
    expect(tournament.format).toBe('single_elimination');
    expect(tournament.matches[0].playerA).toBe('Viktor Axelsen');
    expect(tournament.matches[0].playerB).toBe('Lee Zii Jia');
    expect(tournament.matches[1].playerA).toBe('Shi Yuqi');
    expect(tournament.matches[1].playerB).toBe('Anders Antonsen');
    // Finals participants start as TBD
    expect(tournament.matches[2].playerA).toBe('TBD');
    expect(tournament.matches[2].playerB).toBe('TBD');
  });

  it('automatically advances winners to the next round match and crowns a champion', () => {
    const players = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    let t = generateSingleElimination('Fast Bracket', players);

    // Play match 1: Player 1 beats Player 2 (21 - 15)
    t = updateTournamentMatchResult(t, t.matches[0].id, 21, 15);
    expect(t.matches[0].winner).toBe('Player 1');
    expect(t.matches[2].playerA).toBe('Player 1'); // Advanced to finals

    // Play match 2: Player 4 beats Player 3 (21 - 19)
    t = updateTournamentMatchResult(t, t.matches[1].id, 19, 21);
    expect(t.matches[1].winner).toBe('Player 4');
    expect(t.matches[2].playerB).toBe('Player 4'); // Advanced to finals

    // Play Finals: Player 1 beats Player 4 (21 - 18)
    t = updateTournamentMatchResult(t, t.matches[2].id, 21, 18);
    expect(t.matches[2].winner).toBe('Player 1');
    expect(t.status).toBe('COMPLETED');
    expect(t.champion).toBe('Player 1');
  });

  it('generates round-robin schedule with all pairwise pairings and computes standings', () => {
    const players = ['Axelsen', 'Antonsen', 'Zii Jia'];
    // 3 players = 3 matches: (Axelsen vs Antonsen), (Axelsen vs Zii Jia), (Antonsen vs Zii Jia)
    let t = generateRoundRobin('Round Robin League', players);

    expect(t.matches.length).toBe(3);

    // Match 1: Axelsen beats Antonsen (21 - 10)
    t = updateTournamentMatchResult(t, t.matches[0].id, 21, 10);
    // Match 2: Axelsen beats Zii Jia (21 - 15)
    t = updateTournamentMatchResult(t, t.matches[1].id, 21, 15);
    // Match 3: Zii Jia beats Antonsen (21 - 19)
    t = updateTournamentMatchResult(t, t.matches[2].id, 19, 21);

    const standings = calculateRoundRobinStandings(t);

    expect(standings.length).toBe(3);
    // Axelsen won 2 matches -> Rank 1
    expect(standings[0].playerName).toBe('Axelsen');
    expect(standings[0].won).toBe(2);
    expect(standings[0].lost).toBe(0);

    // Zii Jia won 1 match -> Rank 2
    expect(standings[1].playerName).toBe('Zii Jia');
    expect(standings[1].won).toBe(1);

    // Antonsen won 0 -> Rank 3
    expect(standings[2].playerName).toBe('Antonsen');
    expect(standings[2].won).toBe(0);
  });
});
