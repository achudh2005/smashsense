import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoteClickerService } from '../remoteClickerService';

describe('Bluetooth Remote Clicker & Wearable Controls', () => {
  let service: RemoteClickerService;

  beforeEach(() => {
    service = new RemoteClickerService();
    service.resetToDefaults();
  });

  const createEvent = (key: string, code?: string) => ({
    key,
    code: code || key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  });

  it('triggers POINT_A on PageUp key event', () => {
    const handler = vi.fn();
    service.onAction('POINT_A', handler);

    const event = createEvent('PageUp', 'PageUp');
    const handled = service.handleKeyEvent(event);

    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('triggers POINT_B on PageDown key event', () => {
    const handler = vi.fn();
    service.onAction('POINT_B', handler);

    const event = createEvent('PageDown', 'PageDown');
    const handled = service.handleKeyEvent(event);

    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('triggers UNDO on KeyB blackout button', () => {
    const handler = vi.fn();
    service.onAction('UNDO', handler);

    const event = createEvent('b', 'KeyB');
    const handled = service.handleKeyEvent(event);

    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('triggers CHALLENGE on Space bar', () => {
    const handler = vi.fn();
    service.onAction('CHALLENGE', handler);

    const event = createEvent(' ', 'Space');
    const handled = service.handleKeyEvent(event);

    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('learns a new custom key mapping when learning mode is active', () => {
    const learnCallback = vi.fn();
    service.startLearning('POINT_A', learnCallback);
    expect(service.isLearning()).toBe(true);
    expect(service.getLearningAction()).toBe('POINT_A');

    // Simulate pressing F5 (common presentation slide show key)
    const event = createEvent('F5', 'F5');
    const handled = service.handleKeyEvent(event);

    expect(handled).toBe(true);
    expect(service.isLearning()).toBe(false);
    expect(learnCallback).toHaveBeenCalledWith('POINT_A', 'F5');

    // Verify the newly learned key triggers POINT_A
    const actionHandler = vi.fn();
    service.onAction('POINT_A', actionHandler);

    const f5Event = createEvent('F5', 'F5');
    service.handleKeyEvent(f5Event);

    expect(actionHandler).toHaveBeenCalledTimes(1);
  });

  it('cancels learning mode cleanly without modifying mappings', () => {
    const initialMappings = service.getMappings();
    service.startLearning('UNDO');
    service.cancelLearning();

    expect(service.isLearning()).toBe(false);
    expect(service.getMappings().UNDO).toEqual(initialMappings.UNDO);
  });

  it('ignores key events when remote clicker service is disabled', () => {
    service.setEnabled(false);
    const handler = vi.fn();
    service.onAction('POINT_A', handler);

    const event = createEvent('PageUp', 'PageUp');
    const handled = service.handleKeyEvent(event);

    expect(handled).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});
