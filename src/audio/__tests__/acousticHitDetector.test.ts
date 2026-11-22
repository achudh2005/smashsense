import { describe, it, expect } from 'vitest';
import {
  analyzeFrequencySpectrum,
  evaluateAcousticVisionFusion,
  AcousticEvent,
} from '../acousticHitDetector';

describe('Acoustic Hit & Net Strike Detection Engine', () => {
  const sampleRate = 44100;
  const fftSize = 1024;
  const binResolution = sampleRate / fftSize; // ~43.066 Hz

  it('detects a high-frequency shuttlecock impact pop in the 3.5k - 7.0k Hz range', () => {
    const data = new Uint8Array(512);
    // Background noise baseline around 15
    data.fill(15);

    // Shuttle hit peak at ~4500 Hz: bin index ~ 4500 / 43.066 = 104
    const shuttleBin = Math.round(4500 / binResolution);
    data[shuttleBin] = 190;
    data[shuttleBin + 1] = 160;

    const result = analyzeFrequencySpectrum(data, sampleRate, fftSize, 0.5);

    expect(result.detected).toBe(true);
    expect(result.type).toBe('SHUTTLE_HIT');
    expect(result.peakFrequencyHz).toBeGreaterThanOrEqual(3500);
    expect(result.peakFrequencyHz).toBeLessThanOrEqual(7000);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('detects resonant net tape vibration in the 800 - 2500 Hz range', () => {
    const data = new Uint8Array(512);
    data.fill(12);

    // Net tape vibration at ~1500 Hz: bin index ~ 1500 / 43.066 = 35
    const netBin = Math.round(1500 / binResolution);
    data[netBin] = 180;
    data[netBin + 1] = 170;

    const result = analyzeFrequencySpectrum(data, sampleRate, fftSize, 0.5);

    expect(result.detected).toBe(true);
    expect(result.type).toBe('NET_STRIKE');
    expect(result.peakFrequencyHz).toBeGreaterThanOrEqual(800);
    expect(result.peakFrequencyHz).toBeLessThanOrEqual(2500);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('rejects uniform background noise without transient spikes', () => {
    const data = new Uint8Array(512);
    data.fill(30);

    const result = analyzeFrequencySpectrum(data, sampleRate, fftSize, 0.5);

    expect(result.detected).toBe(false);
    expect(result.energy).toBe(0);
  });

  it('corroborates vision candidate landing within +-120ms with confidence boost', () => {
    const landingTime = 10000;
    const events: AcousticEvent[] = [
      {
        id: '1',
        type: 'SHUTTLE_HIT',
        timestamp: 10050, // 50ms delta
        frequencyHz: 4800,
        energy: 0.8,
        confidence: 0.85,
      },
    ];

    const fusion = evaluateAcousticVisionFusion(landingTime, events, false, 120);

    expect(fusion.isCorroborated).toBe(true);
    expect(fusion.confidenceBoost).toBeGreaterThan(0.1);
    expect(fusion.isNetCord).toBe(false);
    expect(fusion.timeDeltaMs).toBe(50);
  });

  it('flags net-cord when net strike sound occurs with shuttle near the net tape', () => {
    const landingTime = 20000;
    const events: AcousticEvent[] = [
      {
        id: '2',
        type: 'NET_STRIKE',
        timestamp: 19960, // 40ms delta
        frequencyHz: 1400,
        energy: 0.75,
        confidence: 0.8,
      },
    ];

    const fusion = evaluateAcousticVisionFusion(landingTime, events, true, 120);

    expect(fusion.isCorroborated).toBe(true);
    expect(fusion.isNetCord).toBe(true);
    expect(fusion.timeDeltaMs).toBe(40);
  });

  it('ignores acoustic events outside the 120ms fusion window', () => {
    const landingTime = 30000;
    const events: AcousticEvent[] = [
      {
        id: '3',
        type: 'SHUTTLE_HIT',
        timestamp: 29800, // 200ms delta (outside 120ms)
        frequencyHz: 5000,
        energy: 0.8,
        confidence: 0.9,
      },
    ];

    const fusion = evaluateAcousticVisionFusion(landingTime, events, false, 120);

    expect(fusion.isCorroborated).toBe(false);
    expect(fusion.confidenceBoost).toBe(0);
  });
});
