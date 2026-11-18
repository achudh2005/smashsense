import { describe, it, expect } from 'vitest';
import { PRESET_DRILLS, evaluateTargetShot } from '../drills';
import { TrainingSessionManager } from '../trainingManager';

describe('TrainingDrills', () => {
  it('has valid preset drills with target zones', () => {
    expect(PRESET_DRILLS.length).toBeGreaterThanOrEqual(4);
    const shortServe = PRESET_DRILLS.find((d) => d.id === 'short-serve-t');
    expect(shortServe).toBeDefined();
    expect(shortServe?.targetZone).toBeDefined();
    expect(shortServe?.targetZone?.idealPoint.x).toBe(3.05);
  });

  it('correctly evaluates shots inside vs outside target zone', () => {
    const drill = PRESET_DRILLS[0];
    const targetZone = drill.targetZone!;

    // Hit close to ideal point
    const exactHit = evaluateTargetShot({ x: 3.05, y: 7.0 }, targetZone, 65);
    expect(exactHit.isHit).toBe(true);
    expect(exactHit.distanceMeters).toBe(0);
    expect(exactHit.score).toBe(100);

    // Landing far off target
    const miss = evaluateTargetShot({ x: 1.0, y: 11.0 }, targetZone, 60);
    expect(miss.isHit).toBe(false);
    expect(miss.distanceMeters).toBeGreaterThan(3);
    expect(miss.score).toBe(0);
  });

  it('records drill attempts and increments progress in TrainingSessionManager', () => {
    const mgr = new TrainingSessionManager();
    const drill = PRESET_DRILLS[0];
    mgr.startDrill(drill);

    expect(mgr.getActiveDrill()?.id).toBe(drill.id);

    // Perform hit
    const attempt1 = mgr.recordShuttleLanding({ x: 3.05, y: 7.0 }, 70);
    expect(attempt1?.isHit).toBe(true);

    // Perform miss
    const attempt2 = mgr.recordShuttleLanding({ x: 0.2, y: 12.0 }, 50);
    expect(attempt2?.isHit).toBe(false);

    const stats = mgr.getStats();
    expect(stats.totalReps).toBe(2);
    expect(stats.successfulHits).toBe(1);
    expect(stats.accuracyPercent).toBe(50);
  });
});
