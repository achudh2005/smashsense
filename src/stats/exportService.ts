import { MatchAnalysisReport } from './matchStatsCalculator';
import { CompletedRally } from '../game/rallyStateMachine';

/**
 * Generates and downloads a complete CSV file of all match events and rallies
 */
export function exportMatchCSV(
  rallies: CompletedRally[],
  filename = 'SmashSense_Match_Data.csv'
): void {
  const headers = [
    'Rally Number',
    'Game Index',
    'Start Time',
    'Duration (s)',
    'Shot Count',
    'Winning Team',
    'Credited Player',
    'Point Type',
    'Ending Stroke',
    'Line Call',
    'Distance to Line (cm)',
    'Confidence (%)',
    'Is Uncertain Call',
    'Max Speed (km/h)',
    'Landing Zone',
    'Shot Direction',
  ];

  const rows = rallies.map((r) => [
    r.rallyNumber,
    r.gameIndex,
    new Date(r.startTime).toISOString(),
    r.durationSeconds,
    r.shotCount,
    r.winningTeam,
    r.creditedPlayer,
    r.pointType,
    r.endingStroke,
    r.lineCall.call,
    r.lineCall.distanceToLineCm,
    r.lineCall.confidencePercent,
    r.lineCall.isUncertain ? 'YES' : 'NO',
    r.maxSpeedKmh,
    r.lineCall.landingZone,
    r.flightMetrics.shotDirection,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a high-resolution 1200x630 shareable match infographic image card and triggers download
 */
export function exportMatchSummaryCard(
  analysis: MatchAnalysisReport,
  teamAName: string,
  teamBName: string,
  finalScoreText: string,
  filename = 'SmashSense_Match_Card.png'
): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 1200, 630);
  grad.addColorStop(0, '#020617');
  grad.addColorStop(0.5, '#0f172a');
  grad.addColorStop(1, '#022c22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 630);

  // Subtle court lines background pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 60, 1080, 510);
  ctx.strokeRect(160, 60, 880, 510);
  ctx.beginPath();
  ctx.moveTo(600, 60);
  ctx.lineTo(600, 570);
  ctx.stroke();

  // 2. Header Branding
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('🏸 SmashSense', 70, 80);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('LIVE MATCH ANALYTICS • VERIFIED BWF REPORT', 72, 110);

  // 3. Match Teams & Scores Block
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(70, 140, 1060, 140, 16);
  ctx.fill();
  ctx.stroke();

  // Team A
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(teamAName, 110, 205);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px monospace';
  ctx.fillText('TEAM A', 110, 240);

  // Score
  ctx.fillStyle = '#ffffff';
  ctx.font = 'black 54px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(finalScoreText, 600, 220);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#10b981';
  ctx.fillText('MATCH COMPLETED', 600, 250);

  // Team B
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(teamBName, 1090, 205);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px monospace';
  ctx.fillText('TEAM B', 1090, 240);

  // 4. MVP Highlight Card
  ctx.textAlign = 'left';
  const mvp = analysis.awards.find((a) => a.type === 'MVP') || analysis.awards[0];
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(70, 310, 510, 250, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('⭐ MATCH MVP', 100, 350);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(mvp ? mvp.playerName : 'MVP', 100, 395);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px sans-serif';
  const reasonText = mvp ? mvp.reason : '';
  wrapText(ctx, reasonText, 100, 435, 450, 24);

  // 5. Match Key Stats Grid
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(610, 310, 520, 250, 16);
  ctx.fill();
  ctx.stroke();

  const statItems = [
    { label: 'TOP SMASH SPEED', val: `${analysis.maxShuttleSpeedKmh} km/h`, color: '#facc15' },
    { label: 'LONGEST RALLY', val: `${analysis.longestRallyShots} shots (${analysis.longestRallyDurationSec}s)`, color: '#38bdf8' },
    { label: 'TOTAL RALLIES', val: `${analysis.totalRallies}`, color: '#ffffff' },
    { label: 'AVG SHUTTLE SPEED', val: `${analysis.avgShuttleSpeedKmh} km/h`, color: '#a7f3d0' },
  ];

  statItems.forEach((st, idx) => {
    const x = 640 + (idx % 2) * 240;
    const y = 370 + Math.floor(idx / 2) * 90;

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(st.label, x, y);

    ctx.fillStyle = st.color;
    ctx.font = 'bold 28px monospace';
    ctx.fillText(st.val, x, y + 36);
  });

  // Export to PNG Download
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

/**
 * Triggers standard browser print-to-PDF view for the executive match report
 */
export function printOrExportPDF(): void {
  window.print();
}
