import React, { useState, useEffect, useRef } from 'react';
import { useSmashSenseStore } from '../game/gameState';
import { haptics } from '../utils/haptics';
import {
  Search,
  Crosshair,
  BarChart2,
  Tv,
  Target,
  Users,
  ShieldCheck,
  Battery,
  BatteryCharging,
  RotateCcw,
  Play,
  Pause,
  HelpCircle,
  Command,
} from 'lucide-react';

interface PaletteAction {
  id: string;
  category: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const setCalibrationMode = useSmashSenseStore((s) => s.setCalibrationMode);
  const isSimulationMode = useSmashSenseStore((s) => s.isSimulationMode);
  const setSimulationMode = useSmashSenseStore((s) => s.setSimulationMode);
  const setStatsModalOpen = useSmashSenseStore((s) => s.setStatsModalOpen);
  const toggleLiveStatsDrawer = useSmashSenseStore((s) => s.toggleLiveStatsDrawer);
  const setTrainingModalOpen = useSmashSenseStore((s) => s.setTrainingModalOpen);
  const setLargeScoreboardOpen = useSmashSenseStore((s) => s.setLargeScoreboardOpen);
  const setProfilesModalOpen = useSmashSenseStore((s) => s.setProfilesModalOpen);
  const setPrivacyModalOpen = useSmashSenseStore((s) => s.setPrivacyModalOpen);
  const setOnboardingOpen = useSmashSenseStore((s) => s.setOnboardingOpen);
  const isLowPowerMode = useSmashSenseStore((s) => s.isLowPowerMode);
  const toggleLowPowerMode = useSmashSenseStore((s) => s.toggleLowPowerMode);
  const undoScore = useSmashSenseStore((s) => s.undoScore);
  const redoScore = useSmashSenseStore((s) => s.redoScore);
  const startNextGame = useSmashSenseStore((s) => s.startNextGame);
  const toggleMiniCourt = useSmashSenseStore((s) => s.toggleMiniCourt);

  const actions: PaletteAction[] = [
    {
      id: 'calibrate',
      category: 'Court',
      label: 'Calibrate 4 Court Corners',
      shortcut: 'C',
      icon: <Crosshair size={16} />,
      run: () => setCalibrationMode(true),
    },
    {
      id: 'toggle-radar',
      category: 'Court',
      label: 'Toggle 2D Radar Mini-Court',
      shortcut: 'M',
      icon: <Target size={16} />,
      run: toggleMiniCourt,
    },
    {
      id: 'sim-match',
      category: 'Match',
      label: isSimulationMode ? 'Stop Simulation Match' : 'Start Simulation Match',
      shortcut: 'Space',
      icon: isSimulationMode ? <Pause size={16} /> : <Play size={16} />,
      run: () => setSimulationMode(!isSimulationMode),
    },
    {
      id: 'undo',
      category: 'Match',
      label: 'Undo Last Point',
      shortcut: 'U',
      icon: <RotateCcw size={16} />,
      run: undoScore,
    },
    {
      id: 'redo',
      category: 'Match',
      label: 'Redo Score',
      shortcut: 'R',
      icon: <RotateCcw size={16} className="rotate-180" />,
      run: redoScore,
    },
    {
      id: 'next-game',
      category: 'Match',
      label: 'Start Next Game in Match',
      shortcut: 'N',
      icon: <Play size={16} />,
      run: startNextGame,
    },
    {
      id: 'jumbo-scoreboard',
      category: 'Display',
      label: 'Open Jumbo Court Scoreboard',
      shortcut: 'J',
      icon: <Tv size={16} />,
      run: () => setLargeScoreboardOpen(true),
    },
    {
      id: 'live-stats',
      category: 'Analytics',
      label: 'Toggle Live Stats Slideout Drawer',
      shortcut: 'S',
      icon: <BarChart2 size={16} />,
      run: toggleLiveStatsDrawer,
    },
    {
      id: 'match-report',
      category: 'Analytics',
      label: 'Open Post-Match Analytics Dashboard',
      shortcut: 'D',
      icon: <BarChart2 size={16} />,
      run: () => setStatsModalOpen(true),
    },
    {
      id: 'training-mode',
      category: 'Training',
      label: 'Open Solo Training & Drills',
      shortcut: 'T',
      icon: <Target size={16} />,
      run: () => setTrainingModalOpen(true),
    },
    {
      id: 'player-profiles',
      category: 'Profiles',
      label: 'View Player Profiles & Head-to-Head',
      shortcut: 'P',
      icon: <Users size={16} />,
      run: () => setProfilesModalOpen(true),
    },
    {
      id: 'low-power',
      category: 'System',
      label: isLowPowerMode ? 'Disable Low-Power Mode' : 'Enable Low-Power Mode (15 FPS)',
      icon: isLowPowerMode ? <BatteryCharging size={16} /> : <Battery size={16} />,
      run: toggleLowPowerMode,
    },
    {
      id: 'tutorial',
      category: 'System',
      label: 'Quickstart Onboarding Guide',
      icon: <HelpCircle size={16} />,
      run: () => setOnboardingOpen(true),
    },
    {
      id: 'privacy',
      category: 'System',
      label: 'Privacy Architecture Guarantee',
      icon: <ShieldCheck size={16} />,
      run: () => setPrivacyModalOpen(true),
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      haptics.selection();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      haptics.selection();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const action = filtered[selectedIndex];
      if (action) {
        haptics.medium();
        action.run();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col backdrop-blur-3xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/5 gap-3">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-white/5">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No matching actions found for &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((action, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={action.id}
                  onClick={() => {
                    haptics.medium();
                    action.run();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-300 font-medium'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isSelected ? 'text-emerald-400' : 'text-slate-400'}>
                      {action.icon}
                    </span>
                    <span className="font-medium text-slate-200">{action.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {action.category}
                    </span>
                  </div>

                  {action.shortcut && (
                    <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-400 border border-white/5">
                      {action.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Helper */}
        <div className="px-4 py-2 border-t border-white/5 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Dismiss</span>
          </div>
          <span className="flex items-center gap-1 text-[10px]">
            <Command size={10} /> + K
          </span>
        </div>
      </div>
    </div>
  );
};
