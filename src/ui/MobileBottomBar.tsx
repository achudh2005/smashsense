import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Trophy,
  Target,
  Crosshair,
  Command,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface MobileBottomBarProps {
  onOpenScore: () => void;
  onOpenStats: () => void;
  onOpenDrills: () => void;
  onToggleCalibration: () => void;
  isCalibrationActive: boolean;
  onOpenCommandPalette: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  onOpenScore,
  onOpenStats,
  onOpenDrills,
  onToggleCalibration,
  isCalibrationActive,
  onOpenCommandPalette,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/85 backdrop-blur-2xl border-t border-white/10 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Match / Live Score HUD */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('light');
            onOpenScore();
          }}
          className="flex flex-col items-center justify-center min-w-[54px] min-h-[44px] text-slate-400 hover:text-white transition-colors"
          title="Match Scoreboard"
        >
          <Activity size={20} className="stroke-[1.75]" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Match</span>
        </motion.button>

        {/* Analytics / Stats */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('light');
            onOpenStats();
          }}
          className="flex flex-col items-center justify-center min-w-[54px] min-h-[44px] text-slate-400 hover:text-white transition-colors"
          title="Match Analytics"
        >
          <Trophy size={20} className="stroke-[1.75]" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Stats</span>
        </motion.button>

        {/* Calibrate Court Button (Elevated Center Action) */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('medium');
            onToggleCalibration();
          }}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] px-2 rounded-xl transition-all ${
            isCalibrationActive
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Court Calibration"
        >
          <div
            className={`p-1.5 rounded-full transition-colors ${
              isCalibrationActive
                ? 'bg-emerald-500/20 ring-1 ring-emerald-500/40 text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            <Crosshair size={20} className="stroke-[1.75]" />
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Court</span>
        </motion.button>

        {/* Drills & Training Mode */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('light');
            onOpenDrills();
          }}
          className="flex flex-col items-center justify-center min-w-[54px] min-h-[44px] text-slate-400 hover:text-white transition-colors"
          title="Training Drills"
        >
          <Target size={20} className="stroke-[1.75]" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Drills</span>
        </motion.button>

        {/* Command Menu / Quick Actions */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('light');
            onOpenCommandPalette();
          }}
          className="flex flex-col items-center justify-center min-w-[54px] min-h-[44px] text-slate-400 hover:text-white transition-colors"
          title="Command Palette & Settings"
        >
          <Command size={20} className="stroke-[1.75]" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Actions</span>
        </motion.button>
      </div>
    </nav>
  );
};
