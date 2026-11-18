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
    } catch {}
  }

  public medium(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate(14);
    } catch {}
  }

  public success(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate([10, 40, 15]);
    } catch {}
  }

  public warning(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate([25, 40, 25]);
    } catch {}
  }

  public selection(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate(4);
    } catch {}
  }
}

export const haptics = new HapticsEngine();

export function triggerHaptic(type: HapticType): void {
  haptics[type]();
}
