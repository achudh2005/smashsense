import { Point2D } from '../court/courtGeometry';
import { evaluateLineCall, LineCallEvaluation, ShuttleFlightMetrics, calculateFlightMetrics } from '../court/lineCallEngine';
import { PlayerRole, TrackedPlayer } from '../tracking/byteTrack';
import { ShuttlecockTrack } from '../tracking/shuttlecockTracker';
import { StrokeType, PlayerMotionClassifier, PlayerActionEvent } from '../detection/motionClassifier';
import { BwfScoringEngine, Team } from './scoringEngine';

export type RallyState =
  | 'IDLE'
  | 'SERVING'
  | 'RALLY_ACTIVE'
  | 'RALLY_ENDING'
  | 'POINT_EVALUATED'
  | 'INTERVAL';

export type PointType = 'WINNER' | 'UNFORCED_ERROR' | 'FORCED_ERROR';

export interface CompletedRally {
  id: string;
  rallyNumber: number;
  gameIndex: number;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  shotCount: number;
  maxSpeedKmh: number;
  winningTeam: Team;
  creditedPlayer: PlayerRole;
  pointType: PointType;
  endingStroke: StrokeType;
  lineCall: LineCallEvaluation;
  flightMetrics: ShuttleFlightMetrics;
  actions: PlayerActionEvent[];
}

export class RallyStateMachine {
  private state: RallyState = 'IDLE';
  private rallyNumber = 1;
  private rallyStartTime = 0;
  private shotCount = 0;
  private maxSpeedKmh = 0;
  private lastHitTime = 0;
  private lastStriker: TrackedPlayer | null = null;
  private lastStrikerStroke: StrokeType = 'serve';
  private recordedActions: PlayerActionEvent[] = [];
  private lastShuttleOrigin: Point2D | null = null;

  private motionClassifier = new PlayerMotionClassifier();
  private scoringEngine: BwfScoringEngine;

  constructor(scoringEngine: BwfScoringEngine) {
    this.scoringEngine = scoringEngine;
  }

  public getState(): RallyState {
    return this.state;
  }

  public getShotCount(): number {
    return this.shotCount;
  }

  public getRallyNumber(): number {
    return this.rallyNumber;
  }

  /**
   * Main state machine update loop fed by live tracking
   */
  public update(
    players: TrackedPlayer[],
    shuttle: ShuttlecockTrack | null,
    now = performance.now()
  ): {
    state: RallyState;
    newAction?: PlayerActionEvent;
    completedRally?: CompletedRally;
  } {
    // 1. Classify player movements
    for (const player of players) {
      const moveAction = this.motionClassifier.classifyPlayerMovement(player, now);
      if (moveAction) {
        this.recordedActions.push(moveAction);
        return { state: this.state, newAction: moveAction };
      }
    }

    if (!shuttle) {
      return { state: this.state };
    }

    if (shuttle.speedKmh > this.maxSpeedKmh) {
      this.maxSpeedKmh = shuttle.speedKmh;
    }

    switch (this.state) {
      case 'IDLE': {
        // Look for serve start: Shuttle begins moving from near the server
        if (shuttle.speedKmh > 30) {
          this.state = 'SERVING';
          this.rallyStartTime = Date.now();
          this.shotCount = 1;
          this.lastHitTime = now;
          this.recordedActions = [];

          // Find server player
          const serverRole = this.scoringEngine.getSnapshot().currentServer;
          const serverPlayer = players.find((p) => p.assignedRole === serverRole) || players[0];
          if (serverPlayer) {
            this.lastStriker = serverPlayer;
            const stroke = this.motionClassifier.classifyStroke(serverPlayer, shuttle, true, now);
            this.lastStrikerStroke = stroke.action as StrokeType;
            this.recordedActions.push(stroke);
            this.lastShuttleOrigin = serverPlayer.courtPosition ? { ...serverPlayer.courtPosition } : null;
            return { state: this.state, newAction: stroke };
          }
        }
        break;
      }

      case 'SERVING': {
        // Transition to active rally once shuttle crosses half court or speed continues
        if (shuttle.speedKmh > 50 || now - this.lastHitTime > 400) {
          this.state = 'RALLY_ACTIVE';
        }
        break;
      }

      case 'RALLY_ACTIVE': {
        // Check for new hit (directional reversal or sudden acceleration)
        if (shuttle.speedKmh > 60 && now - this.lastHitTime > 350) {
          // Identify striker closest to shuttle
          const shuttlePt = shuttle.currentCourt;
          if (shuttlePt) {
            const nearestPlayer = this.findNearestPlayer(players, shuttlePt);
            if (nearestPlayer && nearestPlayer.team !== this.lastStriker?.team) {
              // Valid return hit!
              this.shotCount++;
              this.lastHitTime = now;
              this.lastStriker = nearestPlayer;
              const stroke = this.motionClassifier.classifyStroke(nearestPlayer, shuttle, false, now);
              this.lastStrikerStroke = stroke.action as StrokeType;
              this.recordedActions.push(stroke);
              this.lastShuttleOrigin = nearestPlayer.courtPosition ? { ...nearestPlayer.courtPosition } : null;
              return { state: this.state, newAction: stroke };
            }
          }
        }

        // Check for rally termination condition:
        // Shuttle slowed down dramatically (< 15 km/h) or no return for > 1.8 seconds after a strike
        const timeSinceHit = now - this.lastHitTime;
        const shuttleLanded = shuttle.speedKmh < 15 && timeSinceHit > 300;
        const noReturn = timeSinceHit > 1900;

        if (shuttleLanded || noReturn) {
          this.state = 'RALLY_ENDING';
          return this.finalizeRally(players, shuttle, now);
        }
        break;
      }

      case 'RALLY_ENDING':
      case 'POINT_EVALUATED': {
        // Short pause between points
        if (now - this.lastHitTime > 1200) {
          this.state = this.scoringEngine.getSnapshot().isInterval ? 'INTERVAL' : 'IDLE';
        }
        break;
      }

      case 'INTERVAL': {
        // Waiting for players to resume
        if (shuttle.speedKmh > 40) {
          this.state = 'SERVING';
        }
        break;
      }
    }

    return { state: this.state };
  }

