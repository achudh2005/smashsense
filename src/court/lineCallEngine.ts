import { Point2D, BWF_COURT } from './courtGeometry';
import { MatchFormat } from '../game/scoringEngine';

export type LineCallResult = 'IN' | 'OUT';

export type TacticalLandingZone =
  | 'Front-Left'
  | 'Front-Center'
  | 'Front-Right'
  | 'Mid-Left'
  | 'Mid-Center'
  | 'Mid-Right'
  | 'Back-Left'
  | 'Back-Center'
  | 'Back-Right';

export interface LineCallEvaluation {
  call: LineCallResult;
  confidencePercent: number; // e.g. 98%
  isUncertain: boolean;      // true if within close-call margin (5cm)
  distanceToLineCm: number;  // absolute distance in cm to closest boundary line
  closestLineName: string;   // e.g. "Right Singles Sideline", "Back Baseline"
  landingCourt: Point2D;
  landingZone: TacticalLandingZone;
}

export interface ShuttleFlightMetrics {
  speedKmh: number;
  heightAtNetCrossingM?: number; // clearance above 1.524m net
  shotDirection: 'straight' | 'cross';
  landingZone: TacticalLandingZone;
}

/**
 * Evaluates whether a shuttle landing spot is IN or OUT on the court
 */
export function evaluateLineCall(
  courtCoord: Point2D,
  format: MatchFormat = 'singles',
  isService = false,
  servingSide: 'A' | 'B' = 'A',
  targetServiceCourt: 'right' | 'left' = 'right'
): LineCallEvaluation {
  const { x, y } = courtCoord;
  const { length, widthDoubles, singlesSideMargin, netY, shortServiceDistance, doublesLongServiceDistance } = BWF_COURT;

  const minX = format === 'singles' ? singlesSideMargin : 0;
  const maxX = format === 'singles' ? widthDoubles - singlesSideMargin : widthDoubles;
  const minY = 0;
  const maxY = length;

  // During serve, receiver box boundaries apply:
  if (isService) {
    // If Team A served, shuttle lands in Team B half (y > 6.70)
    if (servingSide === 'A') {
      const shortService = netY + shortServiceDistance; // 8.68m
      const longService = format === 'doubles' ? length - doublesLongServiceDistance : length;
      const midCourtX = widthDoubles / 2;

      // Diagonal target court
      const serveMinX = targetServiceCourt === 'right' ? midCourtX : (format === 'singles' ? singlesSideMargin : 0);
      const serveMaxX = targetServiceCourt === 'right' ? (format === 'singles' ? widthDoubles - singlesSideMargin : widthDoubles) : midCourtX;

      return evaluateBoxBounds(x, y, serveMinX, serveMaxX, shortService, longService, 'Service Box (Team B)');
    } else {
      // Team B served, shuttle lands in Team A half (y < 6.70)
      const shortService = netY - shortServiceDistance; // 4.72m
      const longService = format === 'doubles' ? doublesLongServiceDistance : 0;
      const midCourtX = widthDoubles / 2;

      const serveMinX = targetServiceCourt === 'right' ? (format === 'singles' ? singlesSideMargin : 0) : midCourtX;
      const serveMaxX = targetServiceCourt === 'right' ? midCourtX : (format === 'singles' ? widthDoubles - singlesSideMargin : widthDoubles);

      return evaluateBoxBounds(x, y, serveMinX, serveMaxX, longService, shortService, 'Service Box (Team A)');
    }
  }

  // General in-rally court boundaries
  const distLeft = x - minX;
  const distRight = maxX - x;
  const distTop = y - minY;
  const distBottom = maxY - y;

  const isInside = distLeft >= 0 && distRight >= 0 && distTop >= 0 && distBottom >= 0;

  // Find distance to closest line
  let minMarginMeters: number;
  let closestLine = 'Baseline';

  if (isInside) {
    minMarginMeters = Math.min(distLeft, distRight, distTop, distBottom);
    if (minMarginMeters === distLeft) closestLine = format === 'singles' ? 'Left Singles Sideline' : 'Left Doubles Sideline';
    else if (minMarginMeters === distRight) closestLine = format === 'singles' ? 'Right Singles Sideline' : 'Right Doubles Sideline';
    else if (minMarginMeters === distTop) closestLine = 'Team A Baseline';
    else closestLine = 'Team B Baseline';
  } else {
    const outX = x < minX ? minX - x : x > maxX ? x - maxX : 0;
    const outY = y < minY ? minY - y : y > maxY ? y - maxY : 0;
    minMarginMeters = Math.hypot(outX, outY);

    if (x < minX) closestLine = format === 'singles' ? 'Left Singles Sideline' : 'Left Doubles Sideline';
    else if (x > maxX) closestLine = format === 'singles' ? 'Right Singles Sideline' : 'Right Doubles Sideline';
    else if (y < minY) closestLine = 'Team A Baseline';
    else closestLine = 'Team B Baseline';
  }

  const distanceCm = Math.round(minMarginMeters * 100);
  const isUncertain = distanceCm <= 5; // Close call within 5cm

  // Confidence formula:
  // > 15cm: 99% confident
  // 5-15cm: 85-98% confident
  // 0-5cm: 60-84% confident (hawk-eye review range)
  let confidence: number;
  if (distanceCm > 15) {
    confidence = 99;
  } else if (distanceCm > 5) {
    confidence = Math.round(85 + ((distanceCm - 5) / 10) * 13);
  } else {
    confidence = Math.round(60 + (distanceCm / 5) * 24);
  }

  const landingZone = getTacticalLandingZone(courtCoord);

  return {
    call: isInside ? 'IN' : 'OUT',
    confidencePercent: confidence,
    isUncertain,
    distanceToLineCm: distanceCm,
    closestLineName: closestLine,
    landingCourt: courtCoord,
    landingZone,
  };
}

