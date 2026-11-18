import React, { useState, useEffect } from 'react';
import { accuracyManager, TuningSettings } from '../court/accuracyManager';
import { FlaggedCallRecord } from '../storage/db';
import {
  X,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface ReviewFlaggedCallsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewFlaggedCallsModal: React.FC<ReviewFlaggedCallsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [calls, setCalls] = useState<FlaggedCallRecord[]>([]);
  const [tuning, setTuning] = useState<TuningSettings>(accuracyManager.getSettings());
  const [activeTab, setActiveTab] = useState<'calls' | 'tuning'>('calls');

  const loadCalls = async () => {
    const list = await accuracyManager.getFlaggedCalls();
    setCalls(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadCalls();
      setTuning(accuracyManager.getSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerdict = async (id: string, verdict: 'CONFIRMED' | 'OVERTURNED') => {
    await accuracyManager.reviewCall(id, verdict);
    await loadCalls();
    setTuning(accuracyManager.getSettings());
  };

  const handleUpdateMargin = (val: number) => {
    const updated = { ...tuning, uncertaintyThresholdCm: val };
    setTuning(updated);
    accuracyManager.updateSettings(updated);
  };

  const handleUpdateConfidence = (val: number) => {
    const updated = { ...tuning, minConfidenceThreshold: val };
    setTuning(updated);
    accuracyManager.updateSettings(updated);
  };

  return (
    <div
      role="dialog"
      aria-label="Review Flagged Calls"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Line Accuracy &amp; Flagged Calls
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30">
                  {calls.length} Flagged
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Audit uncertain landing calls and tune detection thresholds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('calls')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'calls' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Calls
              </button>
              <button
                onClick={() => setActiveTab('tuning')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'tuning' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders size={13} />
                <span>Tuning</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'calls' ? (
          <div className="p-6 overflow-y-auto space-y-3">
            {calls.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs flex flex-col items-center">
                <ShieldCheck size={32} className="text-emerald-500/60 mb-2" />
                <span>No flagged line calls! All match decisions had high confidence (&gt;85%).</span>
              </div>
            ) : (
              calls.map((call) => (
                <div
                  key={call.id}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-black px-2 py-0.5 rounded text-xs ${
                          call.call === 'IN'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {call.call}
                      </span>
                      <span className="font-semibold text-white">
                        Rally #{call.rallyNumber} (Game {call.gameIndex})
                      </span>
                      {call.userVerdict && (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.2 rounded font-bold uppercase ${
                            call.userVerdict === 'CONFIRMED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {call.userVerdict}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Distance to line: <strong className="text-white">{call.distanceToLineCm} cm</strong> • Confidence: <strong className="text-white">{call.confidence}%</strong>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleVerdict(call.id, 'CONFIRMED')}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all ${
                        call.userVerdict === 'CONFIRMED'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <CheckCircle2 size={13} />
                      <span>Confirm</span>
                    </button>

                    <button
                      onClick={() => handleVerdict(call.id, 'OVERTURNED')}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all ${
                        call.userVerdict === 'OVERTURNED'
                          ? 'bg-rose-600 text-white shadow'
                          : 'bg-slate-900 text-rose-400 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <XCircle size={13} />
                      <span>Overturn</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Tuning Tab */
          <div className="p-6 overflow-y-auto space-y-6 text-sm">
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Hawkeye Detection Sensitivity Tuning
              </h3>

              {/* Slider 1: Uncertainty Margin */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Uncertainty Margin Threshold
                  </span>
                  <span className="font-mono text-amber-400 font-bold">
                    {tuning.uncertaintyThresholdCm} cm
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="0.5"
                  value={tuning.uncertaintyThresholdCm}
                  onChange={(e) => handleUpdateMargin(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Landings closer than this margin to any boundary line are automatically flagged with an advisory banner.
                </p>
              </div>

              {/* Slider 2: Minimum Confidence */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Minimum Line Call Confidence
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {Math.round(tuning.minConfidenceThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.05"
                  value={tuning.minConfidenceThreshold}
                  onChange={(e) => handleUpdateConfidence(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Calculations below this threshold prompt review before permanent point attribution.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs text-slate-400">
          <span>Tuning parameters are remembered across all match sessions</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
