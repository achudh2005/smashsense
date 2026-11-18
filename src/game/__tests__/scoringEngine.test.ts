import { describe, it, expect, beforeEach } from 'vitest';
import { BwfScoringEngine } from '../scoringEngine';

describe('BWF Scoring Engine', () => {
  let singlesEngine: BwfScoringEngine;
  let doublesEngine: BwfScoringEngine;

  beforeEach(() => {
    singlesEngine = new BwfScoringEngine({
      format: 'singles',
      teamANames: { A1: 'Viktor Axelsen' },
      teamBNames: { B1: 'Lee Zii Jia' },
      initialServer: 'A1',
    });

    doublesEngine = new BwfScoringEngine({
      format: 'doubles',
      teamANames: { A1: 'Fajar Alfian', A2: 'M. Rian Ardianto' },
      teamBNames: { B1: 'Aaron Chia', B2: 'Soh Wooi Yik' },
      initialServer: 'A1',
    });
  });

  describe('Standard 21-Point Game Win', () => {
    it('declares game won when a player reaches 21 with a 2+ point lead', () => {
      // Team A scores 20 points
      for (let i = 0; i < 20; i++) {
        singlesEngine.awardPoint('A', { reason: 'Winner' });
      }
      // Team B scores 15 points
      for (let i = 0; i < 15; i++) {
        singlesEngine.awardPoint('B', { reason: 'Winner' });
      }

      let state = singlesEngine.getSnapshot();
      expect(state.scoreA).toBe(20);
      expect(state.scoreB).toBe(15);
      expect(state.isGameOver).toBe(false);

      // Point 21 for Team A -> Game Over!
      state = singlesEngine.awardPoint('A', { reason: 'Clean Smash Winner' });
      expect(state.scoreA).toBe(21);
      expect(state.scoreB).toBe(15);
      expect(state.isGameOver).toBe(true);
      expect(state.gamesWonA).toBe(1);
      expect(state.gamesWonB).toBe(0);
    });
  });

  describe('Deuce & 2-Point Lead Rule', () => {
    it('does NOT end game at 21-20 (requires 2-point lead up to 30)', () => {
      // Reach 20-20
      for (let i = 0; i < 20; i++) {
        singlesEngine.awardPoint('A', { reason: 'Rally' });
        singlesEngine.awardPoint('B', { reason: 'Rally' });
      }
      expect(singlesEngine.getSnapshot().scoreA).toBe(20);
      expect(singlesEngine.getSnapshot().scoreB).toBe(20);

      // Score 21-20: Game must continue!
      let state = singlesEngine.awardPoint('A', { reason: 'Smash' });
      expect(state.scoreA).toBe(21);
      expect(state.scoreB).toBe(20);
      expect(state.isGameOver).toBe(false);

      // Score 21-21: Game continues
      state = singlesEngine.awardPoint('B', { reason: 'Drop' });
      expect(state.scoreA).toBe(21);
      expect(state.scoreB).toBe(21);
      expect(state.isGameOver).toBe(false);

      // Score 22-21: Game continues
      state = singlesEngine.awardPoint('A', { reason: 'Net kill' });
      expect(state.isGameOver).toBe(false);

      // Score 23-21 (2-point lead reached): Game WON!
      state = singlesEngine.awardPoint('A', { reason: 'Winner' });
      expect(state.scoreA).toBe(23);
      expect(state.scoreB).toBe(21);
      expect(state.isGameOver).toBe(true);
      expect(state.gamesWonA).toBe(1);
    });
  });

  describe('Sudden-Death Cap at 30 Points', () => {
    it('awards game to the player reaching 30 first at 29-29 without requiring 2-point lead', () => {
      // Reach 29-29
      for (let i = 0; i < 29; i++) {
        singlesEngine.awardPoint('A', { reason: 'Rally' });
        singlesEngine.awardPoint('B', { reason: 'Rally' });
      }
      expect(singlesEngine.getSnapshot().scoreA).toBe(29);
      expect(singlesEngine.getSnapshot().scoreB).toBe(29);
      expect(singlesEngine.getSnapshot().isGameOver).toBe(false);

      // Golden 30th point: Team B scores 30-29 -> Game Over!
      const state = singlesEngine.awardPoint('B', { reason: 'Golden point winner' });
      expect(state.scoreA).toBe(29);
      expect(state.scoreB).toBe(30);
      expect(state.isGameOver).toBe(true);
      expect(state.gamesWonB).toBe(1);
    });
  });

  describe('Singles Server Rotation & Service Court Positioning', () => {
    it('serves from Right court when server score is even, and Left court when odd', () => {
      let state = singlesEngine.getSnapshot();
      // Initially 0-0 (Even): A1 serves from Right
      expect(state.currentServer).toBe('A1');
      expect(state.positions.A1.court).toBe('right');

      // Team A scores -> 1-0 (Odd): A1 serves from Left
      state = singlesEngine.awardPoint('A', { reason: 'Winner' });
      expect(state.scoreA).toBe(1);
      expect(state.currentServer).toBe('A1');
      expect(state.positions.A1.court).toBe('left');

      // Team A scores -> 2-0 (Even): A1 serves from Right
      state = singlesEngine.awardPoint('A', { reason: 'Winner' });
      expect(state.scoreA).toBe(2);
      expect(state.currentServer).toBe('A1');
      expect(state.positions.A1.court).toBe('right');

      // Team B scores -> 1-2 (B score is 1, Odd): B1 becomes server, serves from Left
      state = singlesEngine.awardPoint('B', { reason: 'Unforced error' });
      expect(state.scoreB).toBe(1);
      expect(state.currentServer).toBe('B1');
      expect(state.positions.B1.court).toBe('left');

      // Team B scores -> 2-2 (B score is 2, Even): B1 serves from Right
      state = singlesEngine.awardPoint('B', { reason: 'Smash' });
      expect(state.scoreB).toBe(2);
      expect(state.currentServer).toBe('B1');
      expect(state.positions.B1.court).toBe('right');
    });
  });

  describe('Doubles Server Rotation & Court Swapping', () => {
    it('swaps server service courts when serving team scores, keeps receivers in place', () => {
      let state = doublesEngine.getSnapshot();
      // Initial: 0-0. A1 in Right, A2 in Left; B1 in Right, B2 in Left. Server: A1
      expect(state.currentServer).toBe('A1');
      expect(state.positions.A1.court).toBe('right');
      expect(state.positions.A2?.court).toBe('left');
      expect(state.positions.B1.court).toBe('right');
      expect(state.positions.B2?.court).toBe('left');

      // Team A (serving) scores -> 1-0.
      // A1 stays server, but swaps to LEFT court! A2 moves to RIGHT.
      // Receivers B1 and B2 do NOT swap courts!
      state = doublesEngine.awardPoint('A', { reason: 'Smash' });
      expect(state.scoreA).toBe(1);
      expect(state.currentServer).toBe('A1');
      expect(state.positions.A1.court).toBe('left');
      expect(state.positions.A2?.court).toBe('right');
      expect(state.positions.B1.court).toBe('right');
      expect(state.positions.B2?.court).toBe('left');

      // Team A (serving) scores again -> 2-0.
      // A1 stays server, swaps back to RIGHT court! A2 moves to LEFT.
      state = doublesEngine.awardPoint('A', { reason: 'Clear' });
      expect(state.scoreA).toBe(2);
      expect(state.currentServer).toBe('A1');
      expect(state.positions.A1.court).toBe('right');
      expect(state.positions.A2?.court).toBe('left');
      expect(state.positions.B1.court).toBe('right');
      expect(state.positions.B2?.court).toBe('left');

      // Team B breaks serve -> score 1-2.
      // Team B new score is 1 (Odd). Player standing in Team B LEFT court serves!
      // B2 is standing in Left court, so B2 serves!
      state = doublesEngine.awardPoint('B', { reason: 'Net error' });
      expect(state.scoreB).toBe(1);
      expect(state.currentServer).toBe('B2');
      expect(state.positions.B2?.court).toBe('left');
    });
  });

  describe('Side Changes', () => {
    it('swaps ends at 11 points in the 3rd deciding game', () => {
      // Win Game 1 for Team A
      for (let i = 0; i < 21; i++) singlesEngine.awardPoint('A', { reason: 'P' });
      expect(singlesEngine.getSnapshot().isGameOver).toBe(true);
      singlesEngine.startNextGame();

      // Win Game 2 for Team B
      for (let i = 0; i < 21; i++) singlesEngine.awardPoint('B', { reason: 'P' });
      expect(singlesEngine.getSnapshot().isGameOver).toBe(true);
      singlesEngine.startNextGame();

      // Game 3: 0-0
      let state = singlesEngine.getSnapshot();
      expect(state.gameIndex).toBe(2);
      expect(state.gamesWonA).toBe(1);
      expect(state.gamesWonB).toBe(1);

      // Play up to 10-8
      for (let i = 0; i < 10; i++) singlesEngine.awardPoint('A', { reason: 'P' });
      for (let i = 0; i < 8; i++) singlesEngine.awardPoint('B', { reason: 'P' });
      expect(singlesEngine.getSnapshot().isInterval).toBe(false);

      // Team A reaches 11 points -> 11-point interval AND swap ends in game 3!
      state = singlesEngine.awardPoint('A', { reason: 'Winner' });
      expect(state.scoreA).toBe(11);
      expect(state.isInterval).toBe(true);
      expect(state.sidesSwapped).toBe(true);
    });
  });

  describe('Undo, Redo, and Audit Log', () => {
    it('accurately rolls back score and positions on undo, re-applies on redo, and maintains audit log', () => {
      singlesEngine.awardPoint('A', { reason: 'Smash winner' });
      singlesEngine.awardPoint('A', { reason: 'Ace serve' });
      expect(singlesEngine.getSnapshot().scoreA).toBe(2);
      expect(singlesEngine.getAuditLog().length).toBe(2);

      // Undo
      const undone = singlesEngine.undo();
      expect(undone?.scoreA).toBe(1);
      expect(singlesEngine.getAuditLog().length).toBe(1);

      // Redo
      const redone = singlesEngine.redo();
      expect(redone?.scoreA).toBe(2);

      // Manual correction
      const corrected = singlesEngine.manualScoreCorrection(5, 3, 'Ref overruled');
      expect(corrected.scoreA).toBe(5);
      expect(corrected.scoreB).toBe(3);
      const lastAudit = singlesEngine.getAuditLog()[singlesEngine.getAuditLog().length - 1];
      expect(lastAudit.isAutoCall).toBe(false);
      expect(lastAudit.reason).toContain('Manual Correction');
    });
  });
});
