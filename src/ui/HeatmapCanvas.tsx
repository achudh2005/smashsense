import React, { useRef, useEffect } from 'react';
import { BWF_COURT, getStandardCourtLines, Point2D } from '../court/courtGeometry';

interface HeatmapCanvasProps {
  type: 'players' | 'landings' | 'smashes' | 'errors';
  playerPositions?: Array<{ x: number; y: number; weight: number }>;
  shuttleLandings?: Array<{ x: number; y: number; call: string; speed: number }>;
  smashVectors?: Array<{ from: Point2D; to: Point2D; speed: number; direction: 'straight' | 'cross' }>;
  errorLocations?: Array<{ x: number; y: number; type: string }>;
  width?: number;
  height?: number;
}

export const HeatmapCanvas: React.FC<HeatmapCanvasProps> = ({
  type,
  playerPositions = [],
  shuttleLandings = [],
  smashVectors = [],
  errorLocations = [],
  width = 300,
  height = 540,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const courtLines = getStandardCourtLines();

  const courtW = BWF_COURT.widthDoubles; // 6.10m
  const courtH = BWF_COURT.length;       // 13.40m

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padX = width * 0.08;
    const padY = height * 0.06;
    const drawW = width - padX * 2;
    const drawH = height - padY * 2;

    const toX = (mx: number) => padX + (mx / courtW) * drawW;
    const toY = (my: number) => padY + (my / courtH) * drawH;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Court background
    ctx.fillStyle = '#0f3822';
    ctx.fillRect(padX, padY, drawW, drawH);

    // Court wireframe lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.2;

    for (const line of courtLines) {
      ctx.beginPath();
      ctx.moveTo(toX(line.from.x), toY(line.from.y));
      ctx.lineTo(toX(line.to.x), toY(line.to.y));

      if (line.isNet) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
      } else {
        ctx.stroke();
      }
    }

    // Render by type
    if (type === 'players') {
      // Radial glow gradient for each position
      for (const pt of playerPositions) {
        const cx = toX(pt.x);
        const cy = toY(pt.y);

        const radGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18);
        radGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
        radGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
        radGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'landings') {
      for (const pt of shuttleLandings) {
        const cx = toX(pt.x);
        const cy = toY(pt.y);
        const isCallIn = pt.call === 'IN';

        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = isCallIn ? '#10b981' : '#f43f5e';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (type === 'smashes') {
      for (const sm of smashVectors) {
        const x1 = toX(sm.from.x);
        const y1 = toY(sm.from.y);
        const x2 = toX(sm.to.x);
        const y2 = toY(sm.to.y);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = sm.direction === 'cross' ? '#f59e0b' : '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - 8 * Math.cos(angle - Math.PI / 6), y2 - 8 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - 8 * Math.cos(angle + Math.PI / 6), y2 - 8 * Math.sin(angle + Math.PI / 6));
        ctx.fillStyle = sm.direction === 'cross' ? '#f59e0b' : '#38bdf8';
        ctx.fill();
      }
    } else if (type === 'errors') {
      for (const err of errorLocations) {
        const cx = toX(err.x);
        const cy = toY(err.y);

        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // X mark
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 3);
        ctx.lineTo(cx + 3, cy + 3);
        ctx.moveTo(cx + 3, cy - 3);
        ctx.lineTo(cx - 3, cy + 3);
        ctx.stroke();
      }
    }
  }, [type, playerPositions, shuttleLandings, smashVectors, errorLocations, courtLines, width, height, courtW, courtH]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-xl border border-slate-700 bg-slate-950 shadow-inner"
      />
    </div>
  );
};
