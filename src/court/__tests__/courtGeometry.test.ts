import { describe, it, expect } from 'vitest';
import { BWF_COURT, getStandardCourtLines, STANDARD_COURT_CORNERS } from '../courtGeometry';

describe('BWF Badminton Court Geometry', () => {
  it('strictly adheres to official BWF dimensional rules', () => {
    expect(BWF_COURT.length).toBe(13.40);
    expect(BWF_COURT.widthDoubles).toBe(6.10);
    expect(BWF_COURT.widthSingles).toBe(5.18);
    expect(BWF_COURT.singlesSideMargin).toBeCloseTo(0.46, 2);
    expect(BWF_COURT.shortServiceDistance).toBe(1.98);
    expect(BWF_COURT.doublesLongServiceDistance).toBe(0.76);
    expect(BWF_COURT.netY).toBe(6.70);
  });

  it('generates all required court wireframe lines including net and service lines', () => {
    const lines = getStandardCourtLines();
    expect(lines.length).toBeGreaterThanOrEqual(10);

    const netLine = lines.find((l) => l.isNet);
    expect(netLine).toBeDefined();
    expect(netLine?.from.y).toBe(6.70);
    expect(netLine?.to.y).toBe(6.70);

    const centerLines = lines.filter((l) => l.label?.includes('Center Line'));
    expect(centerLines.length).toBe(2);
  });

  it('provides the 4 standard court corners in clockwise order from TL', () => {
    expect(STANDARD_COURT_CORNERS.length).toBe(4);
    expect(STANDARD_COURT_CORNERS[0]).toEqual({ x: 0, y: 0 });
    expect(STANDARD_COURT_CORNERS[1]).toEqual({ x: 6.10, y: 0 });
    expect(STANDARD_COURT_CORNERS[2]).toEqual({ x: 6.10, y: 13.40 });
    expect(STANDARD_COURT_CORNERS[3]).toEqual({ x: 0, y: 13.40 });
  });
});
