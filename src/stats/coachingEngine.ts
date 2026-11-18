import { MatchAnalysisReport, PlayerComprehensiveStats } from './matchStatsCalculator';
import { PlayerRole } from '../tracking/byteTrack';

export interface CoachingInsight {
  id: string;
  category: 'tactical' | 'stamina' | 'technique' | 'mental' | 'pairing';
  severity: 'positive' | 'tip' | 'warning' | 'critical';
  title: string;
  description: string;
  targetRole?: PlayerRole;
  targetPlayerName?: string;
  metricEvidence: string;
}

/**
 * Generates deterministic, plain-language rule-based coaching insights
 * from match analytics data without requiring any external network or AI model.
 */
export function generateRuleBasedInsights(report: MatchAnalysisReport): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const players = Object.values(report.players).filter((p): p is PlayerComprehensiveStats => Boolean(p));

  // 1. Long Rally & Stamina Analysis
  const teamAPlayers = players.filter((p) => p.role.startsWith('A'));
  const teamBPlayers = players.filter((p) => p.role.startsWith('B'));

  const teamALongWins = teamAPlayers.reduce((acc, p) => acc + p.pointsWonLongRally, 0);
  const teamBLongWins = teamBPlayers.reduce((acc, p) => acc + p.pointsWonLongRally, 0);
  const totalLongRallies = teamALongWins + teamBLongWins;

  if (totalLongRallies >= 4) {
    if (teamALongWins > teamBLongWins * 2) {
      insights.push({
        id: 'rally-endurance-a',
        category: 'stamina',
        severity: 'positive',
        title: 'Superior Rally Endurance',
        description: `${teamAPlayers[0]?.name || 'Team A'} controls extended exchanges, winning ${Math.round((teamALongWins / totalLongRallies) * 100)}% of rallies with 8+ shots.`,
        metricEvidence: `${teamALongWins}/${totalLongRallies} long rallies won`,
      });
    } else if (teamBLongWins > teamALongWins * 2) {
      insights.push({
        id: 'rally-endurance-b',
        category: 'tactical',
        severity: 'warning',
        title: 'Vulnerability in Extended Rallies',
        description: `${teamAPlayers[0]?.name || 'Team A'} loses most points in rallies longer than 8 shots. Consider attacking earlier or lifting higher to reset tempo.`,
        metricEvidence: `Lost ${teamBLongWins}/${totalLongRallies} long rallies`,
      });
    }
  }

  // 2. Per-Player Diagnostics
  for (const player of players) {
    // A. Drop Shot Reliability
    if (player.dropsAttempted >= 4) {
      const dropErrorRate = (player.dropErrors / player.dropsAttempted) * 100;
      if (dropErrorRate >= 40) {
        insights.push({
          id: `drop-errors-${player.role}`,
          category: 'technique',
          severity: 'warning',
          title: 'High Drop Shot Error Rate',
          description: `${player.name} misses ${Math.round(dropErrorRate)}% of drop attempts into the net or out. Focus on higher contact point and softer racket grip on touch.`,
          targetRole: player.role,
          targetPlayerName: player.name,
          metricEvidence: `${player.dropErrors} errors out of ${player.dropsAttempted} drop attempts`,
        });
      } else if (dropErrorRate <= 15 && player.dropsAttempted >= 6) {
        insights.push({
          id: `drop-mastery-${player.role}`,
          category: 'technique',
          severity: 'positive',
          title: 'Deadly Drop Shot Touch',
          description: `${player.name} is executing drops with exceptional ${Math.round(100 - dropErrorRate)}% consistency, forcing defensive lunges.`,
          targetRole: player.role,
          targetPlayerName: player.name,
          metricEvidence: `${player.dropsAttempted - player.dropErrors}/${player.dropsAttempted} successful drops`,
        });
      }
    }

    // B. Smash Efficiency vs Over-reliance
    if (player.smashesAttempted >= 5) {
      if (player.smashSuccessRate < 35) {
        insights.push({
          id: `smash-efficiency-${player.role}`,
          category: 'tactical',
          severity: 'tip',
          title: 'Smash Predictability',
          description: `${player.name} is converting only ${Math.round(player.smashSuccessRate)}% of smashes. Vary pace with slice cross drops and fast body drives to maintain surprise.`,
          targetRole: player.role,
          targetPlayerName: player.name,
          metricEvidence: `${player.smashesWon}/${player.smashesAttempted} smashes converted (${Math.round(player.smashSuccessRate)}% success)`,
        });
      } else if (player.smashSuccessRate >= 65) {
        insights.push({
          id: `smash-dominance-${player.role}`,
          category: 'tactical',
          severity: 'positive',
          title: 'Lethal Smash Attacking',
          description: `${player.name} dominates attack with ${Math.round(player.smashSuccessRate)}% smash conversion and top speed of ${player.topSmashSpeedKmh} km/h.`,
          targetRole: player.role,
          targetPlayerName: player.name,
          metricEvidence: `${player.smashesWon}/${player.smashesAttempted} winners (${player.topSmashSpeedKmh} km/h top)`,
        });
      }
    }

    // C. Net Play & Unforced Errors
    if (player.netErrors >= 3) {
      insights.push({
        id: `net-errors-${player.role}`,
        category: 'technique',
        severity: 'tip',
        title: 'Net Margin Under Pressure',
        description: `${player.name} conceded ${player.netErrors} points into the net. Give the tape 10-15 cm extra clearance when sliding to the front court.`,
        targetRole: player.role,
        targetPlayerName: player.name,
        metricEvidence: `${player.netErrors} net errors recorded`,
      });
    }

    // D. Service & Return Discipline
    if (player.serviceFaults >= 2) {
      insights.push({
        id: `service-faults-${player.role}`,
        category: 'mental',
        severity: 'warning',
        title: 'Free Service Faults Given',
        description: `${player.name} committed ${player.serviceFaults} service faults. Take a deliberate breath and stabilize the racket before serving.`,
        targetRole: player.role,
        targetPlayerName: player.name,
        metricEvidence: `${player.serviceFaults} service faults`,
      });
    }

    // E. Physical Fatigue Indicator
    if (player.fatigueIndexPercent >= 20) {
      insights.push({
        id: `fatigue-${player.role}`,
        category: 'stamina',
        severity: 'warning',
        title: 'Late Match Movement Deceleration',
        description: `${player.name}'s movement speed slowed by ${Math.round(player.fatigueIndexPercent)}% between early and late stages. Use intervals for deep breathing and maintain base split-steps.`,
        targetRole: player.role,
        targetPlayerName: player.name,
        metricEvidence: `${Math.round(player.fatigueIndexPercent)}% drop in movement velocity`,
      });
    }

    // F. Base Recovery
    if (player.avgRecoveryTimeSec > 1.8) {
      insights.push({
        id: `recovery-lag-${player.role}`,
        category: 'stamina',
        severity: 'tip',
        title: 'Recovery to Base Position Lag',
        description: `${player.name} averages ${player.avgRecoveryTimeSec.toFixed(1)}s to return to centre court. Push off dynamically after lunges to prevent being caught out on the next return.`,
        targetRole: player.role,
        targetPlayerName: player.name,
        metricEvidence: `${player.avgRecoveryTimeSec.toFixed(1)}s average recovery latency`,
      });
    }
  }

  // 3. Pressure Point Performance
  if (report.pressureStats.totalPressurePoints >= 4) {
    const rateA = Math.round(report.pressureStats.pressureWinRateA);
    const rateB = Math.round(report.pressureStats.pressureWinRateB);
    if (rateA >= 65) {
      insights.push({
        id: 'clutch-a',
        category: 'mental',
        severity: 'positive',
        title: 'Ice in the Veins at 18-18+',
        description: `${teamAPlayers[0]?.name || 'Team A'} excels in clutch situations, winning ${rateA}% of pressure points at 18-18 and deuce.`,
        metricEvidence: `${report.pressureStats.pointsWonTeamA}/${report.pressureStats.totalPressurePoints} clutch points won`,
      });
    } else if (rateB >= 65) {
      insights.push({
        id: 'clutch-b',
        category: 'mental',
        severity: 'warning',
        title: 'High-Pressure Decision Making',
        description: `${teamAPlayers[0]?.name || 'Team A'} struggles in late-game pressure (converted only ${rateA}% vs ${rateB}%). Stick to high-percentage deep clears rather than risky lines.`,
        metricEvidence: `${report.pressureStats.pointsWonTeamB}/${report.pressureStats.totalPressurePoints} pressure points won by opponent`,
      });
    }
  }

  // 4. Doubles Rotation Synergy (if applicable)
  if (report.doublesAnalysis?.teamA) {
    const teamA = report.doublesAnalysis.teamA;
    if (teamA.rotationEfficiencyPercent < 50) {
      insights.push({
        id: 'doubles-rotation-a',
        category: 'pairing',
        severity: 'warning',
        title: 'Doubles Rotation Bottleneck',
        description: `${teamA.partnerNames} have ${Math.round(teamA.rotationEfficiencyPercent)}% rotation efficiency. Clarify front/back attacking formation versus side-by-side defense assignments.`,
        metricEvidence: `${Math.round(teamA.rotationEfficiencyPercent)}% rotation synergy`,
      });
    }
  }

  return insights;
}

