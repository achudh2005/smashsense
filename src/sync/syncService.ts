import { db } from '../storage/db';

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  provider: 'guest' | 'google' | 'supabase' | 'firebase';
  avatarUrl?: string;
  lastSyncedAt?: number;
}

export interface CloudBackupPayload {
  version: number;
  exportedAt: number;
  userEmail?: string;
  venues: any[];
  calibrations: any[];
  matches: any[];
  rallies: any[];
  drillResults: any[];
  playerProfiles: any[];
}

export interface LiveSharePayload {
  matchId: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  gameIndex: number;
  gamesWonA: number;
  gamesWonB: number;
  server: string;
  lastEventTime: number;
}

export class SyncService {
  private currentUser: UserAccount | null = null;
  private autoSyncEnabled: boolean = false;

  constructor() {
    this.loadUserSession();
  }

  public getCurrentUser(): UserAccount | null {
    return this.currentUser;
  }

  public isAutoSyncEnabled(): boolean {
    return this.autoSyncEnabled;
  }

  public setAutoSyncEnabled(enabled: boolean) {
    this.autoSyncEnabled = enabled;
  }

  /**
   * Log in user (local abstraction supporting guest, Supabase, or Firebase tokens)
   */
  public async login(
    email: string,
    displayName: string,
    provider: 'guest' | 'google' | 'supabase' | 'firebase' = 'guest'
  ): Promise<UserAccount> {
    const user: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email,
      displayName,
      provider,
      lastSyncedAt: Date.now(),
    };
    this.currentUser = user;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smashsense_user', JSON.stringify(user));
    }
    return user;
  }

  public logout() {
    this.currentUser = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('smashsense_user');
    }
  }

  /**
   * Generates a complete JSON backup of all stored statistics, venues, matches and drills.
   * STRICTLY PRIVACY PRESERVING: ZERO video or image frames are ever exported.
   */
  public async createLocalBackup(): Promise<string> {
    const venues = await db.venues.toArray();
    const calibrations = await db.calibrations.toArray();
    const matches = await db.matches.toArray();
    const rallies = await db.rallies.toArray();
    const drillResults = await db.drillResults.toArray();
    const playerProfiles = await db.playerProfiles.toArray();

    const payload: CloudBackupPayload = {
      version: 1,
      exportedAt: Date.now(),
      userEmail: this.currentUser?.email,
      venues,
      calibrations,
      matches,
      rallies,
      drillResults,
      playerProfiles,
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Restores data from a previously created JSON backup file
   */
  public async restoreFromBackup(jsonString: string): Promise<{ restoredMatches: number; restoredProfiles: number }> {
    const payload: CloudBackupPayload = JSON.parse(jsonString);

    if (payload.matches && payload.matches.length > 0) {
      await db.matches.bulkPut(payload.matches);
    }
    if (payload.rallies && payload.rallies.length > 0) {
      await db.rallies.bulkPut(payload.rallies);
    }
    if (payload.playerProfiles && payload.playerProfiles.length > 0) {
      await db.playerProfiles.bulkPut(payload.playerProfiles);
    }
    if (payload.venues && payload.venues.length > 0) {
      await db.venues.bulkPut(payload.venues);
    }
    if (payload.calibrations && payload.calibrations.length > 0) {
      await db.calibrations.bulkPut(payload.calibrations);
    }
    if (payload.drillResults && payload.drillResults.length > 0) {
      await db.drillResults.bulkPut(payload.drillResults);
    }

    return {
      restoredMatches: payload.matches?.length || 0,
      restoredProfiles: payload.playerProfiles?.length || 0,
    };
  }

  /**
   * Generates a compressed shareable URL containing the live match state
   * so coaches, teammates, or spectators can view live score updates without any video transmission.
   */
  public generateLiveScoreShareUrl(payload: LiveSharePayload): string {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://smashsense.app';
    return `${baseUrl}/#live=${encoded}`;
  }

  /**
   * Parses live share payload from URL hash
   */
  public parseLiveScoreShareUrl(hash: string): LiveSharePayload | null {
    try {
      const match = hash.match(/#live=([^&]+)/);
      if (!match || !match[1]) return null;
      const json = decodeURIComponent(escape(atob(match[1])));
      return JSON.parse(json) as LiveSharePayload;
    } catch {
      return null;
    }
  }

  private loadUserSession() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem('smashsense_user');
      if (saved) {
        this.currentUser = JSON.parse(saved);
      }
    } catch {
      void 0;
    }
  }
}

export const syncService = new SyncService();
