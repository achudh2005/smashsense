export class AdaptiveFrameSkipper {
  private isProcessing = false;
  private lastInferenceStartTime = 0;
  public readonly targetFps: number;
  private minIntervalMs: number;
  private skippedFrames = 0;
  private processedFrames = 0;

  constructor(targetFps = 25) {
    this.targetFps = targetFps;
    this.minIntervalMs = 1000 / targetFps;
  }

  public shouldProcessNextFrame(now: number = performance.now()): boolean {
    if (this.isProcessing) {
      this.skippedFrames++;
      return false;
    }

    const elapsedSinceLast = now - this.lastInferenceStartTime;
    if (elapsedSinceLast < this.minIntervalMs) {
      this.skippedFrames++;
      return false;
    }

    return true;
  }

  public markFrameDispatched(now: number = performance.now()): void {
    this.isProcessing = true;
    this.lastInferenceStartTime = now;
  }

  public markFrameCompleted(processingDurationMs: number): void {
    this.isProcessing = false;
    this.processedFrames++;

    // Dynamically adjust interval: if processing took 45ms, increase interval slightly to avoid congestion
    if (processingDurationMs > this.minIntervalMs * 1.2) {
      this.minIntervalMs = Math.min(60, processingDurationMs * 1.05);
    } else if (processingDurationMs < this.minIntervalMs * 0.7) {
      this.minIntervalMs = Math.max(1000 / 35, processingDurationMs * 1.1);
    }
  }

  public getStats() {
    return {
      skippedFrames: this.skippedFrames,
      processedFrames: this.processedFrames,
      effectiveTargetFps: Math.round(1000 / this.minIntervalMs),
    };
  }
}
