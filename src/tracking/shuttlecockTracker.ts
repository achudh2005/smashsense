import { KalmanFilter2D } from './kalman';
import { Point2D } from '../court/courtGeometry';

export interface ShuttlePoint {
  pixel: Point2D;
  court?: Point2D;
  timestamp: number;
  confidence: number;
  speedKmh?: number;
}

export interface ShuttlecockTrack {
  currentPixel: Point2D;
  currentCourt?: Point2D;
  confidence: number;
  trail: ShuttlePoint[];
  speedKmh: number;
  isSmash: boolean; // speed > 150 km/h
  estimatedLandingPoint?: Point2D;
}

export class ShuttlecockTracker {
  private kalmanPixel = new KalmanFilter2D({ qPos: 0.5, qVel: 5.0, rPos: 3.0 });
  private kalmanCourt = new KalmanFilter2D({ qPos: 0.2, qVel: 4.0, rPos: 0.8 });
  private trail: ShuttlePoint[] = [];
  private maxTrailLength = 25;
  private lastUpdateTimestamp = 0;
  private currentSpeedKmh = 0;
  private missedFrames = 0;
  private maxMissedFrames = 10;

  public update(
    detectedPixel: Point2D | null,
    detectedCourt: Point2D | null,
    confidence: number = 0,
    timestamp: number = performance.now()
  ): ShuttlecockTrack | null {
    const dt = this.lastUpdateTimestamp > 0
      ? Math.max(0.005, Math.min(0.1, (timestamp - this.lastUpdateTimestamp) / 1000))
      : 1 / 30;
    this.lastUpdateTimestamp = timestamp;

    if (detectedPixel && confidence > 0.3) {
      // Outlier check: If we have an existing position, check distance
      if (this.kalmanPixel.isInitialized()) {
        const [prevX, prevY] = this.kalmanPixel.getPosition();
        const distPx = Math.hypot(detectedPixel.x - prevX, detectedPixel.y - prevY);
        // If it teleports by more than 300px in 30ms without high confidence, reject outlier
        if (distPx > 350 && confidence < 0.75) {
          this.missedFrames++;
          return this.getTrack();
        }
      }

      this.kalmanPixel.update(detectedPixel.x, detectedPixel.y);
      if (detectedCourt) {
        this.kalmanCourt.update(detectedCourt.x, detectedCourt.y);
      }
      this.missedFrames = 0;

      // Speed calculation from court metric velocity if available
      if (this.kalmanCourt.isInitialized()) {
        const [vx, vy] = this.kalmanCourt.getVelocity();
        const speedMps = Math.hypot(vx, vy);
        const speedKmh = speedMps * 3.6;
        this.currentSpeedKmh = Math.min(450, Math.max(0, speedKmh));
      }

      const smoothedPixel: Point2D = {
        x: this.kalmanPixel.getPosition()[0],
        y: this.kalmanPixel.getPosition()[1]
      };
      const smoothedCourt: Point2D | undefined = detectedCourt
        ? {
            x: this.kalmanCourt.getPosition()[0],
            y: this.kalmanCourt.getPosition()[1]
          }
        : undefined;

      this.trail.push({
        pixel: smoothedPixel,
        court: smoothedCourt,
        timestamp,
        confidence,
        speedKmh: this.currentSpeedKmh
      });

      if (this.trail.length > this.maxTrailLength) {
        this.trail.shift();
      }
    } else {
      this.missedFrames++;
      if (this.kalmanPixel.isInitialized() && this.missedFrames < this.maxMissedFrames) {
        // Coast forward with Kalman prediction
        this.kalmanPixel.predict(dt);
        this.kalmanCourt.predict(dt);
      } else if (this.missedFrames >= this.maxMissedFrames) {
        // Trail fades out
        if (this.trail.length > 0) {
          this.trail.shift();
        }
        if (this.trail.length === 0) {
          return null;
        }
      }
    }

    return this.getTrack();
  }

  public getTrack(): ShuttlecockTrack | null {
    if (this.trail.length === 0) return null;

    const latest = this.trail[this.trail.length - 1];
    return {
      currentPixel: latest.pixel,
      currentCourt: latest.court,
      confidence: latest.confidence,
      trail: [...this.trail],
      speedKmh: Math.round(this.currentSpeedKmh),
      isSmash: this.currentSpeedKmh > 150
    };
  }

  public reset(): void {
    this.trail = [];
    this.missedFrames = 0;
    this.currentSpeedKmh = 0;
    this.lastUpdateTimestamp = 0;
  }
}

/**
 * Draws the glowing fading comet trail of the shuttlecock onto a canvas.
 */
export function drawShuttlecockTrail(
  ctx: CanvasRenderingContext2D,
  track: ShuttlecockTrack
): void {
  const { trail, isSmash } = track;
  if (trail.length < 2) return;

  ctx.save();

  // Draw fading segmented comet line
  for (let i = 1; i < trail.length; i++) {
    const p1 = trail[i - 1].pixel;
    const p2 = trail[i].pixel;
    const progress = i / trail.length; // 0 (tail) -> 1 (head)
    const alpha = progress * 0.9;
    const lineWidth = 2 + progress * (isSmash ? 5 : 3.5);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);

    if (isSmash) {
      // Fiery smash trail (Yellow to Red-Orange)
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
    } else {
      // Electric neon yellow/cyan trail
      ctx.strokeStyle = `rgba(250, 204, 21, ${alpha})`;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 6;
    }

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Draw Glowing Head
  const head = trail[trail.length - 1].pixel;
  ctx.beginPath();
  ctx.arc(head.x, head.y, isSmash ? 7 : 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = isSmash ? '#ef4444' : '#eab308';
  ctx.shadowBlur = 14;
  ctx.fill();

  // Speed Badge if flying fast
  if (track.speedKmh > 40) {
    ctx.shadowBlur = 0;
    ctx.font = 'bold 11px ui-monospace, monospace';
    const text = `${track.speedKmh} km/h`;
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(head.x + 8, head.y - 10, textWidth + 10, 18, 4);
    ctx.fill();
    ctx.fillStyle = isSmash ? '#f87171' : '#fef08a';
    ctx.fillText(text, head.x + 13, head.y + 3);
  }

  ctx.restore();
}