/**
 * Optional LLM Coaching Summary via user-provided API key.
 * Strictly sends JSON statistical summaries (ZERO video/images).
 */
export async function generateLLMCoachingSummary(
  report: MatchAnalysisReport,
  apiKey: string,
  modelName: string = 'gemini-1.5-flash'
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Please configure a valid Gemini API Key in Settings to generate AI coaching advice.');
  }

  const ruleInsights = generateRuleBasedInsights(report);
  const playersSummary = Object.values(report.players).map((p) => ({
    name: p.name,
    role: p.role,
    pointsWon: p.pointsWon,
    winners: p.winners,
    unforcedErrors: p.unforcedErrors,
    smashSuccessRate: `${Math.round(p.smashSuccessRate)}% (${p.topSmashSpeedKmh} km/h top)`,
    dropErrors: p.dropErrors,
    fatigueDrop: `${Math.round(p.fatigueIndexPercent)}%`,
    avgRecoverySec: p.avgRecoveryTimeSec.toFixed(1),
  }));

  const prompt = `You are an elite BWF World-Tour Badminton Coach. Analyze these client-side match statistics (NO video data exists) and provide a concise, high-impact tactical and physical coaching report with 3 actionable training recommendations.

Match Metrics:
- Total Rallies: ${report.totalRallies}
- Longest Rally: ${report.longestRallyShots} shots
- Top Shuttle Speed: ${report.maxShuttleSpeedKmh} km/h
- Pressure Points Played: ${report.pressureStats.totalPressurePoints}
- Players Summary:
${JSON.stringify(playersSummary, null, 2)}

Key Statistical Anomalies:
${ruleInsights.map((i) => `• [${i.category.toUpperCase()}] ${i.title}: ${i.description} (${i.metricEvidence})`).join('\n')}

Format your response cleanly in Markdown:
1. Match Summary (2 sentences)
2. Tactical Strengths & Exploitable Weaknesses
3. Specific Next-Session Drills (3 practical drills with repetitions)`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 800,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gemini API request failed with status ${response.status}`
    );
  }

  const data = await response.json();
  const coachingText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!coachingText) {
    throw new Error('No coaching summary was generated by the model.');
  }

  return coachingText;
}
