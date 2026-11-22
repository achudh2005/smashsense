/**
 * Shareable Story Card & Match Poster Generator
 * Renders high-resolution 1080x1920 (9:16 vertical) Strava/Spotify Wrapped-style graphic posters
 * directly on offscreen HTML5 Canvas for Instagram, WhatsApp, and social sharing.
 */

export interface StoryCardOptions {
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  gamesList?: string[];
  topSmashSpeedKmh: number;
  longestRallyShots: number;
  totalDistanceMeters: number;
  matchDurationMinutes: number;
  mvpPlayerName: string;
  mvpReason: string;
  winnersCount: number;
  unforcedErrorsCount: number;
  landingPoints?: Array<{ x: number; y: number; isWinner: boolean }>;
  dateString?: string;
}

/**
 * Renders the 1080x1920 vertical story card onto an offscreen canvas and returns a PNG Blob
 */
export async function renderStoryCardToBlob(options: StoryCardOptions): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const W = canvas.width;
  const H = canvas.height;

  // 1. Dynamic Athletic Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#020617'); // Slate 950
  bgGrad.addColorStop(0.35, '#0f172a'); // Slate 900
  bgGrad.addColorStop(0.75, '#090d16');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Background subtle angled court geometry lines
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
  ctx.lineWidth = 2;
  for (let i = -W; i < W * 2; i += 120) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 400, H);
    ctx.stroke();
  }
  ctx.restore();

  // 2. SmashSense Header Brand Badge
  ctx.save();
  // Brand Pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - 160, 90, 320, 54, 27);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('🏸 SMASHSENSE AI', W / 2, 126);

  // Date & Duration Subheader
  const dateStr = options.dateString || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${dateStr} • ${options.matchDurationMinutes} MIN MATCH`, W / 2, 180);
  ctx.restore();

  // 3. Central Big Match Score Card
  ctx.save();
  const cardX = 80;
  const cardY = 230;
  const cardW = W - 160;
  const cardH = 340;

  // Glass card background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Team Names
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#38bdf8'; // Sky 400
  ctx.textAlign = 'left';
  ctx.fillText(options.teamAName.toUpperCase(), cardX + 48, cardY + 80);

  ctx.fillStyle = '#fb923c'; // Orange 400
  ctx.textAlign = 'right';
  ctx.fillText(options.teamBName.toUpperCase(), cardX + cardW - 48, cardY + 80);

  // Scores
  ctx.font = '900 108px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(options.scoreA.toString(), cardX + 48, cardY + 200);

  ctx.textAlign = 'right';
  ctx.fillText(options.scoreB.toString(), cardX + cardW - 48, cardY + 200);

  // Center Dash
  ctx.font = '700 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.textAlign = 'center';
  ctx.fillText('—', W / 2, cardY + 185);

  // Games breakdown pills if provided
  if (options.gamesList && options.gamesList.length > 0) {
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(options.gamesList.join('   •   '), W / 2, cardY + 280);
  }
  ctx.restore();

  // 4. MVP Highlight Card
  ctx.save();
  const mvpY = 610;
  ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
  ctx.beginPath();
  ctx.roundRect(80, mvpY, W - 160, 140, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#4ade80';
  ctx.textAlign = 'left';
  ctx.fillText('⭐ MATCH MVP', 120, mvpY + 48);

  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(options.mvpPlayerName, 120, mvpY + 92);

  ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#86efac';
  ctx.fillText(options.mvpReason, 120, mvpY + 120);
  ctx.restore();

  // 5. 2x2 Metric Badges Grid
  const gridY = 790;
  const colW = (W - 160 - 30) / 2;
  const rowH = 180;

  const metrics = [
    { label: 'TOP SMASH SPEED', val: `${options.topSmashSpeedKmh} KM/H`, icon: '⚡', color: '#facc15' },
    { label: 'LONGEST RALLY', val: `${options.longestRallyShots} SHOTS`, icon: '🔥', color: '#f97316' },
    { label: 'DISTANCE RUN', val: `${(options.totalDistanceMeters / 1000).toFixed(2)} KM`, icon: '🏃', color: '#38bdf8' },
    { label: 'WINNERS / ERRORS', val: `${options.winnersCount} / ${options.unforcedErrorsCount}`, icon: '🎯', color: '#a855f7' },
  ];

  metrics.forEach((m, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const mx = 80 + col * (colW + 30);
    const my = gridY + row * (rowH + 24);

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.roundRect(mx, my, colW, rowH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(m.label, mx + 28, my + 44);

    ctx.font = '900 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = m.color;
    ctx.fillText(m.val, mx + 28, my + 110);
    ctx.restore();
  });

  // 6. Mini 2D Court Heatmap Illustration
  ctx.save();
  const courtCardY = 1220;
  const courtCardH = 460;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.beginPath();
  ctx.roundRect(80, courtCardY, W - 160, courtCardH, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'left';
  ctx.fillText('COURT SHUTTLE IMPACT DISTRIBUTION', 116, courtCardY + 48);

  // Draw 2D Top-Down Court Graphic
  const courtW = 480;
  const courtH = 320;
  const cx = W / 2 - courtW / 2;
  const cy = courtCardY + 90;

  // Court floor
  ctx.fillStyle = '#047857';
  ctx.fillRect(cx, cy, courtW, courtH);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(cx, cy, courtW, courtH);

  // Net line
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy + courtH / 2);
  ctx.lineTo(cx + courtW, cy + courtH / 2);
  ctx.stroke();

  // Singles sidelines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx + 36, cy, courtW - 72, courtH);

  // Simulated / Real Winning Landing Heatmap Dots
  const points = options.landingPoints && options.landingPoints.length > 0
    ? options.landingPoints
    : [
        { x: 0.35, y: 0.25, isWinner: true },
        { x: 0.65, y: 0.28, isWinner: true },
        { x: 0.22, y: 0.82, isWinner: true },
        { x: 0.78, y: 0.78, isWinner: true },
        { x: 0.48, y: 0.42, isWinner: false },
        { x: 0.52, y: 0.65, isWinner: true },
        { x: 0.28, y: 0.15, isWinner: true },
      ];

  points.forEach((pt) => {
    const px = cx + (pt.x <= 1 ? pt.x * courtW : courtW / 2 + (pt.x / 6.1) * courtW);
    const py = cy + (pt.y <= 1 ? pt.y * courtH : (pt.y / 13.4) * courtH);

    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fillStyle = pt.isWinner ? 'rgba(250, 204, 21, 0.9)' : 'rgba(239, 68, 68, 0.8)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  ctx.restore();

  // 7. Footer Guarantee
  ctx.save();
  ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.fillText('SmashSense • On-Device Computer Vision & AI Telemetry', W / 2, 1750);
  ctx.font = '400 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.fillText('Zero Video Uploaded • 100% Client-Side Private Processing', W / 2, 1780);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/png');
  });
}

/**
 * Trigger download of Story Card PNG file
 */
export function downloadStoryCardPng(blob: Blob, filename = 'smashsense-match-story.png'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Web Share API for native mobile sharing (Instagram Stories, WhatsApp, iMessage)
 */
export async function shareStoryCard(blob: Blob, title = 'SmashSense Match Highlights'): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    const file = new File([blob], 'smashsense-story.png', { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title,
          text: 'Check out my live badminton match telemetry tracked with SmashSense AI!',
        });
        return true;
      } catch {
        return false;
      }
    }
  }
  // Fallback to download
  downloadStoryCardPng(blob);
  return false;
}
