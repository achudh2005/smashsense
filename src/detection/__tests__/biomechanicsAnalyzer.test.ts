import { describe, it, expect } from 'vitest';
import {
  calculateJointAngleDeg,
  analyzeSmashKinematics,
  PoseFrameRollingBuffer,
  PoseFrame,
} from '../biomechanicsAnalyzer';
import { Keypoint } from '../../tracking/byteTrack';

describe('Smash Biomechanics Kinematics Engine', () => {
  it('accurately calculates 3-point joint angles in degrees', () => {
    // 180 degree straight line: (-1, 0) -> (0, 0) -> (1, 0)
    const angle180 = calculateJointAngleDeg({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(angle180).toBe(180);

    // 90 degree perpendicular: (0, 1) -> (0, 0) -> (1, 0)
    const angle90 = calculateJointAngleDeg({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(angle90).toBe(90);

    // 45 degree angle
    const angle45 = calculateJointAngleDeg({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(angle45).toBe(45);
  });

  it('analyzes jump smash kinematics and identifies peak contact frame and metrics', () => {
    // Generate synthetic 10 frames where frame 7 has the highest wrist (lowest y)
    const frames: PoseFrame[] = [];
    for (let i = 0; i < 10; i++) {
      const kps: Keypoint[] = Array(17).fill(null).map((_, idx) => ({ x: 0.5, y: 0.5, score: 0.9, name: `k_${idx}` }));
      // Shoulder (6), Elbow (8), Wrist (10)
      kps[6] = { x: 0.5, y: 0.35, score: 0.95, name: 'r_shoulder' };
      kps[8] = { x: 0.52, y: 0.22, score: 0.95, name: 'r_elbow' };
      // Wrist is highest at i = 7 (y = 0.08)
      const wristY = i === 7 ? 0.08 : 0.25 - (i * 0.01);
      kps[10] = { x: 0.54, y: wristY, score: 0.95, name: 'r_wrist' };

      // Left and Right Ankles (15, 16)
      // Jumps at i = 7 (ankles lift to y = 0.65 vs ground at y = 0.85)
      const ankleY = i === 7 ? 0.65 : 0.85;
      kps[15] = { x: 0.48, y: ankleY, score: 0.9, name: 'l_ankle' };
      kps[16] = { x: 0.52, y: ankleY, score: 0.9, name: 'r_ankle' };

      frames.push({
        timestamp: 1000 + i * 33,
        keypoints: kps,
        playerRole: 'A1',
      });
    }

    const report = analyzeSmashKinematics(frames, 'jump_smash', 1.85);

    expect(report.contactFrameIndex).toBe(7);
    expect(report.jumpClearanceCm).toBeGreaterThanOrEqual(30);
    expect(report.armExtensionAngleDeg).toBeGreaterThanOrEqual(150);
    expect(report.biomechanicsScore).toBeGreaterThan(60);
    expect(report.coachingTakeaways.length).toBeGreaterThan(1);
  });

  it('maintains a rolling buffer and drops oldest frames when exceeding max capacity', () => {
    const buffer = new PoseFrameRollingBuffer(10);
    const dummyKp: Keypoint[] = [{ x: 0, y: 0, score: 1, name: 'dummy' }];

    for (let i = 0; i < 15; i++) {
      buffer.pushFrame(dummyKp, 'A1');
    }

    const snapshot = buffer.getSnapshot();
    expect(snapshot.length).toBe(10);

    buffer.clear();
    expect(buffer.getSnapshot().length).toBe(0);
  });
});
