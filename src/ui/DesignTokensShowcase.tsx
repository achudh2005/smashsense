import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BrandLogo } from './BrandLogo';
import { triggerHaptic } from '../utils/haptics';
import {
  X,
  Sparkles,
  ShieldCheck,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Terminal,
} from 'lucide-react';

interface DesignTokensShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesignTokensShowcase: React.FC<DesignTokensShowcaseProps> = ({ isOpen, onClose }) => {
  const [hapticFeedback, setHapticFeedback] = useState<string>('Tap a button to test haptics');

  if (!isOpen) return null;

  const testHaptic = (type: 'light' | 'medium' | 'success' | 'warning' | 'selection') => {
    triggerHaptic(type);
    setHapticFeedback(`Triggered: ${type} (${typeof navigator !== 'undefined' && 'vibrate' in navigator ? 'vibrated' : 'emulated'})`);
  };

  return (
    <div
      role="dialog"
      aria-label="Apple Design System Showcase"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900/90 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <BrandLogo size={28} showText={false} />
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Design System &amp; Tokens</h2>
              <p className="text-xs text-slate-400">Apple Human Interface Guidelines &amp; Typography Specs</p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Showcase Body */}
        <div className="p-6 overflow-y-auto space-y-8 text-sm">
          {/* 1. Typography & Numerals */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Terminal size={14} className="text-emerald-400" />
              <span>1. Typography Scale &amp; Tabular Numerals</span>
            </h3>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
              <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                <span className="text-xs text-slate-400">SF Pro Display / Large Title (32px)</span>
                <span className="text-2xl font-bold tracking-tight text-white font-mono">Game 3: Match Point</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                <span className="text-xs text-slate-400">Title 2 (20px)</span>
                <span className="text-lg font-semibold tracking-tight text-slate-200">Rally State Machine</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                <span className="text-xs text-slate-400">Body &amp; Callout (14px)</span>
                <span className="text-sm font-normal text-slate-300">Direct Linear Transformation Homography</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Tabular Numbers (tnum, zero-jitter)</span>
                <span className="text-base font-mono tabular-nums text-emerald-400 font-bold">
                  21 - 19 | 60.0 FPS | 18ms
                </span>
              </div>
            </div>
          </section>

          {/* 2. Materials & Translucency */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers size={14} className="text-sky-400" />
              <span>2. Translucent Glass Materials</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-center">
                <span className="text-xs font-medium text-white block mb-1">Ultra-Thin Material</span>
                <span className="text-[11px] text-slate-400">Top HUD &amp; Tooltips</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 text-center">
                <span className="text-xs font-medium text-white block mb-1">Regular Sheet Material</span>
                <span className="text-[11px] text-slate-400">Modals &amp; Drawers</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/90 backdrop-blur-3xl border border-white/15 text-center">
                <span className="text-xs font-medium text-white block mb-1">Thick Material</span>
                <span className="text-[11px] text-slate-400">Jumbo Scoreboards</span>
              </div>
            </div>
          </section>

          {/* 3. Semantic Color Tokens */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400" />
              <span>3. Semantic Palette (Zero Neon Gimmicks)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <span className="block font-bold mb-0.5">Court In</span>
                <span className="text-[10px] text-emerald-400/70">#10b981</span>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
                <span className="block font-bold mb-0.5">Court Out</span>
                <span className="text-[10px] text-red-400/70">#ef4444</span>
              </div>
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300">
                <span className="block font-bold mb-0.5">Team A</span>
                <span className="text-[10px] text-sky-400/70">#38bdf8</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <span className="block font-bold mb-0.5">Team B</span>
                <span className="text-[10px] text-amber-400/70">#f59e0b</span>
              </div>
            </div>
          </section>

          {/* 4. Physical Haptics Engine */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity size={14} className="text-emerald-400" />
              <span>4. Web Vibration API Haptics Engine</span>
            </h3>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => testHaptic('light')}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium"
                >
                  Light (10ms)
                </button>
                <button
                  onClick={() => testHaptic('medium')}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium"
                >
                  Medium (24ms)
                </button>
                <button
                  onClick={() => testHaptic('success')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-medium text-emerald-300"
                >
                  Success [15, 40, 20]
                </button>
                <button
                  onClick={() => testHaptic('warning')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-medium text-amber-300"
                >
                  Warning [30, 60, 40]
                </button>
              </div>
              <p className="text-xs font-mono text-slate-400">{hapticFeedback}</p>
            </div>
          </section>

          {/* 5. System States */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>5. Status Indicators &amp; Badges</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Camera Active
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <AlertTriangle size={12} />
                Uncertain Line Call (&lt;70%)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                <ShieldCheck size={12} />
                Zero Video Uploaded
              </span>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
};
