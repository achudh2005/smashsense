import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  HawkEyeReplayData,
  createChalkParticles,
  ChalkParticle,
} from '../replay/virtualHawkEyeReplay';
import { X, RotateCcw, Crosshair, Sparkles } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface HawkEyeReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  replayData: HawkEyeReplayData | null;
}

export const HawkEyeReplayModal: React.FC<HawkEyeReplayModalProps> = ({
  isOpen,
  onClose,
  replayData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const particlesRef = useRef<ChalkParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startAnimation = useCallback(() => {
    setIsPlaying(true);
    setShowBanner(false);
    particlesRef.current = [];
    startTimeRef.current = null;
    haptics.medium();
  }, []);

  useEffect(() => {
    if (isOpen && replayData) {
      startAnimation();
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, replayData, startAnimation]);

  // Canvas render loop
  useEffect(() => {
    if (!isOpen || !replayData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localParticles = particlesRef.current;
    const isCallIn = replayData.call === 'IN';
    const marginMm = replayData.marginMm;

    const render = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const totalDuration = 2800; // ms

      const t = Math.min(1.0, elapsed / totalDuration);

      // Trigger impact at t = 0.75 (~2100ms)
      if (t >= 0.75 && localParticles.length === 0) {
        const impactScreenX = canvas.width / 2 + (isCallIn ? -marginMm * 3 : marginMm * 3);
        const impactScreenY = canvas.height * 0.62;
        localParticles = createChalkParticles(impactScreenX, impactScreenY, 32);
        particlesRef.current = localParticles;
        haptics.success();
      }

      if (t >= 0.92) {
        setShowBanner(true);
      }

      // DRAW CANVAS
      const W = canvas.width;
      const H = canvas.height;

      // 1. Perspective Court Floor (BWF Olympic Green with slight perspective grid)
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#064e3b'); // Dark green far away
      grad.addColorStop(1, '#047857'); // Vibrant green foreground
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Grid lines for court texture
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      // 2. The Boundary Line (40mm official BWF line)
      const lineCenterX = W / 2;
      const lineWidthPx = 70; // Zoomed-in 40mm line in pixels

      // Line shadow / bevel
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(lineCenterX - lineWidthPx / 2 - 2, 0, lineWidthPx + 4, H);

      // White boundary line
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lineCenterX - lineWidthPx / 2, 0, lineWidthPx, H);

      // Line boundary label
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(replayData.lineName.toUpperCase(), 24, 36);

      // 3. Impact Position & Distance Measurement Ruler
      // IN landing base touches or inside line; OUT landing base clears outer edge
      const lineEdgeX = isCallIn ? lineCenterX - lineWidthPx / 2 : lineCenterX + lineWidthPx / 2;
      const offsetPixels = isCallIn
        ? -(marginMm * 2.2)
        : (lineWidthPx / 2) + (marginMm * 2.2);

      const impactX = lineCenterX + (isCallIn ? -offsetPixels * 0.5 : offsetPixels);
      const impactY = H * 0.62;

      // Parabolic flight arc
      const arcT = Math.min(1.0, t / 0.75); // reaches floor at t=0.75
      const startX = impactX - 240;
      const startY = impactY - 320;

      // Current shuttle position along arc
      const curX = startX + (impactX - startX) * arcT;
      const curY = startY + (impactY - startY) * arcT * arcT;
      const curZ = Math.max(0, 1.0 - arcT);

      // Glowing Trajectory Trace
      ctx.save();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)'; // Yellow glowing arc
      ctx.lineWidth = 3;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      for (let step = 0; step <= 30; step++) {
        const st = (step / 30) * arcT;
        const px = startX + (impactX - startX) * st;
        const py = startY + (impactY - startY) * st * st;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      // Shuttle Floor Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      const shadowRadius = 14 + (1 - curZ) * 8;
      ctx.ellipse(curX, impactY, shadowRadius, shadowRadius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Shuttlecock Rendering
      ctx.save();
      ctx.translate(curX, curY);

      if (t >= 0.75) {
        // Base Compression Oval upon contact
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 15, 0, 0, Math.PI * 2);
        ctx.fillStyle = isCallIn ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Contact crosshair
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-28, 0);
        ctx.lineTo(28, 0);
        ctx.moveTo(0, -18);
        ctx.lineTo(0, 18);
        ctx.stroke();
      } else {
        // Flying Shuttlecock 3D model representation
        ctx.rotate(0.35);

        // Skirt (feathers)
        ctx.beginPath();
        ctx.moveTo(-18, -36);
        ctx.lineTo(18, -36);
        ctx.lineTo(10, 0);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cork Base
        ctx.beginPath();
        ctx.ellipse(0, 4, 10, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a'; // Natural cork color
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.stroke();
      }
      ctx.restore();

      // 5. Chalk Dust Particles
      if (localParticles.length > 0) {
        ctx.save();
        for (const p of localParticles) {
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
          p.alpha = Math.max(0, p.life / p.maxLife);

          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.75})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 6. Millimeter Dimension Measurement Arrow (when ball lands)
      if (t >= 0.75) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);

        // Draw dimension ruler line from line edge to impact point
        ctx.beginPath();
        ctx.moveTo(lineEdgeX, impactY + 36);
        ctx.lineTo(impactX, impactY + 36);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ticks at ends
        ctx.beginPath();
        ctx.moveTo(lineEdgeX, impactY + 28);
        ctx.lineTo(lineEdgeX, impactY + 44);
        ctx.moveTo(impactX, impactY + 28);
        ctx.lineTo(impactX, impactY + 44);
        ctx.stroke();

        // Measurement Text
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
        const distText = `${marginMm} mm`;
        const textWidth = ctx.measureText(distText).width;
        const textCenter = (lineEdgeX + impactX) / 2;
        ctx.fillText(distText, textCenter - textWidth / 2, impactY + 58);

        ctx.restore();
      }

      if (t < 1.0) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        setIsPlaying(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, replayData]);

  if (!isOpen || !replayData) return null;

  const isCallIn = replayData.call === 'IN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-lg animate-fadeIn">
      <div className="relative w-full max-w-3xl flex flex-col rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden text-white">
        {/* Top Broadcast Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 text-xs font-black tracking-wider uppercase">
              <Crosshair className="w-3.5 h-3.5" />
              HAWK-EYE 3D
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-200">Official Line Review</span>
              <span className="mx-2 text-neutral-600">•</span>
              <span className="text-xs text-neutral-400 font-mono">
                {replayData.shuttleSpeedKmh} km/h • {Math.round(replayData.confidence * 100)}% Confidence
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Replay Canvas Area */}
        <div className="relative w-full h-80 sm:h-96 bg-black flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={768}
            height={384}
            className="w-full h-full object-cover"
          />

          {/* Dramatic Decision Banner */}
          {showBanner && (
            <div
              className={`absolute top-6 px-8 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl animate-scaleIn flex flex-col items-center gap-0.5 ${
                isCallIn
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-emerald-950/80'
                  : 'bg-rose-950/90 border-rose-500/50 text-rose-300 shadow-rose-950/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 animate-spin" />
                <span className="text-2xl sm:text-3xl font-black tracking-widest uppercase">
                  {replayData.call}
                </span>
              </div>
              <span className="text-xs font-bold tracking-tight text-white/90">
                {isCallIn ? `Inside line by ${replayData.marginMm} mm` : `Over line by ${replayData.marginMm} mm`}
              </span>
            </div>
          )}

          {/* Watermark */}
          <div className="absolute bottom-3 left-4 text-[10px] font-mono text-white/40 tracking-widest uppercase pointer-events-none">
            SMASHSENSE HAWK-EYE TELEMETRY
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <button
              onClick={startAnimation}
              disabled={isPlaying}
              className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Replay Hawk-Eye
            </button>

            <span className="text-xs text-neutral-500">
              {isPlaying ? 'Evaluating trajectory...' : 'Decision Confirmed'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors"
          >
            Accept Call
          </button>
        </div>
      </div>
    </div>
  );
};
