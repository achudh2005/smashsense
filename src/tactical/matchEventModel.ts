import { StrokeType } from '../detection/motionClassifier';
import { TacticalLandingZone } from '../court/lineCallEngine';
import { PlayerRole } from '../tracking/byteTrack';
import { Team, GameStateSnapshot } from '../game/scoringEngine';
import { CompletedRally, PointType } from '../game/rallyStateMachine';

export type ErrorType =
  | 'OUT'
  | 'NET'
  | 'FAILED_RETURN'
  | 'MISTIMED_SWING'
  | 'NO_REACTION'
  | 'UNFORCED'
  | 'FORCED';

export interface DetailedMatchEvent {
  id: string;
  rallyNumber: number;
  gameIndex: number;
  timestamp: number;
  shotType: StrokeType;
  shotZone: TacticalLandingZone;
  shotZoneIndex: number; // 1 to 9
  winner: {
    team: Team;
    playerRole: PlayerRole;
    playerName: string;
  };
  errorType?: ErrorType;
  rallyLength: {
    shotCount: number;
    durationSeconds: number;
  };
  server: {
    team: Team;
    playerRole: PlayerRole;
  };
  scoreState: {
    scoreA: number;
    scoreB: number;
    lead: number;
    isGamePoint: boolean;
    isMatchPoint: boolean;
    isIntervalPoint: boolean; // e.g. score reaches 11
  };
  shuttleSpeedKmh: number;
  pointType: PointType;
}

/**
 * Maps 9-grid TacticalLandingZone to numeric index 1-9
 * 1: Front-Left, 2: Front-Center, 3: Front-Right
 * 4: Mid-Left,   5: Mid-Center,   6: Mid-Right
 * 7: Back-Left,  8: Back-Center,  9: Back-Right
 */
export function getZoneIndex(zone: TacticalLandingZone): number {
  switch (zone) {
    case 'Front-Left': return 1;
    case 'Front-Center': return 2;
    case 'Front-Right': return 3;
    case 'Mid-Left': return 4;
    case 'Mid-Center': return 5;
    case 'Mid-Right': return 6;
    case 'Back-Left': return 7;
    case 'Back-Center': return 8;
    case 'Back-Right': return 9;
    default: return 5;
  }
}

export function getZoneNameFromIndex(index: number): TacticalLandingZone {
  switch (index) {
    case 1: return 'Front-Left';
    case 2: return 'Front-Center';
    case 3: return 'Front-Right';
    case 4: return 'Mid-Left';
    case 5: return 'Mid-Center';
    case 6: return 'Mid-Right';
    case 7: return 'Back-Left';
    case 8: return 'Back-Center';
    case 9: return 'Back-Right';
    default: return 'Mid-Center';
  }
}

/**
 * Determines error type from a completed rally's line call and action list
 */
export function determineErrorType(rally: CompletedRally): ErrorType | undefined {
  if (rally.pointType === 'WINNER') {
    return undefined;
  }

  if (rally.lineCall.call === 'OUT') {
    return 'OUT';
  }

  // Check actions for net errors, failed returns, or mistimed swings
  const lastAction = rally.actions[rally.actions.length - 1];
  if (lastAction) {
    if (lastAction.action === 'failed_return') return 'FAILED_RETURN';
    if (lastAction.action === 'mistimed_swing') return 'MISTIMED_SWING';
    if (lastAction.action === 'no_reaction' || lastAction.action === 'shuttle_left_unreached') return 'NO_REACTION';
  }

  return rally.pointType === 'UNFORCED_ERROR' ? 'UNFORCED' : 'FORCED';
}

/**
 * Constructs a DetailedMatchEvent from a completed rally and current game snapshot
 */
export function createDetailedMatchEvent(
  rally: CompletedRally,
  snapshot: GameStateSnapshot,
  playerNames: Record<PlayerRole, string>
): DetailedMatchEvent {
  const isInterval = (snapshot.scoreA === 11 && snapshot.scoreB < 11) ||
                     (snapshot.scoreB === 11 && snapshot.scoreA < 11);

  const isGamePt = (snapshot.scoreA >= 20 || snapshot.scoreB >= 20) &&
                   Math.abs(snapshot.scoreA - snapshot.scoreB) >= 1;

  const isMatchPt = isGamePt && (
    (snapshot.gamesWonA === 1 && snapshot.scoreA >= 20) ||
    (snapshot.gamesWonB === 1 && snapshot.scoreB >= 20)
  );

  return {
    id: rally.id,
    rallyNumber: rally.rallyNumber,
    gameIndex: rally.gameIndex,
    timestamp: rally.endTime || Date.now(),
    shotType: rally.endingStroke || 'clear',
    shotZone: rally.lineCall.landingZone,
    shotZoneIndex: getZoneIndex(rally.lineCall.landingZone),
    winner: {
      team: rally.winningTeam,
      playerRole: rally.creditedPlayer,
      playerName: playerNames[rally.creditedPlayer] || (rally.winningTeam === 'A' ? 'Team A' : 'Team B'),
    },
    errorType: determineErrorType(rally),
    rallyLength: {
      shotCount: rally.shotCount,
      durationSeconds: Math.round(rally.durationSeconds * 10) / 10,
    },
    server: {
      team: snapshot.servingSide,
      playerRole: snapshot.currentServer,
    },
    scoreState: {
      scoreA: snapshot.scoreA,
      scoreB: snapshot.scoreB,
      lead: snapshot.scoreA - snapshot.scoreB,
      isGamePoint: isGamePt,
      isMatchPoint: isMatchPt,
      isIntervalPoint: isInterval,
    },
    shuttleSpeedKmh: Math.round(rally.maxSpeedKmh),
    pointType: rally.pointType,
  };
}
