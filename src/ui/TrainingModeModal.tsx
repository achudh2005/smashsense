import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PRESET_DRILLS, TrainingDrillConfig } from '../training/drills';
import { trainingManager } from '../training/trainingManager';
import { db, DrillResultRecord } from '../storage/db';
import { triggerHaptic } from '../utils/haptics';
import {
  X,
  Target,
  Play,
  RotateCcw,
  Clock,
  Zap,
  Activity,
  Award,
  History,
} from 'lucide-react';

interface TrainingModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FitnessRing: React.FC<{
  percentage: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
}> = ({ percentage, color = '#10b981', size = 72, strokeWidth = 7 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-white tabular-nums">
        {Math.round(clamped)}%
      </div>
    </div>
  );
};

export const TrainingModeModal: React.FC<TrainingModeModalProps> = ({ isOpen, onClose }) => {
  const [selectedDrill, setSelectedDrill] = useState<TrainingDrillConfig>(PRESET_DRILLS[0]);
  const [isDrillActive, setIsDrillActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'drill' | 'history'>('drill');
  const [historyRecords, setHistoryRecords] = useState<DrillResultRecord[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (activeTab === 'history') {
      db.drillResults.reverse().sortBy('timestamp').then(setHistoryRecords);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isDrillActive) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [isDrillActive]);

  if (!isOpen) return null;

  const handleStartDrill = () => {
    triggerHaptic('medium');
    trainingManager.startDrill(selectedDrill);
    setIsDrillActive(true);
  };

  const handleStopAndSave = async () => {
    triggerHaptic('success');
    await trainingManager.finishAndSave();
    setIsDrillActive(false);
    db.drillResults.reverse().sortBy('timestamp').then(setHistoryRecords);
  };

  const stats = trainingManager.getStats();
  const feedback = trainingManager.getFeedback();

  return (
    <div
      role="dialog"
      aria-label="SmashSense Training Mode"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-slate-900/90 border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Target size={20} className="stroke-[1.75]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">Solo Training</h2>
                {isDrillActive && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Target zone precision and footwork cadence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setActiveTab('drill');
                }}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'drill' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Drill
              </button>
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setActiveTab('history');
                }}
                className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  activeTab === 'history' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <History size={13} />
                <span>History</span>
              </button>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        {activeTab === 'drill' ? (
          <div className="p-6 overflow-y-auto space-y-6 text-sm">
            {/* Drill Picker */}
            {!isDrillActive ? (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Select Drill
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_DRILLS.map((drill) => {
                    const isSelected = selectedDrill.id === drill.id;
                    return (
                      <motion.div
                        key={drill.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedDrill(drill);
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/40 shadow-sm'
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-white text-sm">{drill.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-medium bg-white/10 text-purple-300">
                              {drill.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {drill.description}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                          <span>Target: {drill.targetReps} reps</span>
                          <span>Duration: {drill.targetDurationSeconds}s</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Active Live Drill Dashboard with Fitness Rings */
              <div className="space-y-5">
                {/* Real-time Feedback Banner */}
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-sm font-medium flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <Target size={18} className="text-purple-400" />
                    <span>{feedback}</span>
                  </div>
                  <span className="text-xs font-mono tabular-nums bg-purple-900/40 px-2.5 py-1 rounded-full text-purple-200">
                    Rep {stats.totalReps} of {stats.targetReps}
                  </span>
                </div>

                {/* Apple Fitness-style Dual Rings & Metric Cards */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-around gap-6">
                  <div className="flex items-center gap-4">
                    <FitnessRing percentage={stats.accuracyPercent} color="#10b981" />
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">Zone Accuracy</span>
                      <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                        {stats.accuracyPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="w-px h-12 bg-white/10 hidden sm:block" />

                  <div className="flex items-center gap-4">
                    <FitnessRing percentage={stats.progressPercent} color="#a855f7" />
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">Drill Completion</span>
                      <span className="text-2xl font-bold font-mono tabular-nums text-purple-300">
                        {stats.successfulHits}/{stats.targetReps}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                  <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                      <Clock size={12} />
                      <span>Elapsed</span>
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-white">
                      {stats.elapsedSec}s
                    </div>
                  </div>

                  <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                      <Zap size={12} className="text-yellow-400" />
                      <span>Total Swings</span>
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-yellow-300">
                      {stats.totalReps}
                    </div>
                  </div>

                  <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                      <Activity size={12} className="text-sky-400" />
                      <span>Peak Velocity</span>
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-sky-300">
                      {stats.topSpeedKmh > 0 ? `${Math.round(stats.topSpeedKmh)} km/h` : '–'}
                    </div>
                  </div>
                </div>

                {/* Target Zone Specifications */}
                {selectedDrill.targetZone && (
                  <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-xs space-y-1 text-slate-300">
                    <h4 className="font-semibold text-white mb-1 flex items-center gap-1.5">
                      <Target size={14} className="text-purple-400" />
                      <span>Objective: {selectedDrill.targetZone.name}</span>
                    </h4>
                    <p className="text-slate-400 leading-relaxed">
                      Target coordinate: X={selectedDrill.targetZone.idealPoint.x}m, Y={selectedDrill.targetZone.idealPoint.y}m. Landings inside this target bounding box are scored as hits.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Drill Instructions */}
            {!isDrillActive && (
              <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Instructions
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                  {selectedDrill.instructions.map((ins, i) => (
                    <li key={i}>{ins}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* History Tab */
          <div className="p-6 overflow-y-auto space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Past Training Sessions
            </h3>
            {historyRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No recorded drill sessions yet. Start a session from the Drill tab.
              </div>
            ) : (
              historyRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                      <Award size={15} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{rec.drillName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {new Date(rec.timestamp).toLocaleDateString()} • {rec.durationSeconds}s
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 font-mono tabular-nums">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">
                        Accuracy
                      </span>
                      <span className="font-bold text-emerald-400 text-sm">
                        {rec.targetAccuracyPercent}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">
                        Reps
                      </span>
                      <span className="font-bold text-white text-sm">{rec.repsCompleted}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer Controls */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-between items-center">
          <div className="text-xs text-slate-400">
            {isDrillActive ? 'Live tracking shuttle landings and footwork' : 'Ready'}
          </div>

          <div className="flex gap-2">
            {!isDrillActive ? (
              <button
                onClick={handleStartDrill}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Play size={14} />
                <span>Start Drill</span>
              </button>
            ) : (
              <button
                onClick={handleStopAndSave}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <RotateCcw size={14} />
                <span>Finish &amp; Save</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
