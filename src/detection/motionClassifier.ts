import { Point2D } from '../court/courtGeometry';
import { PlayerRole, TrackedPlayer } from '../tracking/byteTrack';
import { ShuttlecockTrack } from '../tracking/shuttlecockTracker';

export type StrokeType =
  | 'smash'
  | 'clear'
  | 'drop'
  | 'drive'
  | 'net_shot'
  | 'lift'
  | 'serve'
  | 'block'
  | 'flick'
  | 'jump_smash';

export type MovementType =
  | 'lunge'
  | 'split_step'
  | 'jump'
  | 'backward_chasse'
  | 'recovery_to_base';

export type MissType =
  | 'failed_return'
  | 'mistimed_swing'
  | 'no_reaction'
  | 'shuttle_left_unreached';

export type PlayerActionType = StrokeType | MovementType | MissType;

export interface PlayerActionEvent {
  id: string;
  timestamp: number;
  playerId: number;
  playerRole: PlayerRole;
  playerName?: string;
  team: 'A' | 'B';
  courtPosition: Point2D;
  category: 'stroke' | 'movement' | 'miss';
  action: PlayerActionType;
  confidence: number;
  metrics?: {
    shuttleSpeedKmh?: number;
    jumpHeightM?: number;
    lungeExtensionRatio?: number;
  };
}

export class PlayerMotionClassifier {
  private lastActionTimes = new Map<number, { stroke: number; movement: number }>();
  private previousAnkleHeights = new Map<number, number[]>();

