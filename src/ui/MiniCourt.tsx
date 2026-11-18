import React, { useRef, useEffect } from 'react';
import { BWF_COURT, getStandardCourtLines } from '../court/courtGeometry';
import { useSmashSenseStore } from '../game/gameState';
import { Maximize2, Minimize2 } from 'lucide-react';

interface MiniCourtProps {
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const MiniCourt: React.FC<MiniCourtProps> = ({
  className = '',
  isExpanded = false,
  onToggleExpand,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackedPlayers = useSmashSenseStore((s) => s.trackedPlayers);
  const shuttleTrack = useSmashSenseStore((s) => s.shuttleTrack);

  const courtLines = getStandardCourtLines();

  // Court dimensions
  const courtW = BWF_COURT.widthDoubles; // 6.10m
  const courtH = BWF_COURT.length;       // 13.40m

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Padding inside canvas
    const padX = width * 0.1;
    const padY = height * 0.08;
    const drawW = width - padX * 2;
    const drawH = height - padY * 2;

    const scaleX = drawW / courtW;
    const scaleY = drawH / courtH;

    // Coordinate conversion from court meters (0..6.1, 0..13.4) to mini-court canvas pixels
    const toCanvasX = (mx: number) => padX + mx * scaleX;
    const toCanvasY = (my: number) => padY + my * scaleY;

    // 1. Clear background
    ctx.clearRect(0, 0, width, height);

    // 2. Draw Court Floor
    ctx.fillStyle = '#14532d'; // BWF Green Mat
    ctx.fillRect(padX, padY, drawW, drawH);

    // 3. Draw Court Boundary & Internal Lines
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';

    for (const line of courtLines) {
      const x1 = toCanvasX(line.from.x);
      const y1 = toCanvasY(line.from.y);
      const x2 = toCanvasX(line.to.x);
      const y2 = toCanvasY(line.to.y);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (line.isNet) {
        ctx.strokeStyle = '#ef4444'; // Red net
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
      } else {
        ctx.stroke();
      }
    }

    // 4. Draw Player Movement Trails & Current Positions
    for (const player of trackedPlayers) {
      if (!player.courtPosition) continue;

      const isTeamA = player.team === 'A';
      const color = isTeamA ? '#38bdf8' : '#f97316';
      const glowColor = isTeamA ? 'rgba(56, 189, 248, 0.4)' : 'rgba(249, 115, 22, 0.4)';

      // Draw movement trail
      if (player.movementTrail && player.movementTrail.length > 1) {
        ctx.beginPath();
        const start = player.movementTrail[0];
        ctx.moveTo(toCanvasX(start.x), toCanvasY(start.y));
        for (let i = 1; i < player.movementTrail.length; i++) {
          const pt = player.movementTrail[i];
          ctx.lineTo(toCanvasX(pt.x), toCanvasY(pt.y));
        }
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const px = toCanvasX(player.courtPosition.x);
      const py = toCanvasY(player.courtPosition.y);

      // Outer glow circle
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.fill();

      // Inner player circle
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Role tag (e.g. A1, B1)
      const roleText = player.assignedRole || (isTeamA ? 'A' : 'B');
      ctx.font = 'bold 9px ui-monospace, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(roleText, px, py - 13);
    }

    // 5. Draw Shuttlecock 2D position and trail
    if (shuttleTrack && shuttleTrack.trail && shuttleTrack.trail.length > 0) {
      // Trail
      if (shuttleTrack.trail.length > 1) {
        ctx.beginPath();
        let started = false;
        for (const pt of shuttleTrack.trail) {
          if (pt.court) {
            const sx = toCanvasX(pt.court.x);
            const sy = toCanvasY(pt.court.y);
            if (!started) {
              ctx.moveTo(sx, sy);
              started = true;
            } else {
              ctx.lineTo(sx, sy);
            }
          }
        }
        ctx.strokeStyle = shuttleTrack.isSmash ? 'rgba(239, 68, 68, 0.8)' : 'rgba(250, 204, 21, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Head
      const latestCourt = shuttleTrack.currentCourt || (shuttleTrack.trail[shuttleTrack.trail.length - 1].court);
      if (latestCourt) {
        const sx = toCanvasX(latestCourt.x);
        const sy = toCanvasY(latestCourt.y);

        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fillStyle = shuttleTrack.isSmash ? '#ef4444' : '#facc15';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [trackedPlayers, shuttleTrack, courtLines, courtW, courtH]);

  const canvasWidth = isExpanded ? 260 : 160;
  const canvasHeight = isExpanded ? 520 : 320;

  return (
    <div
      className={`relative bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/60 shadow-2xl p-2.5 transition-all select-none ${className}`}
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs text-slate-300">
        <span className="font-semibold tracking-wide flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          2D Top-Down Radar
        </span>
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="rounded-lg shadow-inner bg-slate-950 border border-emerald-950"
        />
      </div>

      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span>Team A</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>Team B</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span>Shuttle</span>
        </div>
      </div>
    </div>
  );
};
