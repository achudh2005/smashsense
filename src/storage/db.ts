import Dexie, { type EntityTable } from 'dexie';
import { Point2D } from '../court/courtGeometry';
import { Matrix3x3 } from '../court/homography';
import { PlayerActionEvent } from '../detection/motionClassifier';
import { CompletedRally } from '../game/rallyStateMachine';

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

export class SmashSenseDatabase extends Dexie {
  venues!: EntityTable<VenueRecord, 'id'>;
  calibrations!: EntityTable<CalibrationRecord, 'id'>;
  matches!: EntityTable<MatchRecord, 'id'>;
  events!: EntityTable<MatchEventRecord, 'id'>;
  playerEvents!: EntityTable<PlayerActionEvent, 'id'>;
  rallies!: EntityTable<CompletedRally, 'id'>;

  constructor() {
    super('SmashSenseDB');
    this.version(2).stores({
      venues: '++id, name, lastUsedAt',
      calibrations: '++id, venueId, venueName, updatedAt',
      matches: '++id, venueName, createdAt',
      events: '++id, matchId, timestamp, type',
      playerEvents: 'id, timestamp, playerId, playerRole, action, category',
      rallies: 'id, rallyNumber, gameIndex, startTime, winningTeam, pointType, endingStroke',
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
