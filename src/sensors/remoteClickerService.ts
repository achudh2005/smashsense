/**
 * Bluetooth Remote Clicker & Wearable Controls Service
 * Listens for Bluetooth clicker key events (PageUp/PageDown, B/Blackout, Space, Media keys)
 * with customizable key learning, synthetic audio feedback tones, and haptic pulses.
 */

import { haptics } from '../utils/haptics';

export type RemoteClickerAction =
  | 'POINT_A'
  | 'POINT_B'
  | 'UNDO'
  | 'CHALLENGE'
  | 'TOGGLE_DRILL';

export interface KeyMappingConfig {
  POINT_A: string[];
  POINT_B: string[];
  UNDO: string[];
  CHALLENGE: string[];
  TOGGLE_DRILL: string[];
}

export const DEFAULT_KEY_MAPPINGS: KeyMappingConfig = {
  POINT_A: ['PageUp', 'ArrowUp'],
  POINT_B: ['PageDown', 'ArrowDown'],
  UNDO: ['KeyB', 'b', 'Period', '.'],
  CHALLENGE: ['Space', ' '],
  TOGGLE_DRILL: ['Enter'],
};

const STORAGE_KEY = 'smashsense_remote_clicker_keys';

/**
 * Synthesizes short, non-intrusive feedback audio tones for blind acknowledgment
 */
class RemoteAudioTone {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public playPointTone(highPitch = true): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(highPitch ? 880 : 660, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  public playUndoTone(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(330, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore
    }
  }

  public playChallengeTone(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore
    }
  }
}

export class RemoteClickerService {
  private mappings: KeyMappingConfig;
  private isEnabled = true;
  private learningAction: RemoteClickerAction | null = null;
  private learningCallback: ((action: RemoteClickerAction, key: string) => void) | null = null;
  private actionHandlers: Map<RemoteClickerAction, Array<() => void>> = new Map();
  private tone = new RemoteAudioTone();
  private lastTriggerTime = 0;

  constructor() {
    this.mappings = this.loadMappings();
    this.initGlobalListener();
  }

  private loadMappings(): KeyMappingConfig {
    if (typeof localStorage === 'undefined') return DEFAULT_KEY_MAPPINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_KEY_MAPPINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_KEY_MAPPINGS;
  }

  public saveMappings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.mappings));
    } catch {
      // Ignore
    }
  }

  public getMappings(): KeyMappingConfig {
    return { ...this.mappings };
  }

  public resetToDefaults(): void {
    this.mappings = { ...DEFAULT_KEY_MAPPINGS };
    this.saveMappings();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public isClickerEnabled(): boolean {
    return this.isEnabled;
  }

  public startLearning(
    action: RemoteClickerAction,
    onLearned?: (action: RemoteClickerAction, key: string) => void
  ): void {
    this.learningAction = action;
    this.learningCallback = onLearned || null;
  }

  public cancelLearning(): void {
    this.learningAction = null;
    this.learningCallback = null;
  }

  public isLearning(): boolean {
    return this.learningAction !== null;
  }

  public getLearningAction(): RemoteClickerAction | null {
    return this.learningAction;
  }

  public onAction(action: RemoteClickerAction, handler: () => void): () => void {
    const list = this.actionHandlers.get(action) || [];
    list.push(handler);
    this.actionHandlers.set(action, list);

    return () => {
      const cur = this.actionHandlers.get(action) || [];
      this.actionHandlers.set(
        action,
        cur.filter((h) => h !== handler)
      );
    };
  }

  public triggerAction(action: RemoteClickerAction): void {
    // Provide tactile and audio confirmation
    switch (action) {
      case 'POINT_A':
        this.tone.playPointTone(true);
        haptics.selection();
        break;
      case 'POINT_B':
        this.tone.playPointTone(false);
        haptics.selection();
        break;
      case 'UNDO':
        this.tone.playUndoTone();
        haptics.warning();
        break;
      case 'CHALLENGE':
        this.tone.playChallengeTone();
        haptics.medium();
        break;
      case 'TOGGLE_DRILL':
        this.tone.playPointTone(true);
        haptics.success();
        break;
    }

    const handlers = this.actionHandlers.get(action) || [];
    handlers.forEach((h) => {
      try {
        h();
      } catch {
        // Ignore handler error
      }
    });
  }

  public handleKeyEvent(event: { key: string; code?: string; preventDefault?: () => void; stopPropagation?: () => void }): boolean {
    if (!this.isEnabled) return false;

    const key = event.key;
    const code = event.code;

    // Handle learning mode
    if (this.learningAction) {
      event.preventDefault?.();
      event.stopPropagation?.();
      const action = this.learningAction;
      const keyIdentifier = code || key;

      this.mappings[action] = [keyIdentifier, key];
      this.saveMappings();

      this.tone.playPointTone(true);
      haptics.success();

      const cb = this.learningCallback;
      this.cancelLearning();
      if (cb) cb(action, keyIdentifier);
      return true;
    }

    // Rate-limit consecutive clicks (200ms debounce)
    const now = Date.now();
    if (now - this.lastTriggerTime < 200) {
      return false;
    }

    // Check mappings
    for (const [actionName, keys] of Object.entries(this.mappings)) {
      if (keys.includes(key) || keys.includes(code)) {
        event.preventDefault?.();
        event.stopPropagation?.();
        this.lastTriggerTime = now;
        this.triggerAction(actionName as RemoteClickerAction);
        return true;
      }
    }

    return false;
  }

  private initGlobalListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener(
      'keydown',
      (e) => {
        // Don't intercept typing in inputs or textareas unless in learning mode
        if (!this.learningAction && (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          return;
        }
        this.handleKeyEvent(e);
      },
      { capture: true }
    );
  }
}

export const remoteClickerService = new RemoteClickerService();
