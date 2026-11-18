import { describe, it, expect } from 'vitest';
import { evaluateLineCall, getTacticalLandingZone, calculateFlightMetrics } from '../lineCallEngine';

describe('Line Call Engine & Shuttle Metrics', () => {
  it('correctly assesses clearly IN landings in singles and doubles', () => {
    // Center court at (3.05, 6.70)
    const centerCall = evaluateLineCall({ x: 3.05, y: 6.70 }, 'singles');
    expect(centerCall.call).toBe('IN');
    expect(centerCall.confidencePercent).toBe(99);
    expect(centerCall.isUncertain).toBe(false);

    // Doubles tramline: x = 0.20m (inside doubles, but OUT in singles!)
    const tramlineDoubles = evaluateLineCall({ x: 0.20, y: 7.00 }, 'doubles');
    expect(tramlineDoubles.call).toBe('IN');

    const tramlineSingles = evaluateLineCall({ x: 0.20, y: 7.00 }, 'singles');
    expect(tramlineSingles.call).toBe('OUT');
  });

  it('correctly assesses clearly OUT landings and calculates distance to line', () => {
    // 25cm past Team B baseline (y = 13.65)
    const longCall = evaluateLineCall({ x: 3.00, y: 13.65 }, 'singles');
    expect(longCall.call).toBe('OUT');
    expect(longCall.distanceToLineCm).toBeCloseTo(25, 0);
    expect(longCall.confidencePercent).toBe(99);
    expect(longCall.isUncertain).toBe(false);
  });

  it('flags close calls within 5cm of the line as uncertain', () => {
    // In singles, left sideline is at x = 0.46m.
    // Landing at x = 0.48m is 2cm inside the line!
    const closeInCall = evaluateLineCall({ x: 0.48, y: 7.00 }, 'singles');
    expect(closeInCall.call).toBe('IN');
    expect(closeInCall.distanceToLineCm).toBeLessThanOrEqual(3);
    expect(closeInCall.isUncertain).toBe(true);
    expect(closeInCall.confidencePercent).toBeLessThan(85);

    // Landing at x = 0.44m is 2cm outside the line!
    const closeOutCall = evaluateLineCall({ x: 0.44, y: 7.00 }, 'singles');
    expect(closeOutCall.call).toBe('OUT');
    expect(closeOutCall.distanceToLineCm).toBeLessThanOrEqual(3);
    expect(closeOutCall.isUncertain).toBe(true);
  });

  it('classifies 9 tactical landing zones correctly', () => {
    expect(getTacticalLandingZone({ x: 3.05, y: 6.70 })).toBe('Front-Center');
    expect(getTacticalLandingZone({ x: 0.5, y: 1.0 })).toBe('Back-Left');
    expect(getTacticalLandingZone({ x: 5.5, y: 12.5 })).toBe('Back-Right');
    expect(getTacticalLandingZone({ x: 1.0, y: 4.5 })).toBe('Mid-Left');
  });

  it('calculates shot direction and net clearance metrics', () => {
    const origin = { x: 1.0, y: 1.5 }; // Back-left
    const crossLanding = { x: 5.0, y: 11.0 }; // Cross-court to right
    const metrics = calculateFlightMetrics(origin, crossLanding, 240, 1.70);

    expect(metrics.speedKmh).toBe(240);
    expect(metrics.shotDirection).toBe('cross');
    expect(metrics.heightAtNetCrossingM).toBeCloseTo(0.176, 2); // 1.70 - 1.524m net
  });
});
