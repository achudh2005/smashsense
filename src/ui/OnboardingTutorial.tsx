import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check, Camera, Crosshair, ShieldCheck, Mic } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

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
      title: 'Get Started with SmashSense',
      subtitle: 'Real-time match telemetry and tactical analysis, entirely on-device',
      icon: <ShieldCheck className="w-12 h-12 text-emerald-400 stroke-[1.5]" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p className="leading-relaxed">
            SmashSense analyzes court play, line calls, player kinematics, and BWF rally scoring directly in your browser.
          </p>
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl text-slate-200">
            <span className="font-semibold text-emerald-400 block mb-1">Architecture Guarantee</span>
            <span className="text-[11px] text-slate-400 leading-relaxed block">
              Frames remain in local GPU memory during inference and are discarded immediately. Video is never saved to disk or transmitted to any server.
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Camera Positioning',
      subtitle: 'Recommended placement for optimal perspective and metric accuracy',
      icon: <Camera className="w-12 h-12 text-sky-400 stroke-[1.5]" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p className="text-slate-400">Position your camera device according to these specifications:</p>
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <span className="font-medium text-slate-300">Elevation</span>
              <span className="text-white font-mono font-medium">1.8m – 2.5m</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <span className="font-medium text-slate-300">Distance behind baseline</span>
              <span className="text-white font-mono font-medium">1.5m – 2.5m</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <span className="font-medium text-slate-300">Tilt Angle</span>
              <span className="text-white font-mono font-medium">15° – 20° downward</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Court Calibration',
      subtitle: 'Direct Linear Transformation maps image pixels to BWF standard meters',
      icon: <Crosshair className="w-12 h-12 text-amber-400 stroke-[1.5]" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p className="text-slate-400">
            Align the 4 outer corner pins with the doubles court boundaries:
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-amber-400 font-mono font-bold block mb-0.5">Top Corners</span>
              <span className="text-slate-400">Far court baseline intersections (Left &amp; Right).</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-amber-400 font-mono font-bold block mb-0.5">Bottom Corners</span>
              <span className="text-slate-400">Near court baseline intersections (Left &amp; Right).</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Hands-Free Voice Control',
      subtitle: 'Auditory feedback and hands-free match operation',
      icon: <Mic className="w-12 h-12 text-purple-400 stroke-[1.5]" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p className="text-slate-400">
            Enable hands-free mode to control match progression via natural speech:
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
              <span className="text-purple-300 font-semibold block">&quot;Start&quot; / &quot;Play&quot;</span>
              <span className="text-slate-400 font-sans text-[10px]">Begin rally tracking</span>
            </div>
            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
              <span className="text-purple-300 font-semibold block">&quot;Undo&quot;</span>
              <span className="text-slate-400 font-sans text-[10px]">Revert last score</span>
            </div>
            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
              <span className="text-purple-300 font-semibold block">&quot;Score&quot;</span>
              <span className="text-slate-400 font-sans text-[10px]">Announce current score</span>
            </div>
            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
              <span className="text-purple-300 font-semibold block">&quot;Next Game&quot;</span>
              <span className="text-slate-400 font-sans text-[10px]">Advance game set</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    triggerHaptic('selection');
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
      onStartCalibration();
    }
  };

  const handlePrev = () => {
    triggerHaptic('selection');
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <div
      role="dialog"
      aria-label="SmashSense Quickstart Tutorial"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900/90 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl text-slate-200 overflow-hidden flex flex-col"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider">
            STEP {currentStep + 1} OF {steps.length}
          </span>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Step Body */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="mb-4">{step.icon}</div>
          <h3 className="text-base font-semibold text-white tracking-tight mb-1">{step.title}</h3>
          <p className="text-xs text-slate-400 mb-6">{step.subtitle}</p>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="w-full text-left"
            >
              {step.content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
              currentStep === 0
                ? 'opacity-30 cursor-not-allowed text-slate-600'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <ChevronLeft size={14} />
            <span>Back</span>
          </button>

          {/* Dots Indicator */}
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'bg-emerald-400 w-5' : 'bg-white/20 w-1.5'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span>{currentStep === steps.length - 1 ? 'Start Calibration' : 'Continue'}</span>
            {currentStep === steps.length - 1 ? <Check size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
