import { describe, it, expect, beforeEach } from 'vitest';
import { MultiPlayerTracker, RawPlayerDetection } from '../byteTrack';

describe('MultiPlayerTracker ID Stability & Tracking', () => {
  let tracker: MultiPlayerTracker;

  beforeEach(() => {
    tracker = new MultiPlayerTracker({ minHitsToConfirm: 2, maxLostFrames: 5 });
  });

  it('assigns stable track ID across consecutive frames of a moving player', () => {
    // Frame 1
    const detFrame1: RawPlayerDetection[] = [
      {
        bbox: { x: 500, y: 300, width: 80, height: 160 },
        score: 0.9,
        footPosition: { x: 3.0, y: 8.0 },
      },
    ];
    const tracksF1 = tracker.update(detFrame1);
    expect(tracksF1.length).toBe(0); // Tentative on frame 1

    // Frame 2: Player lunges slightly right
    const detFrame2: RawPlayerDetection[] = [
      {
        bbox: { x: 515, y: 305, width: 80, height: 160 },
        score: 0.92,
        footPosition: { x: 3.2, y: 8.1 },
      },
    ];
    const tracksF2 = tracker.update(detFrame2);
    expect(tracksF2.length).toBe(1);
    const initialId = tracksF2[0].trackId;

    // Frame 3 to 10: Player continues moving
    let currentId = initialId;
    for (let i = 1; i <= 8; i++) {
      const stepDet: RawPlayerDetection[] = [
        {
          bbox: { x: 515 + i * 5, y: 305 + i * 2, width: 80, height: 160 },
          score: 0.88,
          footPosition: { x: 3.2 + i * 0.05, y: 8.1 },
        },
      ];
      const tracks = tracker.update(stepDet);
      expect(tracks.length).toBe(1);
      expect(tracks[0].trackId).toBe(currentId); // ID MUST REMAIN STABLE!
    }
  });

  it('tracks two distinct players simultaneously without swapping IDs', () => {
    // Initialize 2 players (A in upper court, B in lower court)
    for (let f = 0; f < 3; f++) {
      tracker.update([
        {
          bbox: { x: 400, y: 150, width: 60, height: 120 },
          score: 0.9,
          footPosition: { x: 2.0, y: 3.0 },
        },
        {
          bbox: { x: 600, y: 500, width: 90, height: 180 },
          score: 0.9,
          footPosition: { x: 4.0, y: 10.0 },
        },
      ]);
    }

    const confirmedTracks = tracker.update([
      {
        bbox: { x: 405, y: 152, width: 60, height: 120 },
        score: 0.91,
        footPosition: { x: 2.1, y: 3.1 },
      },
      {
        bbox: { x: 595, y: 498, width: 90, height: 180 },
        score: 0.91,
        footPosition: { x: 3.9, y: 9.9 },
      },
    ]);

    expect(confirmedTracks.length).toBe(2);
    const idPlayerA = confirmedTracks.find((t) => t.bbox.y < 300)?.trackId;
    const idPlayerB = confirmedTracks.find((t) => t.bbox.y > 400)?.trackId;

    expect(idPlayerA).toBeDefined();
    expect(idPlayerB).toBeDefined();
    expect(idPlayerA).not.toBe(idPlayerB);
  });

  it('preserves user assigned player role across updates', () => {
    // Setup track
    tracker.update([
      {
        bbox: { x: 400, y: 400, width: 80, height: 160 },
        score: 0.9,
      },
    ]);
    const tracks = tracker.update([
      {
        bbox: { x: 402, y: 401, width: 80, height: 160 },
        score: 0.9,
      },
    ]);

    const trackId = tracks[0].trackId;
    tracker.setPlayerRole(trackId, 'B1', 'Viktor Axelsen');

    const nextTracks = tracker.update([
      {
        bbox: { x: 405, y: 403, width: 80, height: 160 },
        score: 0.92,
      },
    ]);

    expect(nextTracks[0].assignedRole).toBe('B1');
    expect(nextTracks[0].customName).toBe('Viktor Axelsen');
    expect(nextTracks[0].team).toBe('B');
  });
});