  /**
   * Evaluates player's pose and movement to classify ongoing actions
   */
  public classifyPlayerMovement(
    player: TrackedPlayer,
    now = performance.now()
  ): PlayerActionEvent | null {
    if (!player.courtPosition || !player.keypoints || player.keypoints.length === 0) {
      return null;
    }

    const playerId = player.trackId;
    const kpMap = new Map(player.keypoints.map((k) => [k.name, k]));
    const leftAnkle = kpMap.get('left_ankle');
    const rightAnkle = kpMap.get('right_ankle');
    const leftHip = kpMap.get('left_hip');
    const rightHip = kpMap.get('right_hip');
    const leftShoulder = kpMap.get('left_shoulder');
    const rightShoulder = kpMap.get('right_shoulder');

    const lastTimes = this.lastActionTimes.get(playerId) || { stroke: 0, movement: 0 };

    // Don't spam movement events more often than every 600ms
    if (now - lastTimes.movement < 600) {
      return null;
    }

    // 1. Detect Lunge (Extension between ankles relative to shoulders)
    if (leftAnkle && rightAnkle && leftShoulder && rightShoulder) {
      const stanceWidth = Math.abs(leftAnkle.x - rightAnkle.x);
      const shoulderWidth = Math.max(1, Math.abs(leftShoulder.x - rightShoulder.x));
      const extensionRatio = stanceWidth / shoulderWidth;

      if (extensionRatio > 1.85) {
        this.lastActionTimes.set(playerId, { ...lastTimes, movement: now });
        return {
          id: `act-${now}-${playerId}`,
          timestamp: Date.now(),
          playerId,
          playerRole: player.assignedRole || (player.team === 'A' ? 'A1' : 'B1'),
          playerName: player.customName,
          team: player.team,
          courtPosition: { ...player.courtPosition },
          category: 'movement',
          action: 'lunge',
          confidence: Math.min(0.98, 0.75 + (extensionRatio - 1.85) * 0.2),
          metrics: { lungeExtensionRatio: Math.round(extensionRatio * 10) / 10 },
        };
      }
    }

    // 2. Detect Jump or Split-Step (Ankles / Hips rising significantly above baseline)
    if (leftAnkle && rightAnkle && leftHip && rightHip) {
      const currentAvgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
      const history = this.previousAnkleHeights.get(playerId) || [];
      history.push(currentAvgAnkleY);
      if (history.length > 10) history.shift();
      this.previousAnkleHeights.set(playerId, history);

      if (history.length >= 5) {
        const floorY = Math.max(...history);
        const deltaPx = floorY - currentAvgAnkleY;
        const estJumpHeightM = Math.max(0, (deltaPx / player.bbox.height) * 1.75);

        if (estJumpHeightM > 0.35) {
          this.lastActionTimes.set(playerId, { ...lastTimes, movement: now });
          return {
            id: `act-${now}-${playerId}`,
            timestamp: Date.now(),
            playerId,
            playerRole: player.assignedRole || (player.team === 'A' ? 'A1' : 'B1'),
            playerName: player.customName,
            team: player.team,
            courtPosition: { ...player.courtPosition },
            category: 'movement',
            action: 'jump',
            confidence: 0.92,
            metrics: { jumpHeightM: Math.round(estJumpHeightM * 100) / 100 },
          };
        } else if (estJumpHeightM > 0.12 && estJumpHeightM <= 0.32) {
          this.lastActionTimes.set(playerId, { ...lastTimes, movement: now });
          return {
            id: `act-${now}-${playerId}`,
            timestamp: Date.now(),
            playerId,
            playerRole: player.assignedRole || (player.team === 'A' ? 'A1' : 'B1'),
            playerName: player.customName,
            team: player.team,
            courtPosition: { ...player.courtPosition },
            category: 'movement',
            action: 'split_step',
            confidence: 0.88,
            metrics: { jumpHeightM: Math.round(estJumpHeightM * 100) / 100 },
          };
        }
      }
    }

    // 3. Detect Backward Chasse / Retreat
    const trail = player.movementTrail;
    if (trail && trail.length >= 6) {
      const pOld = trail[trail.length - 6];
      const pNew = trail[trail.length - 1];

      // Team A faces positive Y (back is small Y), Team B faces negative Y (back is large Y)
      const movingBackwards =
        (player.team === 'A' && pNew.y < pOld.y - 0.5) ||
        (player.team === 'B' && pNew.y > pOld.y + 0.5);

      if (movingBackwards) {
        this.lastActionTimes.set(playerId, { ...lastTimes, movement: now });
        return {
          id: `act-${now}-${playerId}`,
          timestamp: Date.now(),
          playerId,
          playerRole: player.assignedRole || (player.team === 'A' ? 'A1' : 'B1'),
          playerName: player.customName,
          team: player.team,
          courtPosition: { ...player.courtPosition },
          category: 'movement',
          action: 'backward_chasse',
          confidence: 0.85,
        };
      }

      // 4. Recovery to Base (Moving towards central T: x ~ 3.05m, y ~ 3.5m for A or 9.9m for B)
      const baseCoord = { x: 3.05, y: player.team === 'A' ? 3.5 : 9.9 };
      const distOld = Math.hypot(pOld.x - baseCoord.x, pOld.y - baseCoord.y);
      const distNew = Math.hypot(pNew.x - baseCoord.x, pNew.y - baseCoord.y);

      if (distOld - distNew > 0.6 && distNew < 1.4) {
        this.lastActionTimes.set(playerId, { ...lastTimes, movement: now });
        return {
          id: `act-${now}-${playerId}`,
          timestamp: Date.now(),
          playerId,
          playerRole: player.assignedRole || (player.team === 'A' ? 'A1' : 'B1'),
          playerName: player.customName,
          team: player.team,
          courtPosition: { ...player.courtPosition },
          category: 'movement',
          action: 'recovery_to_base',
          confidence: 0.89,
        };
      }
    }

    return null;
  }

