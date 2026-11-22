import { describe, it, expect } from 'vitest';
import {
  calculateLineMarginMm,
  generateReplayTrajectory,
  createChalkParticles,
  constructHawkEyeReplayData,
} from '../virtualHawkEyeReplay';
import { LineCallEvaluation } from '../../court/lineCallEngine';

describe('Virtual 3D Hawk-Eye Line Call Engine', () => {
  it('correctly calculates millimeter margin for an IN landing near the singles sideline', () => {
    // Singles sideline is at x = 2.59m. Landing at 2.58m is 10mm inside.
    const landing = { x: 2.58, y: 3.5 };
    const margin = calculateLineMarginMm(landing, false);

    expect(margin.isInside).toBe(true);
    expect(margin.marginMm).toBeLessThanOrEqual(15);
    expect(margin.closestLineName).toBe('Singles Sideline');
  });

  it('correctly calculates millimeter margin for an OUT landing beyond the back baseline', () => {
    // Baseline is at y = 6.70m. Landing at 6.74m is 40mm long.
    const landing = { x: 1.0, y: 6.74 };
    const margin = calculateLineMarginMm(landing, false);

    expect(margin.isInside).toBe(false);
    expect(margin.marginMm).toBeGreaterThanOrEqual(35);
    expect(margin.closestLineName).toBe('Back Baseline');
  });

  it('evaluates doubles long service line for doubles serve', () => {
    // Doubles service line is at 5.94m. Landing at 6.00m is OUT on doubles serve
    const landing = { x: 1.5, y: 6.00 };
    const margin = calculateLineMarginMm(landing, true, true);

    expect(margin.isInside).toBe(false);
    expect(margin.closestLineName).toBe('Doubles Long Service Line');
  });

  it('generates a smooth 3D parabolic descent trajectory', () => {
    const landing = { x: 2.5, y: 5.0 };
    const traj = generateReplayTrajectory(landing, 45, 20);

    expect(traj.length).toBe(21);
    // Initial apex height
    expect(traj[0].z).toBeGreaterThan(2.0);
    // Contact point at floor
    expect(traj[traj.length - 1].z).toBe(0);
    expect(traj[traj.length - 1].x).toBeCloseTo(landing.x, 2);
    expect(traj[traj.length - 1].y).toBeCloseTo(landing.y, 2);
  });

  it('creates expanding chalk burst particles with randomized velocities', () => {
    const particles = createChalkParticles(200, 300, 24);

    expect(particles.length).toBe(24);
    particles.forEach((p) => {
      expect(p.x).toBe(200);
      expect(p.y).toBe(300);
      expect(p.life).toBeGreaterThan(10);
      expect(p.alpha).toBeGreaterThan(0.5);
    });
  });

  it('constructs complete Hawk-Eye replay telemetry from a line call', () => {
    const mockCall: LineCallEvaluation = {
      call: 'IN',
      confidencePercent: 94,
      isUncertain: false,
      distanceToLineCm: 1.2,
      closestLineName: 'Singles Sideline',
      landingCourt: { x: 2.57, y: 4.2 },
      landingZone: 'Mid-Right',
    };

    const replay = constructHawkEyeReplayData(mockCall, 240, false);

    expect(replay.call).toBe('IN');
    expect(replay.shuttleSpeedKmh).toBe(240);
    expect(replay.confidence).toBe(0.94);
    expect(replay.trajectoryPoints.length).toBeGreaterThan(10);
  });
});
