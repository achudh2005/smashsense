import { PlayerRole } from '../tracking/byteTrack';

export type MatchFormat = 'singles' | 'doubles';
export type ServiceCourt = 'right' | 'left';
export type Team = 'A' | 'B';

export interface PlayerPositions {
  // Team A
  A1: { court: ServiceCourt; isServingOrReceiving: boolean };
  A2?: { court: ServiceCourt; isServingOrReceiving: boolean };
  // Team B
  B1: { court: ServiceCourt; isServingOrReceiving: boolean };
  B2?: { court: ServiceCourt; isServingOrReceiving: boolean };
}

export interface ScoreAuditEntry {
  id: string;
  timestamp: number;
  gameIndex: number;
  scoreA: number;
  scoreB: number;
  scoredBy: Team;
  playerRole?: PlayerRole;
  server: PlayerRole;
  receiver: PlayerRole;
  reason: string; // e.g., "Winner (Jump Smash)", "Unforced Error (Out)", "Manual Correction"
  isAutoCall: boolean;
  landingZone?: string;
  shuttleSpeedKmh?: number;
}

export interface GameStateSnapshot {
  gameIndex: number; // 0, 1, 2
  gamesWonA: number;
  gamesWonB: number;
  scoreA: number;
  scoreB: number;
  currentServer: PlayerRole;
  currentReceiver: PlayerRole;
  positions: PlayerPositions;
  servingSide: Team;
  isGameOver: boolean;
  isMatchOver: boolean;
  matchWinner?: Team;
  isInterval: boolean; // 11-point interval or between-game interval
  intervalType?: 'mid_game_11' | 'end_of_game';
  sidesSwapped: boolean; // Track if ends have been swapped
}

export interface ScoringEngineConfig {
  format: MatchFormat;
  pointsToWinGame?: number; // 21 standard
  pointCap?: number;         // 30 sudden death
  gamesToWinMatch?: number;  // 2 (Best of 3)
  initialServer?: PlayerRole;
  teamANames: { A1: string; A2?: string };
  teamBNames: { B1: string; B2?: string };
}

export class BwfScoringEngine {
  private config: ScoringEngineConfig;
  private currentSnapshot: GameStateSnapshot;
  private history: GameStateSnapshot[] = [];
  private redoStack: GameStateSnapshot[] = [];
  private auditLog: ScoreAuditEntry[] = [];
  private completedGamesScores: Array<{ gameIndex: number; scoreA: number; scoreB: number; winner: Team }> = [];

  constructor(config: ScoringEngineConfig) {
    this.config = {
      pointsToWinGame: 21,
      pointCap: 30,
      gamesToWinMatch: 2,
      ...config,
    };

    const initialServer: PlayerRole = config.initialServer || 'A1';
    const initialReceiver: PlayerRole = initialServer.startsWith('A') ? 'B1' : 'A1';

    this.currentSnapshot = {
      gameIndex: 0,
      gamesWonA: 0,
      gamesWonB: 0,
      scoreA: 0,
      scoreB: 0,
      currentServer: initialServer,
      currentReceiver: initialReceiver,
      servingSide: initialServer.startsWith('A') ? 'A' : 'B',
      positions: this.getInitialPositions(config.format, initialServer, initialReceiver),
      isGameOver: false,
      isMatchOver: false,
      isInterval: false,
      sidesSwapped: false,
    };
  }

  private getInitialPositions(
    format: MatchFormat,
    server: PlayerRole,
    receiver: PlayerRole
  ): PlayerPositions {
    if (format === 'singles') {
      return {
        A1: { court: 'right', isServingOrReceiving: server === 'A1' || receiver === 'A1' },
        B1: { court: 'right', isServingOrReceiving: server === 'B1' || receiver === 'B1' },
      };
    } else {
      return {
        A1: { court: 'right', isServingOrReceiving: server === 'A1' || receiver === 'A1' },
        A2: { court: 'left', isServingOrReceiving: false },
        B1: { court: 'right', isServingOrReceiving: server === 'B1' || receiver === 'B1' },
        B2: { court: 'left', isServingOrReceiving: false },
      };
    }
  }

