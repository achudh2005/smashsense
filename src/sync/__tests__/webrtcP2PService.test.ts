import { describe, it, expect } from 'vitest';
import {
  fuseMultiAngleEvaluations,
  SecondaryAngleCall,
  WebRTCP2PService,
} from '../webrtcP2PService';
import { LineCallEvaluation } from '../../court/lineCallEngine';

describe('Dual-Phone Wireless Hawk-Eye & Multi-Angle Fusion', () => {
  const mockPrimaryIn: LineCallEvaluation = {
    call: 'IN',
    confidencePercent: 92,
    isUncertain: false,
    distanceToLineCm: 2.4,
    closestLineName: 'Right Singles Sideline',
    landingCourt: { x: 2.56, y: 4.0 },
    landingZone: 'Mid-Right',
  };

  const mockPrimaryUncertain: LineCallEvaluation = {
    call: 'IN',
    confidencePercent: 62, // Contentious call
    isUncertain: true,
    distanceToLineCm: 0.8,
    closestLineName: 'Right Singles Sideline',
    landingCourt: { x: 2.59, y: 4.0 },
    landingZone: 'Mid-Right',
  };

  it('falls back to single-angle evaluation when no secondary camera is present', () => {
    const fusion = fuseMultiAngleEvaluations(mockPrimaryIn, []);

    expect(fusion.angleEvaluationsCount).toBe(1);
    expect(fusion.finalCall).toBe('IN');
    expect(fusion.confidencePercent).toBe(92);
    expect(fusion.resolvedBy).toBe('PRIMARY');
  });

  it('boosts confidence into consensus when both baseline and sideline cameras agree', () => {
    const secondaryCall: SecondaryAngleCall = {
      id: 'sec_1',
      timestamp: Date.now(),
      call: 'IN',
      marginMm: 12,
      confidence: 0.94,
      cameraAngle: 'sideline',
      deviceLabel: 'Device B',
    };

    const fusion = fuseMultiAngleEvaluations(mockPrimaryIn, [secondaryCall]);

    expect(fusion.angleEvaluationsCount).toBe(2);
    expect(fusion.finalCall).toBe('IN');
    expect(fusion.isConsensus).toBe(true);
    expect(fusion.confidencePercent).toBeGreaterThanOrEqual(95);
    expect(fusion.resolvedBy).toBe('CONSENSUS');
  });

  it('resolves call via secondary sideline camera when primary baseline is uncertain and sideline is confident', () => {
    // Primary baseline is uncertain (62% IN), but sideline camera has clear 90° view showing OUT by 14mm with 91% confidence
    const secondaryCall: SecondaryAngleCall = {
      id: 'sec_2',
      timestamp: Date.now(),
      call: 'OUT',
      marginMm: 14,
      confidence: 0.91,
      cameraAngle: 'sideline',
      deviceLabel: 'Device B',
    };

    const fusion = fuseMultiAngleEvaluations(mockPrimaryUncertain, [secondaryCall]);

    expect(fusion.angleEvaluationsCount).toBe(2);
    expect(fusion.finalCall).toBe('OUT'); // Adopted secondary sideline call
    expect(fusion.confidencePercent).toBe(91);
    expect(fusion.resolvedBy).toBe('SECONDARY');
    expect(fusion.isConsensus).toBe(false);
  });

  it('manages P2P service lifecycle and secondary calls buffer', () => {
    const service = new WebRTCP2PService();
    expect(service.getState()).toBe('DISCONNECTED');
    expect(service.getRecentSecondaryCalls()).toEqual([]);

    service.close();
    expect(service.getState()).toBe('DISCONNECTED');
  });
});
