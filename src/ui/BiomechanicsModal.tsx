import React, { useState, useRef, useEffect } from 'react';
import {
  BiomechanicsReport,
  calculateJointAngleDeg,
} from '../detection/biomechanicsAnalyzer';
import { X, Play, Pause, RotateCcw, Activity, Zap, ArrowUp, ChevronRight, Sparkles } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface BiomechanicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: BiomechanicsReport | null;
}

// MoveNet skeleton pairs for stick figure rendering
const SKELETON_CONNECTIONS: [number, number][] = [
  [5, 6], // shoulders
  [5, 7], [7, 9], // left arm
  [6, 8], [8, 10], // right arm
  [5, 11], [6, 12], // torso
  [11, 12], // hips
  [11, 13], [13, 15], // left leg
  [12, 14], [14, 16], // right leg
];

export const BiomechanicsModal: React.FC<BiomechanicsModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.25 | 0.5 | 1.0>(0.5);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && report) {
      setCurrentFrameIndex(report.contactFrameIndex);
      setIsPlaying(false);
    }
  }, [isOpen, report]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying || !report || report.frames.length === 0) return;

    const intervalMs = 33 / playbackSpeed;
    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (prev >= report.frames.length - 1) {
          setIsPlaying(false);
          return report.contactFrameIndex;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, report]);

  // Render pose skeleton on canvas
  useEffect(() => {
    if (!isOpen || !report || report.frames.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Dark sleek background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, W, H);

    // Subtle perspective ground line
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, H * 0.88);
    ctx.lineTo(W - 40, H * 0.88);
    ctx.stroke();

    const frame = report.frames[currentFrameIndex] || report.frames[report.contactFrameIndex];
    if (!frame) return;

    const kp = frame.keypoints;
    const isContactFrame = currentFrameIndex === report.contactFrameIndex;

    // Scale normalized keypoints to canvas
    const getPos = (idx: number) => {
      const p = kp[idx];
      if (!p) return { x: W / 2, y: H / 2 };
      return {
        x: p.x * W * 0.8 + W * 0.1,
        y: p.y * H * 0.75 + H * 0.1,
      };
    };

    // Draw Skeleton Bones
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    SKELETON_CONNECTIONS.forEach(([i1, i2]) => {
      const p1 = getPos(i1);
      const p2 = getPos(i2);

      // Highlight hitting arm (right arm 6->8->10 or left 5->7->9)
      const isHittingArm = (i1 === 6 && i2 === 8) || (i1 === 8 && i2 === 10);
      ctx.strokeStyle = isHittingArm ? '#38bdf8' : 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // Draw Joint Dots
    kp.forEach((_, idx) => {
      if (idx === 0 || idx >= 5) {
        const pt = getPos(idx);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 10 ? '#facc15' : '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#09090b';
        ctx.stroke();
      }
    });

    // Arm Extension Angle Arc at Elbow
    const sh = getPos(6);
    const el = getPos(8);
    const wr = getPos(10);
    const angle = calculateJointAngleDeg(sh, el, wr);

    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.arc(el.x, el.y, 22, 0, (angle * Math.PI) / 180);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillText(`${angle}°`, el.x + 26, el.y);
    ctx.restore();

    // Jump Clearance Marker on contact frame
    if (isContactFrame && report.jumpClearanceCm > 0) {
      const lAnkle = getPos(15);
      const rAnkle = getPos(16);
      const lowestAnkleY = Math.max(lAnkle.y, rAnkle.y);
      const groundY = H * 0.88;

      if (groundY > lowestAnkleY) {
        ctx.save();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);

        const midX = (lAnkle.x + rAnkle.x) / 2;
        ctx.beginPath();
        ctx.moveTo(midX, groundY);
        ctx.lineTo(midX, lowestAnkleY);
        ctx.stroke();

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
        ctx.fillText(`+${report.jumpClearanceCm} cm`, midX + 8, (groundY + lowestAnkleY) / 2);
        ctx.restore();
      }
    }

    // Contact Frame Badge
    if (isContactFrame) {
      ctx.fillStyle = 'rgba(234, 179, 8, 0.9)';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.fillText('SHUTTLE IMPACT APEX', 20, 30);
    }
  }, [isOpen, report, currentFrameIndex]);

  if (!isOpen || !report) return null;

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    haptics.selection();
  };

  const handleReset = () => {
    setCurrentFrameIndex(report.contactFrameIndex);
    setIsPlaying(false);
    haptics.light();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-lg animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">Smash Biomechanics & Kinematics</h2>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono text-[11px] font-bold">
                  {report.strokeType === 'jump_smash' ? 'JUMP SMASH' : 'STAND SMASH'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">Slow-motion 3D joint tracking & takeoff kinematics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-neutral-800">
          {/* Left Canvas Preview (7 cols) */}
          <div className="lg:col-span-7 p-5 flex flex-col items-center justify-center bg-neutral-950/80">
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-neutral-800 shadow-inner bg-neutral-900">
              <canvas
                ref={canvasRef}
                width={560}
                height={420}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Playback Controls & Frame Scrubber */}
            <div className="w-full mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Frame {currentFrameIndex + 1} / {report.frames.length || 90}</span>
                <span className="font-mono text-neutral-300">
                  {((currentFrameIndex / 30)).toFixed(2)}s
                </span>
              </div>

              <input
                type="range"
                min="0"
                max={Math.max(0, report.frames.length - 1)}
                value={currentFrameIndex}
                onChange={(e) => {
                  setCurrentFrameIndex(parseInt(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full accent-sky-500 bg-neutral-800 rounded-lg h-2 cursor-pointer"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    title="Jump to Contact Frame"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Speed buttons */}
                <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                  {([0.25, 0.5, 1.0] as const).map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                        playbackSpeed === spd
                          ? 'bg-sky-500 text-neutral-950'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Metrics Panel (5 cols) */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Kinematic Scorecard
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                  {report.biomechanicsScore} / 100
                </span>
              </div>

              {/* 4 Metric Badges Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                    Jump Clearance
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {report.jumpClearanceCm} <span className="text-xs font-normal text-neutral-400">cm</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Floor ankle elevation</div>
                </div>

                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    Contact Height
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {report.contactHeightMeters} <span className="text-xs font-normal text-neutral-400">m</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Apex reach from floor</div>
                </div>

                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Zap className="w-3.5 h-3.5 text-sky-400" />
                    Arm Extension
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {report.armExtensionAngleDeg}°
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Target: 165° – 180°</div>
                </div>

                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Activity className="w-3.5 h-3.5 text-rose-400" />
                    Forearm Pronation
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {report.shoulderElbowVelocityDegPerSec} <span className="text-xs font-normal text-neutral-400">°/s</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Rotational snap velocity</div>
                </div>
              </div>

              {/* Tactical Takeaways */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-2">
                <div className="text-xs font-semibold text-neutral-300">
                  Coaching & Biomechanics Insights
                </div>
                <div className="space-y-1.5">
                  {report.coachingTakeaways.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-neutral-400">
                      <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
