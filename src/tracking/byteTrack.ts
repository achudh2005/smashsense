import { KalmanFilter2D } from './kalman';
import { Point2D } from '../court/courtGeometry';

export interface BoundingBox {
  x: number;      // top-left x
  y: number;      // top-left y
  width: number;
  height: number;
}

export interface Keypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

export interface RawPlayerDetection {
  bbox: BoundingBox;
  score: number;
  keypoints?: Keypoint[];
  footPosition?: Point2D; // bottom center of bbox or ankle keypoints
  jerseyColor?: { hex: string; name: string; isLight: boolean };
}

export type PlayerRole = 'A1' | 'A2' | 'B1' | 'B2';

export interface TrackedPlayer {
  trackId: number;
  assignedRole?: PlayerRole;
  customName?: string;
  team: 'A' | 'B';
  bbox: BoundingBox;
  courtPosition?: Point2D;
  keypoints?: Keypoint[];
  score: number;
  state: 'tentative' | 'tracked' | 'lost';
  timeSinceUpdate: number;
  totalHits: number;
  speedKmh?: number;
  movementTrail: Point2D[]; // recent court metric positions
  jerseyColor?: { hex: string; name: string; isLight: boolean };
  identificationStatus?: 'IDENTIFYING' | 'LOCKED' | 'TRACKING';
  courtSide?: 'Near Court (Team B)' | 'Far Court (Team A)';
  confidence?: number;
}

export function computeIoU(b1: BoundingBox, b2: BoundingBox): number {
  const x1 = Math.max(b1.x, b2.x);
  const y1 = Math.max(b1.y, b2.y);
  const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
  const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const area1 = b1.width * b1.height;
  const area2 = b2.width * b2.height;
  const union = area1 + area2 - intersection;

  return union > 0 ? intersection / union : 0;
}

