import { Point2D } from '../court/courtGeometry';

export interface ShuttlecockCandidate {
  x: number;
  y: number;
  area: number;
  brightness: number;
  score: number;
}

export class FastShuttlecockDetector {
  private prevGrayBuffer: Uint8ClampedArray | null = null;
  private width = 0;
  private height = 0;

  /**
   * Detects small high-speed white shuttlecock blob using 2-frame temporal differencing + luminance thresholding
   */
  public detect(
    imageData: ImageData,
    courtPolygon?: Point2D[],
    expectedNearbyPoint?: Point2D | null
  ): ShuttlecockCandidate | null {
    const { width, height, data } = imageData;

    if (this.width !== width || this.height !== height || !this.prevGrayBuffer) {
      this.width = width;
      this.height = height;
      this.prevGrayBuffer = new Uint8ClampedArray(width * height);
      this.extractGrayscale(data, this.prevGrayBuffer);
      return null;
    }

    const currentGray = new Uint8ClampedArray(width * height);
    this.extractGrayscale(data, currentGray);

    const candidates: ShuttlecockCandidate[] = [];
    const step = 2; // sample every 2 pixels for extreme speed (20+ FPS target)

    // Court bounding box to restrict search
    let minX = 0;
    let maxX = width;
    let minY = 0;
    let maxY = height;

    if (courtPolygon && courtPolygon.length >= 4) {
      minX = Math.max(0, Math.min(...courtPolygon.map(p => p.x)) - 30);
      maxX = Math.min(width, Math.max(...courtPolygon.map(p => p.x)) + 30);
      minY = Math.max(0, Math.min(...courtPolygon.map(p => p.y)) - 50); // shuttle flies above court
      maxY = Math.min(height, Math.max(...courtPolygon.map(p => p.y)) + 20);
    }

    for (let y = Math.floor(minY); y < maxY; y += step) {
      const rowOffset = y * width;
      for (let x = Math.floor(minX); x < maxX; x += step) {
        const idx = rowOffset + x;
        const curr = currentGray[idx];
        const prev = this.prevGrayBuffer[idx];

        // 1. Difference must be significant (object moved)
        const diff = Math.abs(curr - prev);

        // 2. Badminton shuttlecock is white/high-luminance
        if (curr > 185 && diff > 30) {
          // Check local 5x5 neighborhood around (x, y) to verify it's a small compact blob (not a large player body)
          let blobPixelCount = 0;
          let sumX = 0;
          let sumY = 0;
          let sumBright = 0;

          for (let dy = -4; dy <= 4; dy += 2) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            const nRow = ny * width;

            for (let dx = -4; dx <= 4; dx += 2) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;

              const nIdx = nRow + nx;
              if (currentGray[nIdx] > 175 && Math.abs(currentGray[nIdx] - this.prevGrayBuffer[nIdx]) > 20) {
                blobPixelCount++;
                sumX += nx;
                sumY += ny;
                sumBright += currentGray[nIdx];
              }
            }
          }

          // Small compact blob has between 3 and 25 sub-sampled points (not huge like a player arm/shirt)
          if (blobPixelCount >= 2 && blobPixelCount <= 22) {
            const cx = sumX / blobPixelCount;
            const cy = sumY / blobPixelCount;
            const avgBright = sumBright / blobPixelCount;

            let score = (avgBright / 255) * 0.6 + (diff / 255) * 0.4;

            // Bonus if consistent with expected predicted location from Kalman filter
            if (expectedNearbyPoint) {
              const dist = Math.hypot(cx - expectedNearbyPoint.x, cy - expectedNearbyPoint.y);
              if (dist < 120) {
                score += (1 - dist / 120) * 0.5;
              }
            }

            candidates.push({
              x: cx,
              y: cy,
              area: blobPixelCount,
              brightness: avgBright,
              score,
            });
          }
        }
      }
    }

    // Save current frame for next iteration
    this.prevGrayBuffer = currentGray;

    if (candidates.length === 0) return null;

    // Pick candidate with highest combined score
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  }

  private extractGrayscale(rgba: Uint8ClampedArray, gray: Uint8ClampedArray): void {
    const len = gray.length;
    let rgbaIdx = 0;
    for (let i = 0; i < len; i++) {
      const r = rgba[rgbaIdx];
      const g = rgba[rgbaIdx + 1];
      const b = rgba[rgbaIdx + 2];
      // Luminance formula
      gray[i] = (r * 77 + g * 150 + b * 29) >> 8;
      rgbaIdx += 4;
    }
  }

  public reset(): void {
    this.prevGrayBuffer = null;
  }
}
