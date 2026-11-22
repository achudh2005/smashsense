import { GameStateSnapshot, Team } from '../game/scoringEngine';
import { DetailedMatchEvent } from './matchEventModel';

export interface WinProbabilityResult {
  winProbabilityA: number; // 0 to 100%
  winProbabilityB: number; // 0 to 100%
  momentumScore: number;   // -100 (B dominating) to +100 (A dominating)
  momentumTrend: number[]; // recent 10-point momentum values for sparkline
  momentumDominantTeam: Team | 'NEUTRAL';
  fatigueIndexA: number;   // 0 to 100%
  fatigueIndexB: number;   // 0 to 100%
  statusText: string;
}

/**
 * Computes the win probability of a 21-point game from score (sA, sB)
 * with individual point win probability p
 */
function computeGameWinProb(sA: number, sB: number, p: number): number {
  if (sA >= 21 && sA - sB >= 2) return 1.0;
  if (sB >= 21 && sB - sA >= 2) return 0.0;
  if (sA === 30) return 1.0;
  if (sB === 30) return 0.0;

  // Simple logistic approximation calibrated for 21-point badminton
  const scoreDiff = sA - sB;

  // Odds ratio based on points remaining and baseline skill p
  const logOdds = (scoreDiff * 0.22) + ((p - 0.5) * 8.0);
  const prob = 1 / (1 + Math.exp(-logOdds));
  return Math.min(0.99, Math.max(0.01, prob));
}

/**
 * Calculates real-time match win probability and momentum telemetry
 */
export function calculateWinProbability(
  snapshot: GameStateSnapshot,
  events: DetailedMatchEvent[],
  speedKmhA = 0,
  speedKmhB = 0
): WinProbabilityResult {
  const { scoreA, scoreB, gamesWonA, gamesWonB, servingSide, isGameOver, matchWinner } = snapshot;

  if (isGameOver) {
    const aWon = matchWinner === 'A' || scoreA > scoreB;
    return {
      winProbabilityA: aWon ? 100 : 0,
      winProbabilityB: aWon ? 0 : 100,
      momentumScore: aWon ? 100 : -100,
      momentumTrend: [aWon ? 100 : -100],
      momentumDominantTeam: aWon ? 'A' : 'B',
      fatigueIndexA: 0,
      fatigueIndexB: 0,
      statusText: aWon ? 'Team A Won the Match' : 'Team B Won the Match',
    };
  }

  // 1. Point win rate from real events
  let pA = 0.50;
  if (events.length >= 4) {
    const winsA = events.filter((e) => e.winner.team === 'A').length;
    const rawRateA = winsA / events.length;
    // Blend with 0.5 prior
    pA = 0.50 * 0.4 + rawRateA * 0.6;
  }

  // Server slight initiative bonus (+1.5%)
  if (servingSide === 'A') pA += 0.015;
  if (servingSide === 'B') pA -= 0.015;

  // 2. Compute Game Win Probability
  const pGameCurrentA = computeGameWinProb(scoreA, scoreB, pA);

  // 3. Compute Match Win Probability (Best of 3)
  let pMatchA = pGameCurrentA;
  if (gamesWonA === 1 && gamesWonB === 0) {
    // A already has 1 game in hand
    pMatchA = pGameCurrentA + (1 - pGameCurrentA) * pA;
  } else if (gamesWonB === 1 && gamesWonA === 0) {
    // B has 1 game in hand
    pMatchA = pGameCurrentA * pA;
  } else if (gamesWonA === 1 && gamesWonB === 1) {
    // Decider Game 3
    pMatchA = pGameCurrentA;
  }

  const finalProbA = Math.round(pMatchA * 100);
  const finalProbB = 100 - finalProbA;

  // 4. Momentum Calculation across last 8 rallies
  const recentEvents = events.slice(-8);
  let momentumVal = 0;
  const trend: number[] = [];

  let rollingDiff = 0;
  events.slice(-10).forEach((ev) => {
    rollingDiff += ev.winner.team === 'A' ? 12 : -12;
    // Bound -100 to +100
    rollingDiff = Math.max(-100, Math.min(100, rollingDiff));
    trend.push(rollingDiff);
  });

  if (trend.length === 0) {
    trend.push(0);
  }

  if (recentEvents.length > 0) {
    const recentWinsA = recentEvents.filter((e) => e.winner.team === 'A').length;
    const recentWinsB = recentEvents.length - recentWinsA;
    const diff = recentWinsA - recentWinsB;
    momentumVal = Math.round((diff / recentEvents.length) * 100);
  }

  const dominantTeam: Team | 'NEUTRAL' = momentumVal > 15 ? 'A' : momentumVal < -15 ? 'B' : 'NEUTRAL';

  // 5. Fatigue estimation from speed drops & match duration
  const totalRallies = events.length;
  const fatigueIndexA = Math.min(95, Math.round(totalRallies * 1.6 + (speedKmhA > 0 ? (30 / Math.max(10, speedKmhA)) * 5 : 10)));
  const fatigueIndexB = Math.min(95, Math.round(totalRallies * 1.6 + (speedKmhB > 0 ? (30 / Math.max(10, speedKmhB)) * 5 : 10)));

  let statusText = 'Evenly Contested';
  if (dominantTeam === 'A') statusText = 'Team A on a Surge';
  else if (dominantTeam === 'B') statusText = 'Team B on a Surge';
  if (scoreA >= 20 || scoreB >= 20) statusText = 'Critical Game Point';

  return {
    winProbabilityA: finalProbA,
    winProbabilityB: finalProbB,
    momentumScore: momentumVal,
    momentumTrend: trend,
    momentumDominantTeam: dominantTeam,
    fatigueIndexA,
    fatigueIndexB,
    statusText,
  };
}