  /**
   * Finalizes rally evaluation, computes In/Out call, point attribution, and awards point
   */
  private finalizeRally(
    players: TrackedPlayer[],
    shuttle: ShuttlecockTrack,
    now: number
  ): {
    state: RallyState;
    completedRally: CompletedRally;
  } {
    const landingCoord: Point2D = shuttle.currentCourt || { x: 3.05, y: 6.70 };
    const originCoord: Point2D = this.lastShuttleOrigin || { x: 3.05, y: this.lastStriker?.team === 'A' ? 3.0 : 10.0 };

    // 1. Evaluate Line Call
    const format = this.scoringEngine.getSnapshot().positions.A2 ? 'doubles' : 'singles';
    const isServeShot = this.shotCount <= 1;
    const lineCall = evaluateLineCall(
      landingCoord,
      format,
      isServeShot,
      this.lastStriker?.team || 'A',
      this.scoringEngine.getSnapshot().positions.A1.court
    );

    // 2. Flight Metrics
    const flightMetrics = calculateFlightMetrics(originCoord, landingCoord, this.maxSpeedKmh);

    // 3. Point Attribution Logic
    // Striker: player who hit the shuttle last
    // Defender: player on the opposing team
    const striker = this.lastStriker;
    const strikerTeam: Team = striker?.team || 'A';
    const opponentTeam: Team = strikerTeam === 'A' ? 'B' : 'A';
    const opponentPlayers = players.filter((p) => p.team === opponentTeam);
    const defender = opponentPlayers[0] || players[0];

    let winningTeam: Team;
    let creditedPlayer: PlayerRole;
    let pointType: PointType;
    let rallyReason: string;

    if (lineCall.call === 'IN') {
      // Shuttle landed IN on opponent's half -> Clean Winner!
      winningTeam = strikerTeam;
      creditedPlayer = striker?.assignedRole || (strikerTeam === 'A' ? 'A1' : 'B1');
      pointType = 'WINNER';
      rallyReason = `Winner (${this.lastStrikerStroke}) [${lineCall.call}]`;
    } else {
      // Shuttle landed OUT -> Error by striker! Point goes to opponent
      winningTeam = opponentTeam;
      creditedPlayer = defender?.assignedRole || (opponentTeam === 'A' ? 'A1' : 'B1');

      // Was it unforced or forced?
      // If previous incoming shot was a smash (>160km/h), striker was forced into error
      if (this.maxSpeedKmh > 160) {
        pointType = 'FORCED_ERROR';
        rallyReason = `Forced Error by ${opponentTeam} (${this.lastStrikerStroke} Out)`;
      } else {
        pointType = 'UNFORCED_ERROR';
        rallyReason = `Unforced Error (${this.lastStrikerStroke} Out)`;
      }
    }

    // 4. Record Defender Miss Action
    if (defender) {
      const missAction = this.motionClassifier.classifyMiss(defender, landingCoord, this.lastStrikerStroke);
      this.recordedActions.push(missAction);
    }

    // 5. Award Point in Scoring Engine
    this.scoringEngine.awardPoint(winningTeam, {
      reason: rallyReason,
      isAutoCall: true,
      playerRole: creditedPlayer,
      shuttleSpeedKmh: this.maxSpeedKmh,
      landingZone: lineCall.landingZone,
    });

    const durationSeconds = Math.max(1, Math.round((Date.now() - this.rallyStartTime) / 1000));

    const completedRally: CompletedRally = {
      id: `rally-${this.rallyNumber}-${Date.now()}`,
      rallyNumber: this.rallyNumber++,
      gameIndex: this.scoringEngine.getSnapshot().gameIndex + 1,
      startTime: this.rallyStartTime,
      endTime: Date.now(),
      durationSeconds,
      shotCount: this.shotCount,
      maxSpeedKmh: Math.round(this.maxSpeedKmh),
      winningTeam,
      creditedPlayer,
      pointType,
      endingStroke: this.lastStrikerStroke,
      lineCall,
      flightMetrics,
      actions: [...this.recordedActions],
    };

    // Reset for next rally
    this.state = 'POINT_EVALUATED';
    this.lastHitTime = now;
    this.maxSpeedKmh = 0;
    this.shotCount = 0;

    return {
      state: this.state,
      completedRally,
    };
  }

  private findNearestPlayer(players: TrackedPlayer[], coord: Point2D): TrackedPlayer | null {
    let nearest: TrackedPlayer | null = null;
    let minDist = Infinity;

    for (const p of players) {
      if (!p.courtPosition) continue;
      const d = Math.hypot(p.courtPosition.x - coord.x, p.courtPosition.y - coord.y);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }

    return nearest;
  }

  public reset(): void {
    this.state = 'IDLE';
    this.rallyNumber = 1;
    this.shotCount = 0;
    this.maxSpeedKmh = 0;
    this.recordedActions = [];
  }
}
