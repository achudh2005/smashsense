import React, { useState } from 'react';
import { useSmashSenseStore } from '../game/gameState';
import { CameraPositionGuide } from './CameraPositionGuide';
import { PlayerRole } from '../tracking/byteTrack';
import {
  Users,
  User,
  ArrowRight,
  ArrowLeft,
  X,
  Crosshair,
  Sparkles,
  Play
} from 'lucide-react';

export const SetupWizard: React.FC = () => {
  const isSetupWizardOpen = useSmashSenseStore((s) => s.isSetupWizardOpen);
  const setSetupWizardOpen = useSmashSenseStore((s) => s.setSetupWizardOpen);
  const config = useSmashSenseStore((s) => s.config);
  const updateConfig = useSmashSenseStore((s) => s.updateConfig);
  const setCalibrationMode = useSmashSenseStore((s) => s.setCalibrationMode);

  const [step, setStep] = useState<number>(1);

  // Local state for wizard form
  const [format, setFormat] = useState<'singles' | 'doubles'>(config.format);
  const [playerA1, setPlayerA1] = useState(config.teamANames.A1);
  const [playerA2, setPlayerA2] = useState(config.teamANames.A2 || 'Player A2');
  const [playerB1, setPlayerB1] = useState(config.teamBNames.B1);
  const [playerB2, setPlayerB2] = useState(config.teamBNames.B2 || 'Player B2');
  const [firstServer, setFirstServer] = useState<PlayerRole>(config.firstServer);

  if (!isSetupWizardOpen) return null;

  const handleFinish = () => {
    updateConfig({
      format,
      teamANames: { A1: playerA1, ...(format === 'doubles' ? { A2: playerA2 } : {}) },
      teamBNames: { B1: playerB1, ...(format === 'doubles' ? { B2: playerB2 } : {}) },
      firstServer,
    });
    setSetupWizardOpen(false);
  };

  const handleOpenCalibrationFromWizard = () => {
    handleFinish();
    setCalibrationMode(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              SmashSense Match Setup Wizard
            </h2>
            <p className="text-xs text-slate-400">Step {step} of 4</p>
          </div>
          <button
            onClick={() => setSetupWizardOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="bg-emerald-500 h-1 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: Singles vs Doubles */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200">Select Match Format</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFormat('singles')}
                  className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                    format === 'singles'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200 shadow-lg shadow-emerald-950'
                      : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <User className="w-10 h-10 mb-2" />
                  <span className="font-bold text-base">Singles (1 vs 1)</span>
                  <span className="text-xs text-slate-400 mt-1">Single player court lines</span>
                </button>

                <button
                  onClick={() => setFormat('doubles')}
                  className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                    format === 'doubles'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200 shadow-lg shadow-emerald-950'
                      : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Users className="w-10 h-10 mb-2" />
                  <span className="font-bold text-base">Doubles (2 vs 2)</span>
                  <span className="text-xs text-slate-400 mt-1">Full court & service boxes</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Player & Team Names */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-slate-200">Enter Player Names</h3>

              {/* Team A */}
              <div className="bg-slate-950/60 border border-sky-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-400" />
                  <h4 className="font-bold text-sm text-sky-200">Team A (Far Side)</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400">Player A1 Name</label>
                    <input
                      type="text"
                      value={playerA1}
                      onChange={(e) => setPlayerA1(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-400 mt-1"
                    />
                  </div>
                  {format === 'doubles' && (
                    <div>
                      <label className="text-[11px] font-medium text-slate-400">Player A2 Name</label>
                      <input
                        type="text"
                        value={playerA2}
                        onChange={(e) => setPlayerA2(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-400 mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Team B */}
              <div className="bg-slate-950/60 border border-orange-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  <h4 className="font-bold text-sm text-orange-200">Team B (Near Side)</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400">Player B1 Name</label>
                    <input
                      type="text"
                      value={playerB1}
                      onChange={(e) => setPlayerB1(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500 mt-1"
                    />
                  </div>
                  {format === 'doubles' && (
                    <div>
                      <label className="text-[11px] font-medium text-slate-400">Player B2 Name</label>
                      <input
                        type="text"
                        value={playerB2}
                        onChange={(e) => setPlayerB2(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500 mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: First Server */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200">Who Serves First?</h3>
              <p className="text-xs text-slate-400">
                The chosen player starts serving from the right-hand service court (0-0 score).
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFirstServer('A1')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    firstServer === 'A1'
                      ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-mono font-bold block text-sky-400">Team A</span>
                  <span className="font-semibold text-sm">{playerA1} (A1)</span>
                </button>

                {format === 'doubles' && (
                  <button
                    onClick={() => setFirstServer('A2')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      firstServer === 'A2'
                        ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                        : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold block text-sky-400">Team A</span>
                    <span className="font-semibold text-sm">{playerA2} (A2)</span>
                  </button>
                )}

                <button
                  onClick={() => setFirstServer('B1')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    firstServer === 'B1'
                      ? 'border-orange-400 bg-orange-500/20 text-orange-200'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-mono font-bold block text-orange-400">Team B</span>
                  <span className="font-semibold text-sm">{playerB1} (B1)</span>
                </button>

                {format === 'doubles' && (
                  <button
                    onClick={() => setFirstServer('B2')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      firstServer === 'B2'
                        ? 'border-orange-400 bg-orange-500/20 text-orange-200'
                        : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold block text-orange-400">Team B</span>
                    <span className="font-semibold text-sm">{playerB2} (B2)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Camera Position Guide & Calibration Shortcut */}
          {step === 4 && (
            <div className="space-y-4">
              <CameraPositionGuide />
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-emerald-400" />
                    Court Calibration
                  </h4>
                  <p className="text-xs text-slate-400">
                    Verify or adjust the 4 corner pins on your live camera view.
                  </p>
                </div>
                <button
                  onClick={handleOpenCalibrationFromWizard}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-300 flex items-center gap-1.5"
                >
                  <Crosshair size={14} />
                  Calibrate Court Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30"
            >
              Next
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/40"
            >
              <Play size={16} />
              Start Match Analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
