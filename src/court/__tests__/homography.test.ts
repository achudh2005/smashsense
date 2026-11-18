import { describe, it, expect } from 'vitest';
import {
  computeHomography,
  invert3x3,
  projectPoint,
  computeCourtCalibration,
  isPointInCourt,
} from '../homography';
import { Point2D, STANDARD_COURT_CORNERS, BWF_COURT } from '../courtGeometry';

describe('Homography & Perspective Transform', () => {
  it('computes exact identity mapping when src equals dst', () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    const H = computeHomography(pts, pts);
    const invH = invert3x3(H);
    expect(invH[0]).toBeCloseTo(1, 4);

    const testPt = { x: 42, y: 88 };
    const projected = projectPoint(H, testPt);

    expect(projected.x).toBeCloseTo(42, 4);
    expect(projected.y).toBeCloseTo(88, 4);
  });

  it('correctly maps 4 court corners to camera image pixels and projects back', () => {
    const courtCorners = STANDARD_COURT_CORNERS;
    const cameraPixels: Point2D[] = [
      { x: 350, y: 120 }, // TL
      { x: 930, y: 120 }, // TR
      { x: 1150, y: 650 }, // BR
      { x: 130, y: 650 }, // BL
    ];

    const calibration = computeCourtCalibration(cameraPixels);

    // Test forward projection: Court (0, 0) should map to Camera Pixel (350, 120)
    const projectedTL = projectPoint(calibration.matrix, courtCorners[0]);
    expect(projectedTL.x).toBeCloseTo(cameraPixels[0].x, 2);
    expect(projectedTL.y).toBeCloseTo(cameraPixels[0].y, 2);

    // Test court center (Net center at x=3.05, y=6.70)
    const netCenterCourt: Point2D = { x: BWF_COURT.widthDoubles / 2, y: BWF_COURT.netY };
    const netCenterPx = projectPoint(calibration.matrix, netCenterCourt);

    // Invert back: Camera pixel should project back to exact net center court coordinates
    const courtBack = projectPoint(calibration.inverse, netCenterPx);
    expect(courtBack.x).toBeCloseTo(netCenterCourt.x, 3);
    expect(courtBack.y).toBeCloseTo(netCenterCourt.y, 3);
  });

  it('correctly identifies points in-bounds vs out-of-bounds on the court', () => {
    expect(isPointInCourt({ x: 3.0, y: 6.7 })).toBe(true); // Center of court
    expect(isPointInCourt({ x: 0.1, y: 0.1 })).toBe(true); // Inside corner
    expect(isPointInCourt({ x: -1.0, y: 5.0 })).toBe(false); // Far left outside
    expect(isPointInCourt({ x: 3.0, y: 15.0 })).toBe(false); // Long past baseline
  });

  it('throws an error for degenerate/collinear points', () => {
    const collinearPts: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    const dst: Point2D[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    expect(() => computeHomography(collinearPts, dst)).toThrow();
  });
});
