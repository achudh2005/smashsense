import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpeechService } from '../speechService';

describe('SpeechService', () => {
  let service: SpeechService;

  beforeEach(() => {
    service = new SpeechService();
  });

  it('formats initial score as Love all. Play.', () => {
    const text = service.getScoreAnnouncement(0, 0, 'A', false, false, false);
    expect(text).toBe('Love all. Play.');

    const speakSpy = vi.spyOn(service, 'speak').mockImplementation(() => {});
    service.announceScore(0, 0, 'A', false, false, false);
    expect(speakSpy).toHaveBeenCalledWith('Love all. Play.');
  });

  it('formats tied scores as [score] all', () => {
    const text = service.getScoreAnnouncement(14, 14, 'A', false, false, false);
    expect(text).toBe('14 all.');

    const speakSpy = vi.spyOn(service, 'speak').mockImplementation(() => {});
    service.announceScore(14, 14, 'A', false, false, false);
    expect(speakSpy).toHaveBeenCalledWith('14 all.');
  });

  it('formats game point and match point announcements', () => {
    const text1 = service.getScoreAnnouncement(20, 18, 'A', false, true, false);
    expect(text1).toBe('Game point. 20, 18.');

    const text2 = service.getScoreAnnouncement(20, 19, 'B', false, false, true);
    expect(text2).toBe('Match point. 20, 19.');
  });

  it('announces game winner', () => {
    const text = service.getScoreAnnouncement(21, 19, 'A', false, false, false, 'Viktor Axelsen');
    expect(text).toBe('Game, Viktor Axelsen. 21 to 19.');
  });

  it('announces IN and OUT line calls', () => {
    const speakSpy = vi.spyOn(service, 'speak').mockImplementation(() => {});
    const textOut = service.announceCall('OUT');
    expect(textOut).toBe('OUT!');
    expect(speakSpy).toHaveBeenCalledWith('OUT!');

    const textIn = service.announceCall('IN');
    expect(textIn).toBe('IN!');
    expect(speakSpy).toHaveBeenCalledWith('IN!');
  });
});

