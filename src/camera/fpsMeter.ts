export class PerformanceMeter {
  private renderFrames = 0;
  private lastRenderTime = performance.now();
  private currentRenderFps = 0;

  private inferenceFrames = 0;
  private lastInferenceTime = performance.now();
  private currentInferenceFps = 0;

  private latencies: number[] = [];
  private currentAvgLatencyMs = 0;

  /**
   * Called on each requestAnimationFrame
   */
  public tickRender(now: number = performance.now()): number {
    this.renderFrames++;
    const elapsed = now - this.lastRenderTime;

    if (elapsed >= 1000) {
      this.currentRenderFps = Math.round((this.renderFrames * 1000) / elapsed);
      this.renderFrames = 0;
      this.lastRenderTime = now;
    }

    return this.currentRenderFps;
  }

  /**
   * Called when a worker inference frame finishes
   */
  public recordInference(latencyMs: number, now: number = performance.now()): {
    inferenceFps: number;
    latencyMs: number;
  } {
    this.inferenceFrames++;
    const elapsed = now - this.lastInferenceTime;

    if (elapsed >= 1000) {
      this.currentInferenceFps = Math.round((this.inferenceFrames * 1000) / elapsed);
      this.inferenceFrames = 0;
      this.lastInferenceTime = now;
    }

    this.latencies.push(latencyMs);
    if (this.latencies.length > 20) {
      this.latencies.shift();
    }

    const sum = this.latencies.reduce((a, b) => a + b, 0);
    this.currentAvgLatencyMs = Math.round(sum / this.latencies.length);

    return {
      inferenceFps: this.currentInferenceFps,
      latencyMs: this.currentAvgLatencyMs,
    };
  }

  public getStats() {
    return {
      renderFps: this.currentRenderFps,
      inferenceFps: this.currentInferenceFps,
      latencyMs: this.currentAvgLatencyMs,
    };
  }
}
