import { TrainingDrillConfig, DrillAttemptResult, evaluateTargetShot } from './drills';
import { Point2D } from '../court/courtGeometry';
import { db, DrillResultRecord } from '../storage/db';

export class TrainingSessionManager {
  private activeDrill: TrainingDrillConfig | null = null;
  private startTime: number = 0;
  private attempts: DrillAttemptResult[] = [];
  private totalReps: number = 0;
  private successfulHits: number = 0;
  private topSpeedKmh: number = 0;
  private currentFeedback: string = 'Ready - Begin drill when prompted';
  private currentTargetCorner: 'FL' | 'FR' | 'BL' | 'BR' = 'FL';

  public startDrill(drill: TrainingDrillConfig) {
    this.activeDrill = drill;
    this.startTime = Date.now();
    this.attempts = [];
    this.totalReps = 0;
    this.successfulHits = 0;
    this.topSpeedKmh = 0;
    this.currentFeedback = `Drill started: ${drill.name}. Execute attempt 1!`;
    this.pickNextCorner();
  }

  public getActiveDrill(): TrainingDrillConfig | null {
    return this.activeDrill;
  }

  public getAttempts(): DrillAttemptResult[] {
    return this.attempts;
  }

  public getFeedback(): string {
    return this.currentFeedback;
  }

  public getTargetCorner(): 'FL' | 'FR' | 'BL' | 'BR' {
    return this.currentTargetCorner;
  }

  public getStats() {
    const elapsedSec = this.startTime > 0 ? (Date.now() - this.startTime) / 1000 : 0;
    const accuracy = this.totalReps > 0 ? Math.round((this.successfulHits / this.totalReps) * 100) : 0;
    const targetReps = this.activeDrill?.targetReps || 10;
    const progressPercent = Math.min(100, Math.round((this.totalReps / targetReps) * 100));

    return {
      elapsedSec: Math.round(elapsedSec),
      totalReps: this.totalReps,
      targetReps,
      successfulHits: this.successfulHits,
      accuracyPercent: accuracy,
      progressPercent,
      topSpeedKmh: this.topSpeedKmh,
      isCompleted: this.totalReps >= targetReps,
    };
  }

  public recordShuttleLanding(landingCourt: Point2D, speedKmh: number = 0): DrillAttemptResult | null {
    if (!this.activeDrill || this.activeDrill.category !== 'target_zone' || !this.activeDrill.targetZone) {
      return null;
    }

    if (speedKmh > this.topSpeedKmh) this.topSpeedKmh = speedKmh;

    const evalResult = evaluateTargetShot(
      landingCourt,
      this.activeDrill.targetZone,
      speedKmh,
      this.activeDrill.minSpeedKmh
    );

    this.totalReps++;
    if (evalResult.isHit) this.successfulHits++;

    if (evalResult.isHit) {
      this.currentFeedback = `🎯 TARGET HIT! ${Math.round(evalResult.distanceMeters * 100)}cm from ideal (${Math.round(speedKmh)} km/h)`;
    } else {
      this.currentFeedback = `⚠️ Missed Target Zone (${Math.round(evalResult.distanceMeters * 100)}cm away)`;
    }

    const attempt: DrillAttemptResult = {
      attemptNumber: this.totalReps,
      timestamp: Date.now(),
      isHit: evalResult.isHit,
      distanceToTargetMeters: evalResult.distanceMeters,
      speedKmh,
    };
    this.attempts.push(attempt);

    return attempt;
  }

  public recordFootworkStep(_playerCourtPos?: Point2D, recoveryTimeSec: number = 0): DrillAttemptResult | null {
    if (!this.activeDrill || this.activeDrill.category !== 'footwork') {
      return null;
    }

    this.totalReps++;
    const isHit = recoveryTimeSec < 1.8;
    if (isHit) this.successfulHits++;

    this.currentFeedback = isHit
      ? `⚡ Sharp Recovery! (${recoveryTimeSec.toFixed(1)}s) → Move to ${this.currentTargetCorner}`
      : `🐢 Slow Recovery (${recoveryTimeSec.toFixed(1)}s) → Push off aggressively!`;

    const attempt: DrillAttemptResult = {
      attemptNumber: this.totalReps,
      timestamp: Date.now(),
      isHit,
      recoveryTimeSec,
    };
    this.attempts.push(attempt);
    this.pickNextCorner();

    return attempt;
  }

  public recordStrokeCadence(totalShots: number) {
    if (!this.activeDrill || this.activeDrill.category !== 'shot_counter') return;
    this.totalReps = totalShots;
    this.successfulHits = totalShots;
    this.currentFeedback = `🔥 ${totalShots} consecutive strokes maintained!`;
  }

  private pickNextCorner() {
    const corners: ('FL' | 'FR' | 'BL' | 'BR')[] = ['FL', 'FR', 'BL', 'BR'];
    const next = corners[Math.floor(Math.random() * corners.length)];
    this.currentTargetCorner = next;
  }

  public async finishAndSave(): Promise<DrillResultRecord | null> {
    if (!this.activeDrill) return null;
    const stats = this.getStats();

    const record: DrillResultRecord = {
      drillId: this.activeDrill.id,
      drillType: this.activeDrill.category,
      drillName: this.activeDrill.name,
      timestamp: Date.now(),
      durationSeconds: stats.elapsedSec,
      repsCompleted: stats.totalReps,
      targetAccuracyPercent: stats.accuracyPercent,
      score: stats.accuracyPercent,
      topSpeedKmh: stats.topSpeedKmh,
      notes: `${stats.successfulHits}/${stats.totalReps} target hits achieved in ${stats.elapsedSec}s.`,
    };

    try {
      const savedId = await db.drillResults.add(record);
      record.id = Number(savedId);
    } catch (err) {
      console.warn('Failed to save drill to IndexedDB:', err);
    }

    return record;
  }
}

export const trainingManager = new TrainingSessionManager();
