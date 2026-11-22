import React, { useState, useEffect } from 'react';
import { Zap, Flame, Trophy, AlertCircle, TrendingUp, Sparkles } from 'lucide-react';

export type BroadcastGraphicType =
  | 'SMASH_SPEED'
  | 'RALLY_OF_MATCH'
  | 'GAME_POINT'
  | 'MATCH_POINT'
  | 'INTERVAL_LEAD'
  | 'SCORING_RUN';

export interface BroadcastGraphicItem {
  id: string;
  type: BroadcastGraphicType;
  title: string;
  subtitle: string;
  accentColor?: string; // Tailwind color class or hex
  value?: string | number;
}

interface BroadcastGraphicsOverlayProps {
  currentGraphic: BroadcastGraphicItem | null;
  onDismiss?: () => void;
}

export const BroadcastGraphicsOverlay: React.FC<BroadcastGraphicsOverlayProps> = ({
  currentGraphic,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (currentGraphic) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) setTimeout(onDismiss, 400);
      }, 4200);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [currentGraphic, onDismiss]);

  if (!currentGraphic && !visible) return null;

  const item = currentGraphic;
  if (!item) return null;

  const getIcon = () => {
    switch (item.type) {
      case 'SMASH_SPEED':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'RALLY_OF_MATCH':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'GAME_POINT':
      case 'MATCH_POINT':
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 'INTERVAL_LEAD':
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'SCORING_RUN':
        return <Sparkles className="w-5 h-5 text-sky-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-neutral-400" />;
    }
  };

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-out pointer-events-none ${
        visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-6 scale-95'
      }`}
    >
      <div className="flex items-stretch rounded-2xl bg-neutral-950/95 border border-neutral-700/80 shadow-2xl backdrop-blur-xl overflow-hidden text-white min-w-[280px] sm:min-w-[420px] max-w-lg">
        {/* Left Color Accent Bar with Live Indicator */}
        <div className="w-2.5 bg-gradient-to-b from-amber-400 via-rose-500 to-emerald-400 animate-pulse" />

        {/* Main Content Area */}
        <div className="flex-1 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
              {getIcon()}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono">
                  {item.title}
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-neutral-100 tracking-tight">
                {item.subtitle}
              </p>
            </div>
          </div>

          {/* Right Value Badge if present */}
          {item.value && (
            <div className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col items-end">
              <span className="text-base sm:text-lg font-black font-mono tracking-tight text-white">
                {item.value}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
