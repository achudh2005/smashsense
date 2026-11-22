import Dexie, { type EntityTable } from 'dexie';
import { Point2D } from '../court/courtGeometry';
import { Matrix3x3 } from '../court/homography';
import { PlayerActionEvent } from '../detection/motionClassifier';
import { CompletedRally } from '../game/rallyStateMachine';
import { DetailedMatchEvent } from '../tactical/matchEventModel';

export interface VenueRecord {
  id?: number;
  name: string;
  notes?: string;
  createdAt: number;
  lastUsedAt: number;
}

export interface CalibrationRecord {
  id?: number;
  venueId?: number;
  venueName: string;
  screenCorners: Point2D[];
  courtToImageMatrix: Matrix3x3;
  imageToCourtMatrix: Matrix3x3;
  cameraResolution: string;
  updatedAt: number;
}

export interface MatchRecord {
  id?: number;
  venueName: string;
  format: 'singles' | 'doubles';
  teamANames: string[];
  teamBNames: string[];
  firstServer: 'A1' | 'A2' | 'B1' | 'B2';
  scoreA: number;
  scoreB: number;
  rallyCount: number;
  maxShuttleSpeedKmh: number;
  createdAt: number;
  endedAt?: number;
}

export interface MatchEventRecord {
  id?: number;
  matchId: number;
  timestamp: number;
  type: 'serve' | 'rally_start' | 'rally_end' | 'smash' | 'point_team_a' | 'point_team_b';
  speedKmh?: number;
  playerRole?: string;
  courtCoord?: Point2D;
}

export interface DrillResultRecord {
  id?: number;
  drillId: string;
  drillType: string;
  drillName: string;
  timestamp: number;
  durationSeconds: number;
  repsCompleted: number;
  targetAccuracyPercent: number;
  score: number;
  topSpeedKmh?: number;
  notes?: string;
}

export interface FlaggedCallRecord {
  id: string;
  timestamp: number;
  rallyNumber: number;
  gameIndex: number;
  call: string;
  confidence: number;
  distanceToLineCm: number;
  landingCourt: Point2D;
  userVerdict?: 'CONFIRMED' | 'OVERTURNED';
  adjustedMarginCm?: number;
}

export interface TournamentMatch {
  id: string;
  roundIndex: number;
  matchIndex: number;
  playerA: string;
  playerB: string;
  scoreA?: number;
  scoreB?: number;
  winner?: string;
  isCompleted: boolean;
  nextMatchId?: string;
}

export interface TournamentRecord {
  id?: number;
  title: string;
  format: 'single_elimination' | 'double_elimination' | 'round_robin';
  participants: string[];
  matches: TournamentMatch[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  champion?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerProfileRecord {
  id?: number;
  name: string;
  totalMatches: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
  topSmashSpeedKmh: number;
  totalSmashes: number;
  bestScoringStreak: number;
  updatedAt: number;
}

export class SmashSenseDatabase extends Dexie {
  venues!: EntityTable<VenueRecord, 'id'>;
  calibrations!: EntityTable<CalibrationRecord, 'id'>;
  matches!: EntityTable<MatchRecord, 'id'>;
  events!: EntityTable<MatchEventRecord, 'id'>;
  playerEvents!: EntityTable<PlayerActionEvent, 'id'>;
  rallies!: EntityTable<CompletedRally, 'id'>;
  drillResults!: EntityTable<DrillResultRecord, 'id'>;
  flaggedCalls!: EntityTable<FlaggedCallRecord, 'id'>;
  playerProfiles!: EntityTable<PlayerProfileRecord, 'id'>;
  detailedEvents!: EntityTable<DetailedMatchEvent, 'id'>;
  tournaments!: EntityTable<TournamentRecord, 'id'>;

  constructor() {
    super('SmashSenseDB');
    this.version(5).stores({
      venues: '++id, name, lastUsedAt',
      calibrations: '++id, venueId, venueName, updatedAt',
      matches: '++id, venueName, createdAt',
      events: '++id, matchId, timestamp, type',
      playerEvents: 'id, timestamp, playerId, playerRole, action, category',
      rallies: 'id, rallyNumber, gameIndex, startTime, winningTeam, pointType, endingStroke',
      drillResults: '++id, drillId, drillType, timestamp, score',
      flaggedCalls: 'id, timestamp, call, confidence, userVerdict',
      playerProfiles: '++id, &name, totalMatches, winRate, topSmashSpeedKmh',
      detailedEvents: 'id, rallyNumber, gameIndex, timestamp, shotType, shotZoneIndex',
      tournaments: '++id, title, format, status, createdAt',
    });
  }
}

export const db = new SmashSenseDatabase();

/**
 * Seed initial default venue and calibration if empty
 */
export async function initDefaultVenueAndCalibration(screenWidth = 1280, screenHeight = 720) {
  const count = await db.venues.count();
  if (count === 0) {
    const venueId = await db.venues.add({
      name: 'Default Badminton Court',
      notes: 'Standard indoor court calibration preset',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });

    const defaultCorners: Point2D[] = [
      { x: screenWidth * 0.30, y: screenHeight * 0.16 }, // TL
      { x: screenWidth * 0.70, y: screenHeight * 0.16 }, // TR
      { x: screenWidth * 0.88, y: screenHeight * 0.86 }, // BR
      { x: screenWidth * 0.12, y: screenHeight * 0.86 }, // BL
    ];

    await db.calibrations.add({
      venueId: Number(venueId),
      venueName: 'Default Badminton Court',
      screenCorners: defaultCorners,
      courtToImageMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      imageToCourtMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      cameraResolution: '720p',
      updatedAt: Date.now(),
    });
  }
}
