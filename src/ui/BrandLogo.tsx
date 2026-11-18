import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 28,
  className = '',
  showText = false,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Vector Emblem */}
      <div
        style={{ width: size, height: size }}
        className="relative rounded-xl bg-gradient-to-b from-emerald-400/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm overflow-hidden"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4/5 h-4/5 text-emerald-400"
        >
          {/* Minimalist Court Baseline Grid Lines */}
          <path
            d="M4 24H28"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M16 8V24"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Aerodynamic Shuttlecock Vector */}
          <path
            d="M20 7L13 14"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M20 7C21.6569 8.65685 21.6569 11.3431 20 13L16 17"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <circle cx="11.5" cy="15.5" r="2.25" fill="currentColor" />
          {/* Precision Trajectory Vector Arc */}
          <path
            d="M8 22C11 19 16 16 25 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2 2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-white font-sans">
              SmashSense
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              PRO
            </span>
          </div>
          <span className="text-[10px] text-slate-400 tracking-normal font-normal">
            Computer Vision Match Intelligence
          </span>
        </div>
      )}
    </div>
  );
};
