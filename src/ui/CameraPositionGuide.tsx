import React from 'react';
import { Camera, CheckCircle2, ShieldCheck, Video } from 'lucide-react';

export const CameraPositionGuide: React.FC = () => {
  return (
    <div className="space-y-4 text-slate-200">
      <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="text-emerald-400 w-6 h-6 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-emerald-200 text-sm">Privacy Guarantee: Zero Video Stored or Uploaded</p>
          <p className="text-emerald-300/80">
            SmashSense processes every camera frame 100% locally in your browser with Web Workers. Only mathematical data (coordinates, speeds, scores) is retained in IndexedDB.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recommended: Behind Baseline */}
        <div className="bg-slate-900 border border-emerald-500/50 rounded-xl p-4 space-y-3 relative overflow-hidden">
          <div className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
            RECOMMENDED
          </div>
          <div className="flex items-center gap-2">
            <Camera className="text-emerald-400 w-5 h-5" />
            <h4 className="font-semibold text-sm text-slate-100">Behind Baseline (Elevated)</h4>
          </div>
          <p className="text-xs text-slate-300">
            Mount tripod <strong>2 to 3 meters</strong> directly behind one baseline, elevated <strong>1.8m – 2.5m</strong> high, tilted downward 15°–20°.
          </p>
          {/* Illustrated SVG Diagram */}
          <div className="w-full h-36 bg-slate-950 rounded-lg p-2 flex items-center justify-center border border-slate-800">
            <svg viewBox="0 0 280 120" className="w-full h-full">
              {/* Ground line */}
              <line x1="10" y1="100" x2="270" y2="100" stroke="#334155" strokeWidth="2" />
              {/* Court rectangle in perspective */}
              <polygon points="60,95 240,95 210,50 90,50" fill="#14532d" stroke="#16a34a" strokeWidth="1.5" />
              {/* Net in center */}
              <line x1="75" y1="72" x2="225" y2="72" stroke="#ef4444" strokeWidth="2" />
              {/* Tripod behind court */}
              <line x1="20" y1="100" x2="35" y2="40" stroke="#94a3b8" strokeWidth="2" />
              <line x1="50" y1="100" x2="35" y2="40" stroke="#94a3b8" strokeWidth="2" />
              {/* Camera Icon */}
              <circle cx="35" cy="38" r="7" fill="#10b981" />
              {/* FOV Cone */}
              <polygon points="35,38 70,30 255,95 50,98" fill="rgba(16, 185, 129, 0.15)" stroke="rgba(16, 185, 129, 0.4)" strokeDasharray="3 3" />
              <text x="35" y="24" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">Tripod ~2m</text>
              <text x="150" y="75" fill="#f8fafc" fontSize="8" textAnchor="middle">Full Court View</text>
            </svg>
          </div>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>Captures both players and full shuttlecock trajectory height</li>
            <li>Minimizes player-on-player occlusion</li>
          </ul>
        </div>

        {/* Alternative: Elevated Side Angle */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Video className="text-sky-400 w-5 h-5" />
            <h4 className="font-semibold text-sm text-slate-100">Elevated Side Angle</h4>
          </div>
          <p className="text-xs text-slate-300">
            For venues with no space behind baselines. Place camera <strong>2m – 4m</strong> beside the net post, elevated <strong>2.0m+</strong> looking diagonal.
          </p>
          <div className="w-full h-36 bg-slate-950 rounded-lg p-2 flex items-center justify-center border border-slate-800">
            <svg viewBox="0 0 280 120" className="w-full h-full">
              <line x1="10" y1="100" x2="270" y2="100" stroke="#334155" strokeWidth="2" />
              <polygon points="30,85 180,85 240,40 110,40" fill="#14532d" stroke="#16a34a" strokeWidth="1.5" />
              <line x1="85" y1="85" x2="165" y2="40" stroke="#ef4444" strokeWidth="2" />
              <line x1="240" y1="100" x2="250" y2="45" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="250" cy="43" r="6" fill="#38bdf8" />
              <polygon points="250,43 25,85 190,40" fill="rgba(56, 189, 248, 0.15)" stroke="rgba(56, 189, 248, 0.4)" strokeDasharray="3 3" />
              <text x="250" y="30" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">Side View</text>
            </svg>
          </div>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>Great for side-to-side smashes & line calls</li>
            <li>Slightly more prone to occlusion when players cross</li>
          </ul>
        </div>
      </div>

      {/* Pro Tips checklist */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
        <h5 className="font-semibold text-slate-100 text-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Pre-Match Setup Checklist:
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Turn phone to <strong>Landscape mode</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Enable <strong>Screen Wake Lock</strong> (screen stays on)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Ensure all <strong>4 court corners</strong> are visible</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Clean the camera lens for optimal shuttle tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
};
