import { describe, it, expect, beforeEach } from 'vitest';
import { AutoCourtDetector } from '../autoCourtDetector';

describe('AutoCourtDetector Automated Court Calibration', () => {
  let detector: AutoCourtDetector;

  beforeEach(() => {
    detector = new AutoCourtDetector();
  });

  it('returns locked calibrated geometry for simulation mode', () => {
    const res = detector.detect(null, 1280, 720, true);

    expect(res.isLocked).toBe(true);
    expect(res.status).toBe('LOCKED');
    expect(res.confidence).toBeGreaterThan(0.9);
    expect(res.corners.length).toBe(4);

    // Verify convex perspective trapezoid: TL, TR, BR, BL
    const [tl, tr, br, bl] = res.corners;
    expect(tl.y).toBeLessThan(bl.y);
    expect(tr.y).toBeLessThan(br.y);
    expect(tr.x - tl.x).toBeLessThan(br.x - bl.x); // Perspective: top narrower than bottom
  });

  it('detects court lines and returns high confidence on synthetic court image', () => {
    // Generate synthetic 640x360 image with green floor and bright white court lines
    const width = 640;
    const height = 360;
    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with green court floor
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 34;      // R
      data[i + 1] = 139;  // G (court green)
      data[i + 2] = 34;   // B
      data[i + 3] = 255;  // A
    }

    // Draw white horizontal baseline near (y = 310)
    const drawHLine = (y: number) => {
      for (let x = 60; x < width - 60; x++) {
        for (let dy = -2; dy <= 2; dy++) {
          const idx = ((y + dy) * width + x) * 4;
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
        }
      }
    };

    drawHLine(310); // Near baseline
    drawHLine(80);  // Far baseline

    const fakeImageData = {
      width,
      height,
      data,
    } as unknown as ImageData;

    // Run multiple frames to establish temporal consensus
    let finalResult = detector.detect(fakeImageData, width, height, false);
    for (let f = 0; f < 5; f++) {
      finalResult = detector.detect(fakeImageData, width, height, false);
    }

    expect(finalResult.corners.length).toBe(4);
    expect(finalResult.confidence).toBeGreaterThan(0.5);
    expect(finalResult.corners[0].y).toBeLessThan(finalResult.corners[3].y);
  });

  it('resets state properly when requested', () => {
    detector.detect(null, 1280, 720, true);
    detector.reset();
    const res = detector.detect(null, 1280, 720, false);
    expect(res.status).toBe('LOCKED'); // simulation fallback when imageData is null
  });
});