export function computeDistance(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

export class MultiPlayerTracker {
  private nextId = 1;
  private maxLostFrames: number;
  private minHitsToConfirm: number;
  private tracks: Map<number, {
    track: TrackedPlayer;
    kalman: KalmanFilter2D;
  }> = new Map();

  // Role mappings persistently preserved across temporary track drops
  private assignedRoles = new Map<number, PlayerRole>();
  private assignedNames = new Map<PlayerRole, string>();

  constructor(options: { maxLostFrames?: number; minHitsToConfirm?: number } = {}) {
    this.maxLostFrames = options.maxLostFrames ?? 20; // survive ~0.7-1.0s occlusion
    this.minHitsToConfirm = options.minHitsToConfirm ?? 3;
  }

  public setPlayerRole(trackId: number, role: PlayerRole, name?: string): void {
    this.assignedRoles.set(trackId, role);
    if (name) {
      this.assignedNames.set(role, name);
    }
    const item = this.tracks.get(trackId);
    if (item) {
      item.track.assignedRole = role;
      item.track.team = role.startsWith('A') ? 'A' : 'B';
      if (name) item.track.customName = name;
    }
  }

  public getPlayerRole(trackId: number): PlayerRole | undefined {
    return this.assignedRoles.get(trackId);
  }

  /**
   * Automatically identifies and assigns player roles based on court positions and match config
   */
  public autoIdentifyPlayers(config: {
    format: 'singles' | 'doubles';
    teamANames: { A1: string; A2?: string };
    teamBNames: { B1: string; B2?: string };
  }): void {
    const active = Array.from(this.tracks.values())
      .filter(item => item.track.state === 'tracked' || item.track.totalHits >= this.minHitsToConfirm)
      .map(item => item.track);

    if (active.length === 0) return;

    // Separate players into Far Court (Team A: y < 6.70m) and Near Court (Team B: y >= 6.70m)
    const farPlayers: TrackedPlayer[] = [];
    const nearPlayers: TrackedPlayer[] = [];

    for (const player of active) {
      const courtY = player.courtPosition?.y;
      const screenY = player.bbox.y + player.bbox.height;
      const isFar = courtY !== undefined ? courtY < 6.70 : screenY < 380;
      if (isFar) {
        farPlayers.push(player);
      } else {
        nearPlayers.push(player);
      }
    }

    // Sort by X coordinate for left/right pairing in doubles
    farPlayers.sort((a, b) => (a.courtPosition?.x ?? a.bbox.x) - (b.courtPosition?.x ?? b.bbox.x));
    nearPlayers.sort((a, b) => (a.courtPosition?.x ?? a.bbox.x) - (b.courtPosition?.x ?? b.bbox.x));

    // Auto-assign Far Court players (Team A)
    farPlayers.forEach((p, idx) => {
      const role: PlayerRole = idx === 0 ? 'A1' : 'A2';
      const name = idx === 0 ? config.teamANames.A1 : (config.teamANames.A2 || 'Partner A');
      this.setPlayerRole(p.trackId, role, name);
      p.courtSide = 'Far Court (Team A)';
      p.identificationStatus = 'LOCKED';
      p.confidence = 0.95;
    });

    // Auto-assign Near Court players (Team B)
    nearPlayers.forEach((p, idx) => {
      const role: PlayerRole = idx === 0 ? 'B1' : 'B2';
      const name = idx === 0 ? config.teamBNames.B1 : (config.teamBNames.B2 || 'Partner B');
      this.setPlayerRole(p.trackId, role, name);
      p.courtSide = 'Near Court (Team B)';
      p.identificationStatus = 'LOCKED';
      p.confidence = 0.96;
    });
  }

  /**
   * Swap court sides for all assigned players (e.g. interval or game side-swap)
   */
  public swapSides(config: {
    format: 'singles' | 'doubles';
    teamANames: { A1: string; A2?: string };
    teamBNames: { B1: string; B2?: string };
  }): void {
    const updatedRoles = new Map<number, PlayerRole>();
    const updatedNames = new Map<PlayerRole, string>();

    for (const [trackId, role] of this.assignedRoles) {
      const isTeamA = role.startsWith('A');
      const newRole: PlayerRole = isTeamA
        ? (role === 'A1' ? 'B1' : 'B2')
        : (role === 'B1' ? 'A1' : 'A2');

      const newName = newRole === 'A1'
        ? config.teamANames.A1
        : newRole === 'A2'
        ? (config.teamANames.A2 || 'Partner A')
        : newRole === 'B1'
        ? config.teamBNames.B1
        : (config.teamBNames.B2 || 'Partner B');

      updatedRoles.set(trackId, newRole);
      updatedNames.set(newRole, newName);

      const item = this.tracks.get(trackId);
      if (item) {
        item.track.assignedRole = newRole;
        item.track.team = newRole.startsWith('A') ? 'A' : 'B';
        item.track.customName = newName;
        item.track.courtSide = newRole.startsWith('A') ? 'Far Court (Team A)' : 'Near Court (Team B)';
      }
    }

    this.assignedRoles = updatedRoles;
    this.assignedNames = updatedNames;
  }

  /**
   * Main tracking update with raw player detections
   */
  public update(detections: RawPlayerDetection[], dt: number = 1 / 30): TrackedPlayer[] {
    // 1. Predict all current tracks with Kalman
    for (const [, item] of this.tracks) {
      const predictedPos = item.kalman.predict(dt);
      item.track.timeSinceUpdate++;
      // Center bbox on predicted pos if lost
      if (item.track.state === 'lost') {
        item.track.bbox.x = predictedPos[0] - item.track.bbox.width / 2;
        item.track.bbox.y = predictedPos[1] - item.track.bbox.height / 2;
      }
    }

    // 2. Separate detections by confidence (ByteTrack approach)
    const highConfDets = detections.filter(d => d.score >= 0.5);
    const lowConfDets = detections.filter(d => d.score < 0.5 && d.score >= 0.2);

    const activeTrackIds = Array.from(this.tracks.keys());
    const unmatchedDets = new Set<number>(highConfDets.map((_, i) => i));
    const matchedTrackIds = new Set<number>();

    // 3. Match high-confidence detections first using IoU and Center Distance
    for (const trackId of activeTrackIds) {
      const item = this.tracks.get(trackId)!;
      let bestMatchIdx = -1;
      let bestScore = -1;

      for (const detIdx of unmatchedDets) {
        const det = highConfDets[detIdx];
        const iou = computeIoU(item.track.bbox, det.bbox);

        const trackCenter = {
          x: item.track.bbox.x + item.track.bbox.width / 2,
          y: item.track.bbox.y + item.track.bbox.height / 2
        };
        const detCenter = {
          x: det.bbox.x + det.bbox.width / 2,
          y: det.bbox.y + det.bbox.height / 2
        };
        const dist = computeDistance(trackCenter, detCenter);
        const normDistScore = Math.max(0, 1 - dist / (item.track.bbox.height * 1.5));

        // Combined score
        const matchScore = iou * 0.7 + normDistScore * 0.3;

        if (matchScore > 0.25 && matchScore > bestScore) {
          bestScore = matchScore;
          bestMatchIdx = detIdx;
        }
      }

      if (bestMatchIdx !== -1) {
        const det = highConfDets[bestMatchIdx];
        unmatchedDets.delete(bestMatchIdx);
        matchedTrackIds.add(trackId);

        // Update track
        this.updateTrackWithDetection(trackId, det);
      }
    }

    // 4. Secondary matching: Try matching remaining unmatched tracks with low confidence detections
    const remainingTrackIds = activeTrackIds.filter(id => !matchedTrackIds.has(id));
    for (const trackId of remainingTrackIds) {
      const item = this.tracks.get(trackId)!;
      let bestLowMatch = -1;
      let bestIoU = 0.2;

      lowConfDets.forEach((det, idx) => {
        const iou = computeIoU(item.track.bbox, det.bbox);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestLowMatch = idx;
        }
      });

      if (bestLowMatch !== -1) {
        const det = lowConfDets[bestLowMatch];
        matchedTrackIds.add(trackId);
        this.updateTrackWithDetection(trackId, det);
      }
    }

    // 5. Update state for unmatched tracks
    for (const trackId of activeTrackIds) {
      if (!matchedTrackIds.has(trackId)) {
        const item = this.tracks.get(trackId)!;
        if (item.track.timeSinceUpdate > this.maxLostFrames) {
          this.tracks.delete(trackId);
        } else {
          item.track.state = 'lost';
        }
      }
    }

    // 6. Create new tracks for remaining high confidence detections (up to 4 max players for badminton)
    if (this.tracks.size < 6) {
      for (const detIdx of unmatchedDets) {
        const det = highConfDets[detIdx];
        this.createNewTrack(det);
      }
    }

    // Return confirmed tracked players (or tentative with high score)
    return Array.from(this.tracks.values())
      .filter(item => item.track.state === 'tracked' || item.track.totalHits >= this.minHitsToConfirm)
      .map(item => item.track);
  }

  private updateTrackWithDetection(trackId: number, det: RawPlayerDetection): void {
    const item = this.tracks.get(trackId)!;
    const center = {
      x: det.bbox.x + det.bbox.width / 2,
      y: det.bbox.y + det.bbox.height / 2
    };

    // Kalman update
    item.kalman.update(center.x, center.y);

    item.track.bbox = det.bbox;
    item.track.score = det.score;
    item.track.keypoints = det.keypoints;
    item.track.timeSinceUpdate = 0;
    item.track.totalHits++;

    if (det.jerseyColor) {
      item.track.jerseyColor = det.jerseyColor;
    }

    if (item.track.totalHits >= this.minHitsToConfirm) {
      item.track.state = 'tracked';
    }

    // Calculate speed if court metric position is provided
    if (det.footPosition) {
      const prevPos = item.track.courtPosition;
      item.track.courtPosition = det.footPosition;

      if (prevPos) {
        const distMeters = computeDistance(prevPos, det.footPosition);
        const speedMps = distMeters / (1 / 30);
        // Instant speed clamped to realistic human sprint (max ~35 km/h)
        const instantKmh = Math.min(36, speedMps * 3.6);
        item.track.speedKmh = item.track.speedKmh
          ? item.track.speedKmh * 0.8 + instantKmh * 0.2
          : instantKmh;
      }

      // Add to movement trail (keep last 30 positions)
      item.track.movementTrail.push({ ...det.footPosition });
      if (item.track.movementTrail.length > 30) {
        item.track.movementTrail.shift();
      }
    }
  }

  private createNewTrack(det: RawPlayerDetection): number {
    const trackId = this.nextId++;
    const center = {
      x: det.bbox.x + det.bbox.width / 2,
      y: det.bbox.y + det.bbox.height / 2
    };

    const kalman = new KalmanFilter2D({ qPos: 0.1, qVel: 1.0, rPos: 2.0 });
    kalman.init(center.x, center.y);

    // Heuristic default team based on vertical position or court position
    const defaultTeam: 'A' | 'B' = (det.footPosition ? det.footPosition.y < 6.70 : center.y < 360) ? 'A' : 'B';

    const track: TrackedPlayer = {
      trackId,
      team: defaultTeam,
      bbox: det.bbox,
      score: det.score,
      keypoints: det.keypoints,
      courtPosition: det.footPosition,
      jerseyColor: det.jerseyColor,
      state: 'tentative',
      timeSinceUpdate: 0,
      totalHits: 1,
      speedKmh: 0,
      movementTrail: det.footPosition ? [det.footPosition] : []
    };

    // Reattach previously remembered role if matching
    const rememberedRole = this.assignedRoles.get(trackId);
    if (rememberedRole) {
      track.assignedRole = rememberedRole;
      track.team = rememberedRole.startsWith('A') ? 'A' : 'B';
      track.customName = this.assignedNames.get(rememberedRole);
    }

    this.tracks.set(trackId, { track, kalman });
    return trackId;
  }

  public reset(): void {
    this.tracks.clear();
    this.nextId = 1;
    this.assignedRoles.clear();
  }
}
