import { describe, it, expect } from 'vitest';
import { SyncService, LiveSharePayload } from '../syncService';

describe('SyncService', () => {
  it('generates and parses live score share URLs', () => {
    const service = new SyncService();
    const payload: LiveSharePayload = {
      matchId: 'match_123',
      teamA: 'Axelsen',
      teamB: 'Momota',
      scoreA: 21,
      scoreB: 19,
      gameIndex: 1,
      gamesWonA: 1,
      gamesWonB: 0,
      server: 'A1',
      lastEventTime: 1700000000,
    };

    const shareUrl = service.generateLiveScoreShareUrl(payload);
    expect(shareUrl).toContain('#live=');

    const hash = shareUrl.substring(shareUrl.indexOf('#'));
    const parsed = service.parseLiveScoreShareUrl(hash);
    expect(parsed).not.toBeNull();
    expect(parsed?.matchId).toBe('match_123');
    expect(parsed?.scoreA).toBe(21);
    expect(parsed?.scoreB).toBe(19);
    expect(parsed?.teamA).toBe('Axelsen');
  });

  it('handles guest login session caching', async () => {
    const service = new SyncService();
    const user = await service.login('coach@badminton.org', 'Coach Chen', 'guest');
    expect(user.email).toBe('coach@badminton.org');
    expect(user.displayName).toBe('Coach Chen');
    expect(service.getCurrentUser()?.id).toBe(user.id);
  });
});
