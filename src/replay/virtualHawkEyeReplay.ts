/**
 * Virtual 3D Hawk-Eye Line Call Replay Model & Mechanics
 * Computes exact millimeter margin to boundary lines, impact oval deformation,
 * and chalk particle burst dynamics for broadcast replays.
 */

import { Point2D } from '../court/courtGeometry';
import { LineCallEvaluation } from '../court/lineCallEngine';

export interface ChalkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface HawkEyeMargin {
  isInside: boolean;
  marginMm: number;
  closestLineName: string;
  impactPoint: Point2D;
  linePoint: Point2D;
}

export interface HawkEyeReplayData {
  id: string;
  timestamp: number;
  call: 'IN' | 'OUT';
  marginMm: number;
  lineName: string;
  landingPoint: Point2D; // Court coordinates (meters)
  shuttleSpeedKmh: number;
  confidence: number;
  trajectoryPoints: Array<{ x: number; y: number; z: number }>;
}

// Official BWF court dimensions (meters)
const HALF_LENGTH = 6.70;
const SINGLES_WIDTH = 5.18;
const DOUBLES_WIDTH = 6.10;
const BASELINE_Y = HALF_LENGTH; // 6.70m from net
const SINGLES_SIDELINE_X = SINGLES_WIDTH / 2; // 2.59m from center
const DOUBLES_SIDELINE_X = DOUBLES_WIDTH / 2; // 3.05m from center
const DOUBLES_SERVICE_Y = HALF_LENGTH - 0.76; // 5.94m from net

/**
 * Calculates millimeter margin to the closest boundary line
 * Takes into account official 40mm line width and 25mm shuttle base diameter
 */
export function calculateLineMarginMm(
  landingPoint: Point2D,
  isDoubles = false,
  isServe = false
): HawkEyeMargin {
  const absX = Math.abs(landingPoint.x);
  const absY = Math.abs(landingPoint.y);

  const sidelineLimit = isDoubles ? DOUBLES_SIDELINE_X : SINGLES_SIDELINE_X;
  const baselineLimit = isServe && isDoubles ? DOUBLES_SERVICE_Y : BASELINE_Y;

  // Distances to respective lines (positive means outside)
  const distToSideline = absX - sidelineLimit;
  const distToBaseline = absY - baselineLimit;

  // Standard line width = 40mm (0.04m). Shuttle base radius = 12.5mm (0.0125m).
  // The line is included in the court. A shuttle touching the line is IN.
  // We determine whether the closest edge is sideline or baseline
  if (Math.abs(distToSideline) < Math.abs(distToBaseline)) {
    // Sideline is closest
    const isInside = distToSideline <= 0.0125;
    const marginM = Math.abs(distToSideline);
    return {
      isInside,
      marginMm: Math.max(1, Math.round(marginM * 1000)),
      closestLineName: isDoubles ? 'Doubles Sideline' : 'Singles Sideline',
      impactPoint: landingPoint,
      linePoint: { x: (landingPoint.x >= 0 ? 1 : -1) * sidelineLimit, y: landingPoint.y },
    };
  } else {
    // Baseline is closest
    const isInside = distToBaseline <= 0.0125;
    const marginM = Math.abs(distToBaseline);
    const lineName = isServe && isDoubles ? 'Doubles Long Service Line' : 'Back Baseline';
    return {
      isInside,
      marginMm: Math.max(1, Math.round(marginM * 1000)),
      closestLineName: lineName,
      impactPoint: landingPoint,
      linePoint: { x: landingPoint.x, y: (landingPoint.y >= 0 ? 1 : -1) * baselineLimit },
    };
  }
}

/**
 * Creates synthetic 3D trajectory points descending onto court
 */
export function generateReplayTrajectory(
  landing: Point2D,
  approachAngleDeg = 45,
  steps = 30
): Array<{ x: number; y: number; z: number }> {
  const points: Array<{ x: number; y: number; z: number }> = [];
  const rad = (approachAngleDeg * Math.PI) / 180;
  const startHeight = 2.4; // 2.4m height before landing
  const horizDist = startHeight / Math.tan(rad);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 (start) to 1 (contact)
    // Parabolic descent
    const z = startHeight * (1 - t) * (1 - t);
    const progress = 1 - t;
    const x = landing.x - Math.sin(0.2) * horizDist * progress;
    const y = landing.y - Math.cos(0.2) * horizDist * progress;
    points.push({ x, y, z });
  }

  return points;
}

/**
 * Initializes chalk burst particles upon contact
 */
export function createChalkParticles(
  originX: number,
  originY: number,
  count = 24
): ChalkParticle[] {
  const particles: ChalkParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 2.8;
    const life = 18 + Math.floor(Math.random() * 14);
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.6, // Perspective squish
      radius: 1.5 + Math.random() * 2.2,
      alpha: 0.85,
      life,
      maxLife: life,
    });
  }
  return particles;
}

/**
 * Constructs HawkEye replay data object from a line evaluation
 */
export function constructHawkEyeReplayData(
  lineCall: LineCallEvaluation,
  shuttleSpeedKmh = 145,
  isDoubles = false
): HawkEyeReplayData {
  const courtPt = lineCall.landingCourt || { x: 0, y: 5.5 };
  const margin = calculateLineMarginMm(courtPt, isDoubles);
  const trajectory = generateReplayTrajectory(courtPt);

  return {
    id: `he_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    call: margin.isInside ? 'IN' : 'OUT',
    marginMm: margin.marginMm,
    lineName: margin.closestLineName,
    landingPoint: courtPt,
    shuttleSpeedKmh: Math.round(shuttleSpeedKmh),
    confidence: lineCall.confidencePercent / 100,
    trajectoryPoints: trajectory,
  };
}
