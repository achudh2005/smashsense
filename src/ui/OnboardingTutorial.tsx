import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Camera, Crosshair, Award, Mic } from 'lucide-react';

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCalibration: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isOpen,
  onClose,
  onStartCalibration,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to SmashSense',
      subtitle: 'The privacy-first LIVE badminton match analyzer',
      icon: <Award className="w-12 h-12 text-emerald-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>
            SmashSense turns your device camera into an intelligent badminton umpire and tactician.
          </p>
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-emerald-300">
            <strong>🔒 100% Client-Side Privacy:</strong> Raw camera frames are processed in volatile memory and never recorded or uploaded. Only geometric coordinates and scores are saved locally in your browser.
          </div>
        </div>
      ),
    },
    {
      title: '1. Camera Setup & Placement',
      subtitle: 'Optimal perspective for 3D trajectory tracking',
      icon: <Camera className="w-12 h-12 text-sky-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>For high tracking accuracy and minimal player occlusion:</p>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
            <li><strong>Height:</strong> Mount phone or laptop <strong>1.8m – 2.5m</strong> high (on a tripod or elevated stand).</li>
            <li><strong>Position:</strong> Positioned 1.5m – 2.5m behind the baseline, centered along the center line.</li>
            <li><strong>Angle:</strong> Tilted downward 15° to 20° to capture all 4 court corners in the field of view.</li>
          </ul>
        </div>
      ),
    },
    {
      title: '2. Calibrate the 4 Court Corners',
      subtitle: 'Maps camera pixels to official BWF metric dimensions',
      icon: <Crosshair className="w-12 h-12 text-yellow-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>
            SmashSense uses <strong>Direct Linear Transformation (DLT)</strong> homography to calculate line calls accurate to centimeters:
          </p>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
            <li>Click <strong>Calibrate</strong> on the top bar.</li>
            <li>Drag or tap the 4 corner pins onto the outer doubles corners: <strong>Top-Left</strong>, <strong>Top-Right</strong>, <strong>Bottom-Right</strong>, and <strong>Bottom-Left</strong>.</li>
            <li>Click <strong>Save Preset</strong>. The calibration is remembered across match sessions.</li>
          </ol>
        </div>
      ),
    },
    {
      title: '3. Hands-Free Voice Commands & Scoring',
      subtitle: 'Focus entirely on the game without touching your phone',
      icon: <Mic className="w-12 h-12 text-purple-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>
            During intense rallies, keep your hands on your racket and use voice commands:
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <span className="text-purple-300 font-bold block">&quot;Start&quot; / &quot;Play&quot;</span>
              <span className="text-slate-400 font-sans">Begin match or rally</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <span className="text-purple-300 font-bold block">&quot;Undo&quot;</span>
              <span className="text-slate-400 font-sans">Revert last call</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <span className="text-purple-300 font-bold block">&quot;Point A&quot; / &quot;Point B&quot;</span>
              <span className="text-slate-400 font-sans">Manual score award</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <span className="text-purple-300 font-bold block">&quot;Next Game&quot;</span>
              <span className="text-slate-400 font-sans">Advance to Game 2/3</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
      onStartCalibration();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <div
      role="dialog"
      aria-label="SmashSense Quickstart Tutorial"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl text-slate-200 overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <span className="text-xs font-bold text-slate-400 font-mono">
            STEP {currentStep + 1} OF {steps.length}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        {/* Step Body */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="mb-4">{step.icon}</div>
          <h3 className="text-lg font-bold text-white mb-1">{step.title}</h3>
          <p className="text-xs text-slate-400 mb-6">{step.subtitle}</p>

          <div className="w-full text-left">{step.content}</div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
              currentStep === 0
                ? 'opacity-30 cursor-not-allowed text-slate-600'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ChevronLeft size={14} />
            <span>Back</span>
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep ? 'bg-emerald-400 w-5' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all"
          >
            <span>{currentStep === steps.length - 1 ? 'Start Calibration' : 'Next'}</span>
            {currentStep === steps.length - 1 ? <Check size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};
