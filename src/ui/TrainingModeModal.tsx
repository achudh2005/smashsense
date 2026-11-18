import React, { useState, useEffect } from 'react';
import { PRESET_DRILLS, TrainingDrillConfig } from '../training/drills';
import { trainingManager } from '../training/trainingManager';
import { db, DrillResultRecord } from '../storage/db';
import {
  X,
  Target,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Zap,
  Flame,
  Award,
  History,
} from 'lucide-react';

interface TrainingModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    trainingManager.startDrill(selectedDrill);
    setIsDrillActive(true);
  };

  const handleStopAndSave = async () => {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Target size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Solo Training &amp; Drill Mode
                {isDrillActive && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                    ACTIVE
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Target accuracy, footwork cadence, and live tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('drill')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'drill' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Drill
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'history' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <History size={13} />
                <span>History</span>
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

        {/* Body */}
        {activeTab === 'drill' ? (
          <div className="p-6 overflow-y-auto space-y-6 text-sm">
            {/* Drill Picker */}
            {!isDrillActive ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Training Drill
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_DRILLS.map((drill) => {
                    const isSelected = selectedDrill.id === drill.id;
                    return (
                      <div
                        key={drill.id}
                        onClick={() => setSelectedDrill(drill)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-950/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-white text-sm">{drill.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold bg-slate-800 text-purple-300">
                              {drill.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {drill.description}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Target: {drill.targetReps} reps</span>
                          <span>Time: {drill.targetDurationSeconds}s</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Active Live Drill Dashboard */
              <div className="space-y-5">
                {/* Real-time Feedback Banner */}
                <div className="p-4 rounded-2xl bg-purple-950/50 border border-purple-500/40 text-purple-200 text-sm font-semibold flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-purple-400 animate-spin" />
                    <span>{feedback}</span>
                  </div>
                  <span className="text-xs font-mono bg-purple-900/60 px-2 py-1 rounded text-purple-200">
                    Rep {stats.totalReps} / {stats.targetReps}
                  </span>
                </div>

                {/* Progress & Live Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                      <Clock size={12} />
                      <span>Elapsed</span>
                    </div>
                    <div className="text-xl font-black font-mono text-white">
                      {stats.elapsedSec}s
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      <span>Accuracy</span>
                    </div>
                    <div className="text-xl font-black font-mono text-emerald-400">
                      {stats.accuracyPercent}%
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                      <Zap size={12} className="text-yellow-400" />
                      <span>Hits</span>
                    </div>
                    <div className="text-xl font-black font-mono text-yellow-300">
                      {stats.successfulHits} / {stats.targetReps}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                      <Flame size={12} className="text-amber-400" />
                      <span>Top Speed</span>
                    </div>
                    <div className="text-xl font-black font-mono text-amber-300">
                      {stats.topSpeedKmh > 0 ? `${Math.round(stats.topSpeedKmh)} k` : '--'}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>Drill Completion</span>
                    <span>{stats.progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${stats.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Target Zone Specifications */}
                {selectedDrill.targetZone && (
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-xs space-y-1 text-slate-300">
                    <h4 className="font-bold text-white mb-1 flex items-center gap-1.5">
                      <Target size={14} className="text-purple-400" />
                      <span>Target Objective: {selectedDrill.targetZone.name}</span>
                    </h4>
                    <p className="text-slate-400">
                      Ideal coordinates: X={selectedDrill.targetZone.idealPoint.x}m, Y=
                      {selectedDrill.targetZone.idealPoint.y}m. Shuttle landings within this boundary evaluate as successful hits.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Drill Instructions */}
            {!isDrillActive && (
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Instructions: {selectedDrill.name}
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Past Training Sessions
            </h3>
            {historyRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No completed drills yet. Start your first session above!
              </div>
            ) : (
              historyRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                      <Award size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-white">{rec.drillName}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(rec.timestamp).toLocaleDateString()} • {rec.durationSeconds}s
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 font-mono">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase font-sans">
                        Accuracy
                      </span>
                      <span className="font-bold text-emerald-400 text-sm">
                        {rec.targetAccuracyPercent}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase font-sans">
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
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            {isDrillActive ? 'Camera is tracking shuttlecock landings & footwork' : 'Ready'}
          </div>

          <div className="flex gap-2">
            {!isDrillActive ? (
              <button
                onClick={handleStartDrill}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/40 transition-all"
              >
                <Play size={14} />
                <span>Start Drill</span>
              </button>
            ) : (
              <button
                onClick={handleStopAndSave}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 transition-all"
              >
                <RotateCcw size={14} />
                <span>Finish &amp; Save Drill</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
