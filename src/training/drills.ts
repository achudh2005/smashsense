import { Point2D } from '../court/courtGeometry';

export type DrillType = 'target_zone' | 'footwork' | 'shot_counter';

export interface TargetZone {
  name: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  idealPoint: Point2D;
}

export interface TrainingDrillConfig {
  id: string;
  name: string;
  category: DrillType;
  description: string;
  instructions: string[];
  targetReps: number;
  targetDurationSeconds: number;
  targetZone?: TargetZone;
  minSpeedKmh?: number;
  courtHalf?: 'near' | 'far'; // near is Y in [0, 6.7], far is Y in [6.7, 13.4]
}

export const PRESET_DRILLS: TrainingDrillConfig[] = [
  {
    id: 'short-serve-t',
    name: 'Short Serve to the "T"',
    category: 'target_zone',
    description: 'Master tight, low-skimming short serves landing right on the front T intersection.',
    instructions: [
      'Stand in your standard service court.',
      'Aim for the 60cm circle centered on the T intersection (short service line).',
      'Execute 10 clean serves; keep flight height minimal above the net.',
    ],
    targetReps: 10,
    targetDurationSeconds: 120,
    courtHalf: 'far',
    targetZone: {
      name: 'Front Center T',
      minX: 2.7,
      maxX: 3.4,
      minY: 6.7,
      maxY: 7.4,
      idealPoint: { x: 3.05, y: 7.0 },
    },
  },
  {
    id: 'forecourt-drop-precision',
    name: 'Hairpin Drop Shot Touch',
    category: 'target_zone',
    description: 'Hone slice and reverse-slice drops landing within 80cm of the net tape in the front tramline.',
    instructions: [
      'Hit drops from midcourt or rear court.',
      'Guide the shuttlecock into the highlighted front corner box.',
      'Maintain racket head control to minimize net errors.',
    ],
    targetReps: 15,
    targetDurationSeconds: 180,
    courtHalf: 'far',
    targetZone: {
      name: 'Far Left Front Box',
      minX: 0.46,
      maxX: 1.8,
      minY: 6.7,
      maxY: 7.6,
      idealPoint: { x: 1.13, y: 7.15 },
    },
  },
  {
    id: 'line-smash-power',
    name: 'Down-the-Line Smash Attack',
    category: 'target_zone',
    description: 'Develop blistering straight smashes landing tightly inside the sideline corridors.',
    instructions: [
      'Jump or standing smash down the right sideline.',
      'Target shuttle speed above 160 km/h.',
      'Land within the side alley tramline.',
    ],
    targetReps: 12,
    targetDurationSeconds: 150,
    minSpeedKmh: 160,
    courtHalf: 'far',
    targetZone: {
      name: 'Right Sideline Tramline',
      minX: 5.64,
      maxX: 6.1,
      minY: 8.5,
      maxY: 12.5,
      idealPoint: { x: 5.87, y: 10.5 },
    },
  },
  {
    id: 'four-corner-shadow',
    name: '4-Corner Shadow Footwork',
    category: 'footwork',
    description: 'Agility drill: respond to randomized corner callouts and rapidly recover to base.',
    instructions: [
      'Start at base position (center of near court: X=3.05m, Y=3.35m).',
      'Explode toward the indicated corner on the screen.',
      'Plant foot, mimic stroke, and recover to base in under 1.5 seconds.',
    ],
    targetReps: 16,
    targetDurationSeconds: 120,
    courtHalf: 'near',
  },
  {
    id: 'speed-rally-counter',
    name: 'Continuous Rally & Cadence Counter',
    category: 'shot_counter',
    description: 'Sustain uninterrupted, rapid strokes to build shot volume and stamina.',
    instructions: [
      'Maintain continuous strokes against a wall or feeder.',
      'Live counter tracks pace (strokes per minute) and total volume.',
      'Target 30 continuous shots without breaking rhythm.',
    ],
    targetReps: 30,
    targetDurationSeconds: 90,
  },
];

export interface DrillAttemptResult {
  attemptNumber: number;
  timestamp: number;
  isHit: boolean;
  distanceToTargetMeters?: number;
  speedKmh?: number;
  recoveryTimeSec?: number;
}

export function evaluateTargetShot(
  landingCourt: Point2D,
  zone: TargetZone,
  speedKmh: number = 0,
  minSpeedKmh: number = 0
): { isHit: boolean; distanceMeters: number; score: number } {
  const dx = landingCourt.x - zone.idealPoint.x;
  const dy = landingCourt.y - zone.idealPoint.y;
  const distance = Math.hypot(dx, dy);

  const insideBox =
    landingCourt.x >= zone.minX &&
    landingCourt.x <= zone.maxX &&
    landingCourt.y >= zone.minY &&
    landingCourt.y <= zone.maxY;

  const speedMet = minSpeedKmh <= 0 || speedKmh >= minSpeedKmh;
  const isHit = insideBox && speedMet;

  // Score decreases with distance from ideal point (100 at 0m, 50 at 0.8m, 0 at >=1.5m)
  const accuracyScore = Math.max(0, Math.min(100, Math.round(100 - distance * 60)));
  const speedBonus = minSpeedKmh > 0 && speedKmh >= minSpeedKmh ? 10 : 0;
  const finalScore = Math.min(100, accuracyScore + speedBonus);

  return { isHit, distanceMeters: Number(distance.toFixed(2)), score: finalScore };
}