  public getSnapshot(): Readonly<GameStateSnapshot> {
    return this.currentSnapshot;
  }

  public getAuditLog(): ReadonlyArray<ScoreAuditEntry> {
    return this.auditLog;
  }

  public getCompletedGames(): ReadonlyArray<{ gameIndex: number; scoreA: number; scoreB: number; winner: Team }> {
    return this.completedGamesScores;
  }

  /**
   * Awards a point to team A or team B according to official BWF rules
   */
  public awardPoint(
    team: Team,
    details: {
      reason: string;
      isAutoCall?: boolean;
      playerRole?: PlayerRole;
      shuttleSpeedKmh?: number;
      landingZone?: string;
    }
  ): GameStateSnapshot {
    if (this.currentSnapshot.isMatchOver) {
      return this.currentSnapshot;
    }

    // Save previous snapshot to history for undo
    this.history.push(JSON.parse(JSON.stringify(this.currentSnapshot)));
    this.redoStack = []; // clear redo on new action

    const prev = this.currentSnapshot;
    let scoreA = prev.scoreA;
    let scoreB = prev.scoreB;

    if (team === 'A') {
      scoreA++;
    } else {
      scoreB++;
    }

    const { pointsToWinGame = 21, pointCap = 30, gamesToWinMatch = 2 } = this.config;

    // Check game won condition:
    // A side wins if score >= 21 with a 2-point lead, OR reaches 30 first (sudden death cap)
    let gameWon = false;
    let gameWinner: Team | undefined;

    if (scoreA >= pointsToWinGame || scoreB >= pointsToWinGame) {
      if (scoreA >= pointCap) {
        gameWon = true;
        gameWinner = 'A';
      } else if (scoreB >= pointCap) {
        gameWon = true;
        gameWinner = 'B';
      } else if (Math.abs(scoreA - scoreB) >= 2) {
        gameWon = true;
        gameWinner = scoreA > scoreB ? 'A' : 'B';
      }
    }

    // Check mid-game 11-point interval
    const hitInterval11 = (scoreA === 11 && scoreB < 11) || (scoreB === 11 && scoreA < 11);

    // Compute updated positions and server rotation according to BWF rules
    const rotation = this.computeNextServerAndPositions(
      team,
      scoreA,
      scoreB,
      prev
    );

    let gamesWonA = prev.gamesWonA;
    let gamesWonB = prev.gamesWonB;
    let isMatchOver = false;
    let matchWinner: Team | undefined;
    let isGameOver = gameWon;

    if (gameWon && gameWinner) {
      if (gameWinner === 'A') gamesWonA++;
      else gamesWonB++;

      this.completedGamesScores.push({
        gameIndex: prev.gameIndex,
        scoreA,
        scoreB,
        winner: gameWinner,
      });

      if (gamesWonA >= gamesToWinMatch) {
        isMatchOver = true;
        matchWinner = 'A';
      } else if (gamesWonB >= gamesToWinMatch) {
        isMatchOver = true;
        matchWinner = 'B';
      }
    }

    // Check side change rules:
    // Ends changed at end of 1st game, end of 2nd game, and in 3rd game when a side reaches 11 points
    let sidesSwapped = prev.sidesSwapped;
    if (prev.gameIndex === 2 && hitInterval11 && !prev.sidesSwapped) {
      sidesSwapped = true;
    } else if (gameWon) {
      sidesSwapped = !sidesSwapped;
    }

    const nextSnapshot: GameStateSnapshot = {
      gameIndex: prev.gameIndex,
      gamesWonA,
      gamesWonB,
      scoreA,
      scoreB,
      currentServer: rotation.server,
      currentReceiver: rotation.receiver,
      servingSide: team,
      positions: rotation.positions,
      isGameOver,
      isMatchOver,
      matchWinner,
      isInterval: hitInterval11 || isGameOver,
      intervalType: isGameOver ? 'end_of_game' : hitInterval11 ? 'mid_game_11' : undefined,
      sidesSwapped,
    };

    // Log to Audit Trail
    this.auditLog.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      gameIndex: prev.gameIndex + 1,
      scoreA,
      scoreB,
      scoredBy: team,
      playerRole: details.playerRole,
      server: rotation.server,
      receiver: rotation.receiver,
      reason: details.reason,
      isAutoCall: details.isAutoCall ?? true,
      landingZone: details.landingZone,
      shuttleSpeedKmh: details.shuttleSpeedKmh,
    });

    this.currentSnapshot = nextSnapshot;
    return this.currentSnapshot;
  }

  /**
   * Transitions to the next game in a Best-of-3 match
   */
  public startNextGame(): GameStateSnapshot {
    if (!this.currentSnapshot.isGameOver || this.currentSnapshot.isMatchOver) {
      return this.currentSnapshot;
    }

    this.history.push(JSON.parse(JSON.stringify(this.currentSnapshot)));

    const nextGameIndex = this.currentSnapshot.gameIndex + 1;
    // Side that won previous game serves first in next game
    const lastWinner = this.completedGamesScores[this.completedGamesScores.length - 1]?.winner || 'A';
    const nextServer: PlayerRole = lastWinner === 'A' ? 'A1' : 'B1';
    const nextReceiver: PlayerRole = lastWinner === 'A' ? 'B1' : 'A1';

    this.currentSnapshot = {
      gameIndex: nextGameIndex,
      gamesWonA: this.currentSnapshot.gamesWonA,
      gamesWonB: this.currentSnapshot.gamesWonB,
      scoreA: 0,
      scoreB: 0,
      currentServer: nextServer,
      currentReceiver: nextReceiver,
      servingSide: lastWinner,
      positions: this.getInitialPositions(this.config.format, nextServer, nextReceiver),
      isGameOver: false,
      isMatchOver: false,
      isInterval: false,
      sidesSwapped: this.currentSnapshot.sidesSwapped,
    };

    return this.currentSnapshot;
  }

  /**
   * BWF Serving and Court Positioning Logic for Singles and Doubles
   */
  private computeNextServerAndPositions(
    rallyWinner: Team,
    scoreA: number,
    scoreB: number,
    prev: GameStateSnapshot
  ): {
    server: PlayerRole;
    receiver: PlayerRole;
    positions: PlayerPositions;
  } {
    const isSingles = this.config.format === 'singles';

    if (isSingles) {
      // Singles rules:
      // Server serves from Right if their score is even, Left if odd.
      const server: PlayerRole = rallyWinner === 'A' ? 'A1' : 'B1';
      const receiver: PlayerRole = rallyWinner === 'A' ? 'B1' : 'A1';
      const serverScore = rallyWinner === 'A' ? scoreA : scoreB;
      const court: ServiceCourt = serverScore % 2 === 0 ? 'right' : 'left';

      return {
        server,
        receiver,
        positions: {
          A1: { court: rallyWinner === 'A' ? court : court, isServingOrReceiving: true },
          B1: { court: rallyWinner === 'B' ? court : court, isServingOrReceiving: true },
        },
      };
    } else {
      // Doubles rules:
      const updatedPositions: PlayerPositions = JSON.parse(JSON.stringify(prev.positions));
      const servingTeam = rallyWinner;
      const wasServing = prev.servingSide === rallyWinner;

      let nextServer: PlayerRole = prev.currentServer;
      let nextReceiver: PlayerRole = prev.currentReceiver;

      if (wasServing) {
        // Serving side won rally:
        // The SAME server continues to serve, but swaps service courts (Right <-> Left)!
        // Receivers do NOT change their courts.
        if (servingTeam === 'A') {
          // Swap A1 and A2 courts
          const prevA1Court = updatedPositions.A1.court;
          updatedPositions.A1.court = prevA1Court === 'right' ? 'left' : 'right';
          if (updatedPositions.A2) {
            updatedPositions.A2.court = updatedPositions.A1.court === 'right' ? 'left' : 'right';
          }
          nextServer = prev.currentServer; // same server
          // Receiver is player standing diagonally opposite in the corresponding service court
          const serverCourt = updatedPositions[nextServer]?.court || 'right';
          nextReceiver = updatedPositions.B1.court === serverCourt ? 'B1' : 'B2';
        } else {
          // Swap B1 and B2 courts
          const prevB1Court = updatedPositions.B1.court;
          updatedPositions.B1.court = prevB1Court === 'right' ? 'left' : 'right';
          if (updatedPositions.B2) {
            updatedPositions.B2.court = updatedPositions.B1.court === 'right' ? 'left' : 'right';
          }
          nextServer = prev.currentServer;
          const serverCourt = updatedPositions[nextServer]?.court || 'right';
          nextReceiver = updatedPositions.A1.court === serverCourt ? 'A1' : 'A2';
        }
      } else {
        // Service over / side broken:
        // New server is determined by the winning side's CURRENT total score:
        // If their new score is EVEN, player standing in the RIGHT service court serves!
        // If their new score is ODD, player standing in the LEFT service court serves!
        // Neither side changes court positions.
        const newScore = servingTeam === 'A' ? scoreA : scoreB;
        const targetCourt: ServiceCourt = newScore % 2 === 0 ? 'right' : 'left';

        if (servingTeam === 'A') {
          nextServer = updatedPositions.A1.court === targetCourt ? 'A1' : 'A2';
          nextReceiver = updatedPositions.B1.court === targetCourt ? 'B1' : 'B2';
        } else {
          nextServer = updatedPositions.B1.court === targetCourt ? 'B1' : 'B2';
          nextReceiver = updatedPositions.A1.court === targetCourt ? 'A1' : 'A2';
        }
      }

      return {
        server: nextServer,
        receiver: nextReceiver,
        positions: updatedPositions,
      };
    }
  }

  /**
   * Undo last score action
   */
  public undo(): GameStateSnapshot | null {
    if (this.history.length === 0) return null;

    this.redoStack.push(JSON.parse(JSON.stringify(this.currentSnapshot)));
    this.currentSnapshot = this.history.pop()!;

    // Remove last audit entry
    if (this.auditLog.length > 0) {
      this.auditLog.pop();
    }

    return this.currentSnapshot;
  }

  /**
   * Redo previously undone score action
   */
  public redo(): GameStateSnapshot | null {
    if (this.redoStack.length === 0) return null;

    this.history.push(JSON.parse(JSON.stringify(this.currentSnapshot)));
    this.currentSnapshot = this.redoStack.pop()!;
    return this.currentSnapshot;
  }

  /**
   * Manual correction: set score directly and log to audit trail
   */
  public manualScoreCorrection(scoreA: number, scoreB: number, reason = 'Manual score adjustment'): GameStateSnapshot {
    this.history.push(JSON.parse(JSON.stringify(this.currentSnapshot)));
    this.redoStack = [];

    const prev = this.currentSnapshot;
    const scoredTeam: Team = scoreA > prev.scoreA ? 'A' : 'B';

    this.auditLog.push({
      id: `audit-${Date.now()}-manual`,
      timestamp: Date.now(),
      gameIndex: prev.gameIndex + 1,
      scoreA,
      scoreB,
      scoredBy: scoredTeam,
      server: prev.currentServer,
      receiver: prev.currentReceiver,
      reason: `Manual Correction: ${reason}`,
      isAutoCall: false,
    });

    this.currentSnapshot = {
      ...prev,
      scoreA,
      scoreB,
    };

    return this.currentSnapshot;
  }
}
