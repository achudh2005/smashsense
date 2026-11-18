import React from 'react';
import { X, ShieldCheck, VideoOff, Cpu, Lock, CheckCircle2, HardDrive } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="SmashSense Privacy Guarantee"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Privacy by Architecture</h2>
              <p className="text-xs text-slate-400">Client-Side AI • Zero Video Uploaded</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Main Hero Callout */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-slate-900 to-transparent border border-emerald-500/30 flex items-start gap-3">
            <VideoOff size={24} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-extrabold text-white mb-1">
                Zero Video Recording or Upload
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                SmashSense was architected with a strict privacy constraint: camera frames never leave your device’s GPU memory and are never saved to disk or transmitted to any server.
              </p>
            </div>
          </div>

          {/* How It Works Diagram */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Camera Frame Pipeline
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center text-center">
                <Cpu size={22} className="text-sky-400 mb-2" />
                <span className="font-bold text-white mb-1">1. Live Frame in RAM</span>
                <p className="text-[11px] text-slate-400">
                  Camera feed is sampled into a Web Worker via Canvas ImageBitmap in volatile browser memory.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center text-center">
                <CheckCircle2 size={22} className="text-yellow-400 mb-2" />
                <span className="font-bold text-white mb-1">2. Local Inference</span>
                <p className="text-[11px] text-slate-400">
                  Pose keypoints, shuttle trajectory, and line calls are calculated locally on your WebGL/WebGPU.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center text-center">
                <HardDrive size={22} className="text-emerald-400 mb-2" />
                <span className="font-bold text-white mb-1">3. Frame Discarded</span>
                <p className="text-[11px] text-slate-400">
                  Video pixels are garbage collected immediately. Only numeric coordinates &amp; scores are saved.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Checklist */}
          <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Our Commitments
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Lock size={14} className="text-emerald-400 shrink-0" />
              <span>No user account is required to use SmashSense.</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Lock size={14} className="text-emerald-400 shrink-0" />
              <span>All match history and calibrations reside exclusively in local IndexedDB.</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Lock size={14} className="text-emerald-400 shrink-0" />
              <span>Works 100% offline as a Progressive Web App (PWA).</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Lock size={14} className="text-emerald-400 shrink-0" />
              <span>Optional LLM coaching only transmits numeric text statistics, never visuals.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
          >
            I Understand &amp; Agree
          </button>
        </div>
      </div>
    </div>
  );
};
