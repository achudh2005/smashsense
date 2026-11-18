import { db, FlaggedCallRecord } from '../storage/db';
import { LineCallEvaluation } from './lineCallEngine';

export interface TuningSettings {
  uncertaintyThresholdCm: number; // default 5 cm
  minConfidenceThreshold: number; // default 0.70
  shuttleSensitivity: number; // default 0.65
  autoReviewTrigger: boolean; // auto alert on flagged calls
}

export const DEFAULT_TUNING_SETTINGS: TuningSettings = {
  uncertaintyThresholdCm: 5.0,
  minConfidenceThreshold: 0.75,
  shuttleSensitivity: 0.65,
  autoReviewTrigger: true,
};

export class AccuracyTuningManager {
  private settings: TuningSettings = { ...DEFAULT_TUNING_SETTINGS };

  constructor() {
    this.loadSettings();
  }

  public getSettings(): TuningSettings {
    return this.settings;
  }

  public updateSettings(partial: Partial<TuningSettings>) {
    this.settings = { ...this.settings, ...partial };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smashsense_tuning', JSON.stringify(this.settings));
    }
  }

  /**
   * Evaluates if a line call warrants user review
   */
  public shouldFlagCall(call: LineCallEvaluation): boolean {
    const isClose = call.distanceToLineCm <= this.settings.uncertaintyThresholdCm;
    const isLowConfidence = call.confidencePercent < this.settings.minConfidenceThreshold * 100;
    return isClose || isLowConfidence || call.isUncertain;
  }

  /**
   * Save a flagged call for later review
   */
  public async logFlaggedCall(
    call: LineCallEvaluation,
    rallyNumber: number,
    gameIndex: number
  ): Promise<FlaggedCallRecord> {
    const record: FlaggedCallRecord = {
      id: `flag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      rallyNumber,
      gameIndex,
      call: call.call,
      confidence: Math.round(call.confidencePercent),
      distanceToLineCm: Number(call.distanceToLineCm.toFixed(1)),
      landingCourt: call.landingCourt,
    };

    try {
      await db.flaggedCalls.put(record);
    } catch (err) {
      console.warn('Failed to save flagged call:', err);
    }

    return record;
  }

  /**
   * Get all flagged calls for review
   */
  public async getFlaggedCalls(): Promise<FlaggedCallRecord[]> {
    return await db.flaggedCalls.reverse().sortBy('timestamp');
  }

  /**
   * User reviews and confirms or overturns a line call
   */
  public async reviewCall(id: string, verdict: 'CONFIRMED' | 'OVERTURNED', adjustedMarginCm?: number) {
    const record = await db.flaggedCalls.get(id);
    if (!record) return;

    record.userVerdict = verdict;
    if (adjustedMarginCm !== undefined) {
      record.adjustedMarginCm = adjustedMarginCm;
    }
    await db.flaggedCalls.put(record);

    // If overturned, adapt the uncertainty threshold if systematically off
    if (verdict === 'OVERTURNED') {
      const allFlagged = await db.flaggedCalls.toArray();
      const overturned = allFlagged.filter((f) => f.userVerdict === 'OVERTURNED');
      if (overturned.length >= 3) {
        // Broaden review margin slightly to be more cautious
        const newMargin = Math.min(8.0, Number((this.settings.uncertaintyThresholdCm + 0.5).toFixed(1)));
        this.updateSettings({ uncertaintyThresholdCm: newMargin });
      }
    }
  }

  private loadSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem('smashsense_tuning');
      if (saved) {
        this.settings = { ...DEFAULT_TUNING_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      void 0;
    }
  }
}

export const accuracyManager = new AccuracyTuningManager();
