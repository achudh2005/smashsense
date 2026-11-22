import { DetailedMatchEvent } from './matchEventModel';
import { Team, GameStateSnapshot } from '../game/scoringEngine';
import { PlayerRole } from '../tracking/byteTrack';

export interface TacticalAdvice {
  id: string;
  category: 'opponent_weakness' | 'target_zone' | 'rally_pace' | 'serve_strategy';
  priority: 'HIGH' | 'MEDIUM' | 'OPPORTUNITY';
  headline: string;
  detail: string;
  derivedMetric: string;
  targetZoneIndex?: number; // 1-9
  targetZoneName?: string;
  suggestedAction: string;
}

export interface InGameCoachReport {
  intervalPhase: 'GAME_11_INTERVAL' | 'GAME_END' | 'LIVE_RALLY';
  gameIndex: number;
  currentScoreText: string;
  leadingTeam: Team | 'TIED';
  leadMargin: number;
  adviceList: TacticalAdvice[];
  topTargetZone?: {
    zoneIndex: number;
    zoneName: string;
    winPercent: number;
  };
  keyOpponentVulnerability?: {
    shotType: string;
    errorRate: number;
    opponentName: string;
  };
}

/**
 * Checks if current game snapshot is at the 11-point interval or game completion
 */
export function isCoachIntervalTrigger(snapshot: GameStateSnapshot): boolean {
  if (snapshot.isGameOver) {
    return true;
  }
  // Standard BWF 11-point interval: first to reach 11 in each game
  const is11A = snapshot.scoreA === 11 && snapshot.scoreB < 11;
  const is11B = snapshot.scoreB === 11 && snapshot.scoreA < 11;
  return is11A || is11B;
}

/**
 * Derives live tactical advice strictly from real match event statistics
 */
