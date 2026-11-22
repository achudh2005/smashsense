/**
 * Acoustic Net Strike & Shuttle Hit Detection Engine
 * Uses Web Audio API FFT analysis to capture high-frequency shuttle impacts (3.5 - 7.0 kHz)
 * and net-cord tape scrapes (800 Hz - 2.5 kHz) with vision fusion.
 */

export type AcousticEventType = 'SHUTTLE_HIT' | 'NET_STRIKE';

export interface AcousticEvent {
  id: string;
  type: AcousticEventType;
  timestamp: number;
  frequencyHz: number;
  energy: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
}

export interface AcousticAnalysisResult {
  detected: boolean;
  type?: AcousticEventType;
  peakFrequencyHz: number;
  energy: number;
  confidence: number;
}

export interface FusionResult {
  isCorroborated: boolean;
  confidenceBoost: number;
  isNetCord: boolean;
  acousticEvent?: AcousticEvent;
  timeDeltaMs?: number;
}

/**
 * Pure spectrum analysis function
 * Analyzes FFT frequency bins for characteristic shuttle and net signatures
 */
export function analyzeFrequencySpectrum(
  freqData: Uint8Array,
  sampleRate: number,
  fftSize: number,
  sensitivity = 0.5 // 0.1 (low) to 1.0 (high)
): AcousticAnalysisResult {
  const binResolution = sampleRate / fftSize;
  const numBins = freqData.length;

  let totalEnergy = 0;
  let peakShuttleFreq = 0;
  let maxShuttleMag = 0;
  let peakNetFreq = 0;
  let maxNetMag = 0;

  for (let i = 0; i < numBins; i++) {
    const magnitude = freqData[i];
    totalEnergy += magnitude;
    const freq = i * binResolution;

    // Shuttle hit transient band: 3500 Hz - 7000 Hz
    if (freq >= 3500 && freq <= 7000) {
      if (magnitude > maxShuttleMag) {
        maxShuttleMag = magnitude;
        peakShuttleFreq = freq;
      }
    }

    // Net strike tape resonant band: 800 Hz - 2500 Hz
    if (freq >= 800 && freq <= 2500) {
      if (magnitude > maxNetMag) {
        maxNetMag = magnitude;
        peakNetFreq = freq;
      }
    }
  }

  const avgEnergy = totalEnergy / (numBins || 1);
  // Dynamic threshold scaled by sensitivity
  // Higher sensitivity lowers required threshold
  const thresholdMultiplier = Math.max(0.6, 2.2 - (sensitivity * 1.5));
  const baseThreshold = 40 * thresholdMultiplier;

  // Shuttle hit signature: sharp peak in 3.5k - 7k band exceeding background
  const shuttlePeakRatio = avgEnergy > 0 ? maxShuttleMag / avgEnergy : 0;
  if (maxShuttleMag > baseThreshold && shuttlePeakRatio > 2.2) {
    const confidence = Math.min(1.0, (maxShuttleMag / 255) * 0.7 + (shuttlePeakRatio / 5) * 0.3);
    return {
      detected: true,
      type: 'SHUTTLE_HIT',
      peakFrequencyHz: Math.round(peakShuttleFreq),
      energy: Math.min(1.0, maxShuttleMag / 255),
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  // Net strike signature: resonant acoustic scrape in 800 - 2500 Hz
  const netPeakRatio = avgEnergy > 0 ? maxNetMag / avgEnergy : 0;
  if (maxNetMag > baseThreshold * 1.1 && netPeakRatio > 2.5) {
    const confidence = Math.min(1.0, (maxNetMag / 255) * 0.65 + (netPeakRatio / 5) * 0.35);
    return {
      detected: true,
      type: 'NET_STRIKE',
      peakFrequencyHz: Math.round(peakNetFreq),
      energy: Math.min(1.0, maxNetMag / 255),
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  return {
    detected: false,
    peakFrequencyHz: 0,
    energy: 0,
    confidence: 0,
  };
}

/**
 * Fuses acoustic events with visual landing candidate
 * Checks if an acoustic strike occurred within +-120ms of candidate landing
 */
export function evaluateAcousticVisionFusion(
  landingTimestampMs: number,
  acousticEvents: AcousticEvent[],
  isShuttleNearNet: boolean,
  timeToleranceMs = 120
): FusionResult {
  let closestEvent: AcousticEvent | null = null;
  let minDelta = Infinity;

  for (const ev of acousticEvents) {
    const delta = Math.abs(ev.timestamp - landingTimestampMs);
    if (delta <= timeToleranceMs && delta < minDelta) {
      minDelta = delta;
      closestEvent = ev;
    }
  }

  if (!closestEvent) {
    return {
      isCorroborated: false,
      confidenceBoost: 0,
      isNetCord: false,
    };
  }

  if (closestEvent.type === 'NET_STRIKE' && isShuttleNearNet) {
    return {
      isCorroborated: true,
      confidenceBoost: 0.12,
      isNetCord: true,
      acousticEvent: closestEvent,
      timeDeltaMs: Math.round(minDelta),
    };
  }

  if (closestEvent.type === 'SHUTTLE_HIT') {
    // Corroborate floor or racket impact
    return {
      isCorroborated: true,
      confidenceBoost: 0.18,
      isNetCord: false,
      acousticEvent: closestEvent,
      timeDeltaMs: Math.round(minDelta),
    };
  }

  return {
    isCorroborated: false,
    confidenceBoost: 0,
    isNetCord: false,
  };
}

export class AcousticHitDetector {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private sensitivity = 0.5; // 0.1 to 1.0
  private recentEvents: AcousticEvent[] = [];
  private eventListeners: Array<(event: AcousticEvent) => void> = [];
  private lastTriggerTime = 0;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
  }

  public setSensitivity(sensitivity: number): void {
    this.sensitivity = Math.max(0.1, Math.min(1.0, sensitivity));
  }

  public getSensitivity(): number {
    return this.sensitivity;
  }

  public addEventListener(listener: (event: AcousticEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  public getRecentEvents(windowMs = 5000): AcousticEvent[] {
    const now = Date.now();
    return this.recentEvents.filter((e) => now - e.timestamp <= windowMs);
  }

  /**
   * Starts listening to audio via microphone
   * Silently fails / disables if microphone access is denied
   */
  public async start(providedStream?: MediaStream): Promise<boolean> {
    if (!this.isSupported() || this.isRunning) return false;

    try {
      let stream = providedStream;
      if (!stream) {
        if (!navigator.mediaDevices?.getUserMedia) {
          return false;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      }

      this.mediaStream = stream;
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.3;

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyser);

      this.isRunning = true;
      this.startAnalysisLoop();
      return true;
    } catch {
      // Permission denied or unavailable - gracefully fall back without crashing
      this.stop();
      return false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    try {
      this.sourceNode?.disconnect();
      this.analyser?.disconnect();
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    } catch {
      // Ignore cleanup errors
    }

    this.sourceNode = null;
    this.analyser = null;
    this.audioCtx = null;
  }

  private startAnalysisLoop(): void {
    if (!this.analyser || !this.isRunning) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const loop = () => {
      if (!this.isRunning || !this.analyser || !this.audioCtx) return;

      this.analyser.getByteFrequencyData(dataArray);
      const now = Date.now();

      // Enforce 100ms cooldown between acoustic strike events to prevent echo duplicate triggers
      if (now - this.lastTriggerTime > 100) {
        const result = analyzeFrequencySpectrum(
          dataArray,
          this.audioCtx.sampleRate,
          this.analyser.fftSize,
          this.sensitivity
        );

        if (result.detected && result.type) {
          this.lastTriggerTime = now;
          const event: AcousticEvent = {
            id: `ac_${now}_${Math.random().toString(36).slice(2, 6)}`,
            type: result.type,
            timestamp: now,
            frequencyHz: result.peakFrequencyHz,
            energy: result.energy,
            confidence: result.confidence,
          };

          this.recentEvents.push(event);
          if (this.recentEvents.length > 50) {
            this.recentEvents.shift();
          }

          this.eventListeners.forEach((l) => l(event));
        }
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }
}

export const acousticHitDetector = new AcousticHitDetector();
