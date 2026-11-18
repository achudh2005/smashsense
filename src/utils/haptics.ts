/**
 * Haptic Feedback Engine
 * Gracefully vibrates device if supported by the browser / operating system.
 */

export type HapticType = 'light' | 'medium' | 'success' | 'warning' | 'selection';

class HapticsEngine {
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  public light(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate(6);
    } catch {
      void 0;
    }
  }

  public medium(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate(14);
    } catch {
      void 0;
    }
  }

  public success(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate([10, 40, 15]);
    } catch {
      void 0;
    }
  }

  public warning(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate([25, 40, 25]);
    } catch {
      void 0;
    }
  }

  public selection(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate(4);
    } catch {
      void 0;
    }
  }
}

export const haptics = new HapticsEngine();

export function triggerHaptic(type: HapticType): void {
  haptics[type]();
}