function evaluateBoxBounds(
  x: number,
  y: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  boxName: string
): LineCallEvaluation {
  const isInside = x >= minX && x <= maxX && y >= minY && y <= maxY;
  const distLeft = x - minX;
  const distRight = maxX - x;
  const distTop = y - minY;
  const distBottom = maxY - y;

  let minMarginMeters: number;
  if (isInside) {
    minMarginMeters = Math.min(distLeft, distRight, distTop, distBottom);
  } else {
    const outX = x < minX ? minX - x : x > maxX ? x - maxX : 0;
    const outY = y < minY ? minY - y : y > maxY ? y - maxY : 0;
    minMarginMeters = Math.hypot(outX, outY);
  }

  const distanceCm = Math.round(minMarginMeters * 100);
  const isUncertain = distanceCm <= 5;
  const confidence = distanceCm > 15 ? 99 : Math.round(60 + (distanceCm / 15) * 38);

  return {
    call: isInside ? 'IN' : 'OUT',
    confidencePercent: confidence,
    isUncertain,
    distanceToLineCm: distanceCm,
    closestLineName: boxName,
    landingCourt: { x, y },
    landingZone: getTacticalLandingZone({ x, y }),
  };
}

/**
 * Classifies landing position into one of 9 discrete tactical court zones
 */
export function getTacticalLandingZone(coord: Point2D): TacticalLandingZone {
  const { widthDoubles, length } = BWF_COURT;
  const normX = Math.max(0, Math.min(widthDoubles, coord.x)) / widthDoubles;
  const normY = Math.max(0, Math.min(length, coord.y)) / length;

  // X partition (Left, Center, Right)
  const col = normX < 0.333 ? 'Left' : normX < 0.666 ? 'Center' : 'Right';

  // Y partition (Front, Mid, Back)
  // Front: 0.35 to 0.65 (around net)
  // Back: near baseline (< 0.20 or > 0.80)
  // Mid: in between
  let row: 'Front' | 'Mid' | 'Back';
  const distFromNet = Math.abs(normY - 0.5);

  if (distFromNet < 0.16) {
    row = 'Front';
  } else if (distFromNet < 0.34) {
    row = 'Mid';
  } else {
    row = 'Back';
  }

  return `${row}-${col}` as TacticalLandingZone;
}

/**
 * Calculates shuttle flight trajectory metrics
 */
export function calculateFlightMetrics(
  origin: Point2D,
  landing: Point2D,
  speedKmh: number,
  netCrossingApexM?: number
): ShuttleFlightMetrics {
  const deltaX = Math.abs(landing.x - origin.x);
  const shotDirection: 'straight' | 'cross' = deltaX > 1.8 ? 'cross' : 'straight';
  const landingZone = getTacticalLandingZone(landing);

  return {
    speedKmh,
    heightAtNetCrossingM: netCrossingApexM !== undefined ? Math.max(0, netCrossingApexM - 1.524) : undefined,
    shotDirection,
    landingZone,
  };
}
