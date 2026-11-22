import React, { useState, useEffect } from 'react';
import {
  remoteClickerService,
  RemoteClickerAction,
  KeyMappingConfig,
} from '../sensors/remoteClickerService';
import { acousticHitDetector } from '../audio/acousticHitDetector';
import {
  Radio,
  Volume2,
  Mic,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Sparkles,
  X,
  Keyboard,
  Activity,
} from 'lucide-react';
import { haptics } from '../utils/haptics';

interface RemoteClickerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_DESCRIPTIONS: Record<RemoteClickerAction, { label: string; desc: string }> = {
  POINT_A: { label: 'Point Team A (+1)', desc: 'Award point to Team A' },
  POINT_B: { label: 'Point Team B (+1)', desc: 'Award point to Team B' },
  UNDO: { label: 'Undo Last Point', desc: 'Roll back previous rally call' },
  CHALLENGE: { label: 'Challenge / Flag Call', desc: 'Trigger Hawk-Eye review' },
  TOGGLE_DRILL: { label: 'Start / Stop Drill', desc: 'Toggle training mode session' },
};

export const RemoteClickerSettingsModal: React.FC<RemoteClickerSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [mappings, setMappings] = useState<KeyMappingConfig>(remoteClickerService.getMappings());
  const [learningAction, setLearningAction] = useState<RemoteClickerAction | null>(null);
  const [clickerEnabled, setClickerEnabled] = useState(remoteClickerService.isClickerEnabled());
  const [acousticEnabled, setAcousticEnabled] = useState(false);
  const [acousticSensitivity, setAcousticSensitivity] = useState(acousticHitDetector.getSensitivity());
  const [micActive, setMicActive] = useState(false);
  const [lastAcousticDetected, setLastAcousticDetected] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setMappings(remoteClickerService.getMappings());
    setClickerEnabled(remoteClickerService.isClickerEnabled());
    setAcousticSensitivity(acousticHitDetector.getSensitivity());

    const cleanupListener = acousticHitDetector.addEventListener((ev) => {
      setLastAcousticDetected(`${ev.type === 'SHUTTLE_HIT' ? '🏸 Shuttle Hit' : '🕸️ Net Strike'} (${ev.frequencyHz} Hz)`);
      setTimeout(() => setLastAcousticDetected(null), 2500);
    });

    return () => {
      cleanupListener();
      remoteClickerService.cancelLearning();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleClicker = () => {
    const next = !clickerEnabled;
    setClickerEnabled(next);
    remoteClickerService.setEnabled(next);
    haptics.selection();
  };

  const handleStartLearning = (action: RemoteClickerAction) => {
    setLearningAction(action);
    haptics.medium();
    remoteClickerService.startLearning(action, (learnedAct, key) => {
      setLearningAction(null);
      setMappings(remoteClickerService.getMappings());
      haptics.success();
      void learnedAct;
      void key;
    });
  };

  const handleCancelLearning = () => {
    setLearningAction(null);
    remoteClickerService.cancelLearning();
    haptics.light();
  };

  const handleResetDefaults = () => {
    remoteClickerService.resetToDefaults();
    setMappings(remoteClickerService.getMappings());
    haptics.warning();
  };

  const handleToggleAcoustic = async () => {
    if (!acousticEnabled) {
      const ok = await acousticHitDetector.start();
      setAcousticEnabled(ok);
      setMicActive(ok);
      if (ok) haptics.success();
    } else {
      acousticHitDetector.stop();
      setAcousticEnabled(false);
      setMicActive(false);
      haptics.selection();
    }
  };

  const handleSensitivityChange = (val: number) => {
    setAcousticSensitivity(val);
    acousticHitDetector.setSensitivity(val);
  };

  const handleTestTone = (action: RemoteClickerAction) => {
    remoteClickerService.triggerAction(action);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Smart Sensors & Remote Clicker</h2>
              <p className="text-xs text-neutral-400">Bluetooth controllers & acoustic hit detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Learning Prompt Overlay */}
        {learningAction && (
          <div className="p-4 bg-emerald-950/70 border-b border-emerald-500/30 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <Keyboard className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-emerald-300">
                  Listening for key for: {ACTION_DESCRIPTIONS[learningAction].label}
                </p>
                <p className="text-[11px] text-emerald-400/80">Press any button on your presentation clicker or keyboard</p>
              </div>
            </div>
            <button
              onClick={handleCancelLearning}
              className="text-xs px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: Bluetooth Remote Clicker */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  Bluetooth Clicker & Wearable Remote
                </h3>
                <p className="text-xs text-neutral-400">
                  Control points and challenges without looking at the screen
                </p>
              </div>
              <button
                onClick={handleToggleClicker}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  clickerEnabled ? 'bg-emerald-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    clickerEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 divide-y divide-neutral-800/60">
              {(Object.keys(ACTION_DESCRIPTIONS) as RemoteClickerAction[]).map((action) => {
                const keys = mappings[action] || [];
                const isCurrentLearning = learningAction === action;

                return (
                  <div
                    key={action}
                    className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-neutral-900/40 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-neutral-200">
                        {ACTION_DESCRIPTIONS[action].label}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {ACTION_DESCRIPTIONS[action].desc}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestTone(action)}
                        title="Test sound feedback"
                        className="p-1 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1">
                        {keys.slice(0, 2).map((k, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono text-[11px] text-neutral-300"
                          >
                            {k}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => handleStartLearning(action)}
                        disabled={isCurrentLearning}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          isCurrentLearning
                            ? 'bg-emerald-500 text-neutral-950'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                        }`}
                      >
                        {isCurrentLearning ? 'Press key...' : 'Learn'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Key Bindings to Defaults
              </button>
            </div>
          </div>

          {/* SECTION 2: Acoustic Net Strike & Shuttle Hit Detection */}
          <div className="pt-4 border-t border-neutral-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  Acoustic Net Strike & Shuttle Hit Detection
                </h3>
                <p className="text-xs text-neutral-400">
                  Web Audio FFT analyzes acoustic pops & net cord scrapes
                </p>
              </div>
              <button
                onClick={handleToggleAcoustic}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  acousticEnabled ? 'bg-emerald-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    acousticEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {acousticEnabled && (
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Detection Sensitivity
                  </span>
                  <span className="font-mono text-emerald-400">
                    {Math.round(acousticSensitivity * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={acousticSensitivity}
                  onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 bg-neutral-800 rounded-lg h-2 cursor-pointer"
                />

                <div className="flex justify-between text-[11px] text-neutral-500">
                  <span>Less sensitive (noisy hall)</span>
                  <span>Balanced</span>
                  <span>High (quiet court)</span>
                </div>

                {/* Status indicator */}
                <div className="pt-2 flex items-center justify-between border-t border-neutral-800/60 text-xs">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Activity className={`w-3.5 h-3.5 ${micActive ? 'text-emerald-400 animate-pulse' : 'text-neutral-600'}`} />
                    <span>Microphone FFT Stream:</span>
                    <span className={micActive ? 'text-emerald-400 font-medium' : 'text-neutral-500'}>
                      {micActive ? 'Active (Listening)' : 'Standby'}
                    </span>
                  </div>

                  {lastAcousticDetected && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium text-[11px]">
                      {lastAcousticDetected}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Audio-Vision Fusion Explainer */}
            <div className="p-3.5 rounded-xl border border-neutral-800/60 bg-neutral-950/40 text-xs space-y-1.5 text-neutral-400">
              <div className="flex items-center gap-1.5 text-neutral-200 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Audio-Vision Pipeline Fusion
              </div>
              <p className="text-[11px] leading-relaxed">
                When a shuttlecock landing candidate is tracked within ±120ms of an acoustic impact spike (3.5 – 7.0 kHz), SmashSense boosts line call certainty. Resonant frequencies in the 800 – 2500 Hz band near the tape automatically flag net-cord bounces.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Changes saved automatically</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
