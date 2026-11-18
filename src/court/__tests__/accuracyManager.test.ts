import { describe, it, expect } from 'vitest';
import { AccuracyTuningManager } from '../accuracyManager';
import { LineCallEvaluation } from '../lineCallEngine';

describe('AccuracyTuningManager', () => {
  it('correctly flags calls within the uncertainty threshold', () => {
    const manager = new AccuracyTuningManager();

    const closeCall: LineCallEvaluation = {
      call: 'IN',
      landingCourt: { x: 0.48, y: 3.5 },
      distanceToLineCm: 3.2, // <= 5cm
      confidencePercent: 88,
      isUncertain: true,
      closestLineName: 'singles_sideline_left',
      landingZone: 'Front-Left',
    };

    expect(manager.shouldFlagCall(closeCall)).toBe(true);

    const safeCall: LineCallEvaluation = {
      call: 'IN',
      landingCourt: { x: 3.0, y: 3.5 },
      distanceToLineCm: 85.0, // well inside
      confidencePercent: 98,
      isUncertain: false,
      closestLineName: 'center_line',
      landingZone: 'Front-Center',
    };

    expect(manager.shouldFlagCall(safeCall)).toBe(false);
  });

  it('updates tuning settings and stores them', () => {
    const manager = new AccuracyTuningManager();
    manager.updateSettings({ uncertaintyThresholdCm: 6.5, minConfidenceThreshold: 0.80 });

    const current = manager.getSettings();
    expect(current.uncertaintyThresholdCm).toBe(6.5);
    expect(current.minConfidenceThreshold).toBe(0.80);
  });
});