export function generateTacticalAdvice(
  events: DetailedMatchEvent[],
  snapshot: GameStateSnapshot,
  playerNames: Record<PlayerRole, string>,
  focusTeam: Team = 'A'
): InGameCoachReport {
  const adviceList: TacticalAdvice[] = [];
  const opponentTeam: Team = focusTeam === 'A' ? 'B' : 'A';
  const opponentName = opponentTeam === 'A' ? playerNames.A1 || 'Opponent' : playerNames.B1 || 'Opponent';

  const currentGameEvents = events.filter((e) => e.gameIndex === snapshot.gameIndex);
  const relevantEvents = currentGameEvents.length >= 6 ? currentGameEvents : events;

  // 1. OPPONENT VULNERABILITY ANALYSIS (Stroke-specific error rates)
  const opponentStrokeCounts: Record<string, { total: number; errors: number }> = {};

  relevantEvents.forEach((ev) => {
    // If opponent made an error or missed return
    if (ev.winner.team === focusTeam && ev.errorType) {
      const stroke = ev.shotType || 'clear';
      if (!opponentStrokeCounts[stroke]) {
        opponentStrokeCounts[stroke] = { total: 0, errors: 0 };
      }
      opponentStrokeCounts[stroke].errors++;
      opponentStrokeCounts[stroke].total++;
    } else if (ev.winner.team === opponentTeam) {
      // Opponent hit a successful shot
      const stroke = ev.shotType || 'clear';
      if (!opponentStrokeCounts[stroke]) {
        opponentStrokeCounts[stroke] = { total: 0, errors: 0 };
      }
      opponentStrokeCounts[stroke].total++;
    }
  });

  let topVulnerability: { shotType: string; errorRate: number; opponentName: string } | undefined;

  for (const [stroke, data] of Object.entries(opponentStrokeCounts)) {
    if (data.total >= 3) {
      const errRate = Math.round((data.errors / data.total) * 100);
      if (errRate >= 45 && (!topVulnerability || errRate > topVulnerability.errorRate)) {
        topVulnerability = {
          shotType: stroke,
          errorRate: errRate,
          opponentName,
        };
      }
    }
  }

  if (topVulnerability) {
    const strokeDisplay = topVulnerability.shotType.replace('_', ' ');
    adviceList.push({
      id: 'opp-vulnerability',
      category: 'opponent_weakness',
      priority: 'HIGH',
      headline: `${topVulnerability.opponentName} vulnerable on ${strokeDisplay}s`,
      detail: `Opponent has a ${topVulnerability.errorRate}% error rate when forced into ${strokeDisplay}s (${opponentStrokeCounts[topVulnerability.shotType].errors}/${opponentStrokeCounts[topVulnerability.shotType].total} forced errors).`,
      derivedMetric: `${topVulnerability.errorRate}% error rate on ${strokeDisplay}`,
      suggestedAction: `Keep pressing deep or soft to trigger ${strokeDisplay} errors.`,
    });
  }

  // 2. TARGET ZONE EFFECTIVENESS (Which court zone produces the most points for focus team)
  const zoneWins: Record<number, { count: number; zoneName: string }> = {};
  const myWinningEvents = relevantEvents.filter((e) => e.winner.team === focusTeam);

  myWinningEvents.forEach((ev) => {
    const zIdx = ev.shotZoneIndex;
    if (!zoneWins[zIdx]) {
      zoneWins[zIdx] = { count: 0, zoneName: ev.shotZone };
    }
    zoneWins[zIdx].count++;
  });

  let topZone: { zoneIndex: number; zoneName: string; winPercent: number } | undefined;

  if (myWinningEvents.length >= 4) {
    let maxWins = 0;
    for (const [zStr, zData] of Object.entries(zoneWins)) {
      const zIdx = Number(zStr);
      if (zData.count > maxWins) {
        maxWins = zData.count;
        const pct = Math.round((zData.count / myWinningEvents.length) * 100);
        topZone = {
          zoneIndex: zIdx,
          zoneName: zData.zoneName,
          winPercent: pct,
        };
      }
    }
  }

  if (topZone && topZone.winPercent >= 35) {
    adviceList.push({
      id: 'target-zone',
      category: 'target_zone',
      priority: 'HIGH',
      headline: `Target Zone ${topZone.zoneIndex} (${topZone.zoneName})`,
      detail: `${topZone.winPercent}% of your winning points in this game landed in ${topZone.zoneName}.`,
      derivedMetric: `${topZone.winPercent}% conversion in Zone ${topZone.zoneIndex}`,
      targetZoneIndex: topZone.zoneIndex,
      targetZoneName: topZone.zoneName,
      suggestedAction: `Continue attacking the ${topZone.zoneName} pocket to create open-court space.`,
    });
  }

  // 3. RALLY LENGTH PACING (Short < 5 shots vs Long >= 8 shots)
  const shortRallies = relevantEvents.filter((e) => e.rallyLength.shotCount < 5);
  const longRallies = relevantEvents.filter((e) => e.rallyLength.shotCount >= 8);

  const shortWins = shortRallies.filter((e) => e.winner.team === focusTeam).length;
  const longWins = longRallies.filter((e) => e.winner.team === focusTeam).length;

  if (shortRallies.length >= 4) {
    const shortWinPct = Math.round((shortWins / shortRallies.length) * 100);
    if (shortWinPct >= 65) {
      adviceList.push({
        id: 'pace-fast',
        category: 'rally_pace',
        priority: 'MEDIUM',
        headline: 'Fast-Tempo Advantage',
        detail: `You win ${shortWinPct}% of quick exchanges (< 5 shots). Attack early to avoid prolonged rallies.`,
        derivedMetric: `${shortWins}/${shortRallies.length} short rallies won (${shortWinPct}%)`,
        suggestedAction: 'Take shuttle early on the rise and close out points quickly.',
      });
    } else if (shortWinPct <= 35 && longRallies.length >= 3) {
      const longWinPct = Math.round((longWins / longRallies.length) * 100);
      adviceList.push({
        id: 'pace-endurance',
        category: 'rally_pace',
        priority: 'MEDIUM',
        headline: 'Extend Rallies & Build Points',
        detail: `Opponent rushes points but you win ${longWinPct}% of long rallies (8+ shots). Lift high and reset tempo.`,
        derivedMetric: `${longWins}/${longRallies.length} long rallies won (${longWinPct}%)`,
        suggestedAction: 'Be patient, move opponent to four corners, and wait for clear openings.',
      });
    }
  }

  // 4. SERVE / RECEIVE ADVANTAGE
  const serveEvents = relevantEvents.filter((e) => e.server.team === focusTeam);
  if (serveEvents.length >= 5) {
    const serveWins = serveEvents.filter((e) => e.winner.team === focusTeam).length;
    const serveWinPct = Math.round((serveWins / serveEvents.length) * 100);
    if (serveWinPct >= 65) {
      adviceList.push({
        id: 'serve-dominance',
        category: 'serve_strategy',
        priority: 'OPPORTUNITY',
        headline: 'High Serve Point Conversion',
        detail: `Winning ${serveWinPct}% of your service points (${serveWins}/${serveEvents.length}). Third-shot attack is locking down points.`,
        derivedMetric: `${serveWinPct}% serve win rate`,
        suggestedAction: 'Keep mixing low short serves with occasional flick serves to keep opponent guessing.',
      });
    }
  }

  // Fallback foundational tip if match just started
  if (adviceList.length === 0) {
    adviceList.push({
      id: 'baseline-tactics',
      category: 'target_zone',
      priority: 'MEDIUM',
      headline: 'Control the Center Court Base',
      detail: 'Keep recovering swiftly to center T after smashes. Push opponent to backline corners.',
      derivedMetric: 'Early Game Baseline Strategy',
      targetZoneIndex: 5,
      targetZoneName: 'Mid-Center',
      suggestedAction: 'Focus on clean footwork recovery and tight net-spin shots.',
    });
  }

  const intervalPhase = snapshot.isGameOver
    ? 'GAME_END'
    : isCoachIntervalTrigger(snapshot)
    ? 'GAME_11_INTERVAL'
    : 'LIVE_RALLY';

  const diff = snapshot.scoreA - snapshot.scoreB;
  const leadTeam = diff > 0 ? 'A' : diff < 0 ? 'B' : 'TIED';

  return {
    intervalPhase,
    gameIndex: snapshot.gameIndex,
    currentScoreText: `${snapshot.scoreA} - ${snapshot.scoreB}`,
    leadingTeam: leadTeam,
    leadMargin: Math.abs(diff),
    adviceList,
    topTargetZone: topZone,
    keyOpponentVulnerability: topVulnerability,
  };
}