  /**
   * Classifies a stroke upon shuttlecock contact / strike event
   */
  public classifyStroke(
    striker: TrackedPlayer,
    shuttle: ShuttlecockTrack,
    isInitialServe = false,
    now = performance.now()
  ): PlayerActionEvent {
    const kpMap = new Map((striker.keypoints || []).map((k) => [k.name, k]));
    const leftWrist = kpMap.get('left_wrist');
    const rightWrist = kpMap.get('right_wrist');
    const leftShoulder = kpMap.get('left_shoulder');
    const rightShoulder = kpMap.get('right_shoulder');
    const leftHip = kpMap.get('left_hip');
    const rightHip = kpMap.get('right_hip');

    const highestWristY = Math.min(leftWrist?.y ?? 9999, rightWrist?.y ?? 9999);
    const avgShoulderY = ((leftShoulder?.y ?? 0) + (rightShoulder?.y ?? 0)) / 2;
    const avgHipY = ((leftHip?.y ?? 0) + (rightHip?.y ?? 0)) / 2;

    const isOverhead = highestWristY < avgShoulderY - 10;
    const isUnderarm = highestWristY > avgHipY;

    const speed = shuttle.speedKmh;
    const courtY = striker.courtPosition?.y ?? (striker.team === 'A' ? 3.0 : 10.0);
    const isNearNet = Math.abs(courtY - 6.70) < 2.0;

    let stroke: StrokeType;
    let confidence = 0.90;

    if (isInitialServe) {
      stroke = speed > 100 ? 'flick' : 'serve';
    } else if (isOverhead) {
      if (speed >= 180) {
        // High speed smash! Check if jump smash
        const isJumping = (striker.speedKmh || 0) > 10 || Math.abs(avgShoulderY - (highestWristY + 60)) > 40;
        stroke = isJumping ? 'jump_smash' : 'smash';
        confidence = 0.96;
      } else if (speed >= 100) {
        stroke = 'clear';
      } else {
        stroke = 'drop';
      }
    } else if (isUnderarm) {
      if (isNearNet) {
        stroke = speed < 60 ? 'net_shot' : 'lift';
      } else {
        stroke = 'lift';
      }
    } else {
      // Waist level
      if (speed > 130) {
        stroke = 'drive';
      } else {
        stroke = isNearNet ? 'block' : 'drive';
      }
    }

    const playerId = striker.trackId;
    const lastTimes = this.lastActionTimes.get(playerId) || { stroke: 0, movement: 0 };
    this.lastActionTimes.set(playerId, { ...lastTimes, stroke: now });

    return {
      id: `stroke-${now}-${playerId}`,
      timestamp: Date.now(),
      playerId,
      playerRole: striker.assignedRole || (striker.team === 'A' ? 'A1' : 'B1'),
      playerName: striker.customName,
      team: striker.team,
      courtPosition: striker.courtPosition ? { ...striker.courtPosition } : { x: 3.05, y: courtY },
      category: 'stroke',
      action: stroke,
      confidence,
      metrics: {
        shuttleSpeedKmh: Math.round(speed),
      },
    };
  }

  /**
   * Classifies a miss when a rally terminates
   */
  public classifyMiss(
    defender: TrackedPlayer,
    landingCourt: Point2D,
    lastOpponentStroke?: StrokeType
  ): PlayerActionEvent {
    const playerPos = defender.courtPosition || { x: 3.05, y: defender.team === 'A' ? 3.0 : 10.0 };
    const distToLanding = Math.hypot(playerPos.x - landingCourt.x, playerPos.y - landingCourt.y);

    let missAction: MissType;
    let confidence = 0.88;

    if (distToLanding < 1.2) {
      // Very close to shuttle: attempted return or mistimed
      missAction = 'failed_return';
      confidence = 0.94;
    } else if (distToLanding < 2.2) {
      // Moderate distance: mistimed or no reaction
      missAction = lastOpponentStroke === 'smash' || lastOpponentStroke === 'jump_smash'
        ? 'no_reaction'
        : 'mistimed_swing';
    } else {
      // Far away out of reach
      missAction = 'shuttle_left_unreached';
      confidence = 0.91;
    }

    return {
      id: `miss-${Date.now()}-${defender.trackId}`,
      timestamp: Date.now(),
      playerId: defender.trackId,
      playerRole: defender.assignedRole || (defender.team === 'A' ? 'A1' : 'B1'),
      playerName: defender.customName,
      team: defender.team,
      courtPosition: { ...playerPos },
      category: 'miss',
      action: missAction,
      confidence,
    };
  }
}
