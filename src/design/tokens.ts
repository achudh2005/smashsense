/**
 * SmashSense Apple-Grade Design System Tokens
 * Strictly adherence to 4/8pt spatial grid, SF Pro typography scale,
 * semantic color hierarchy, and physical spring animations.
 */

export const typography = {
  fontStack:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif',
  fontMono:
    'ui-monospace, "SF Mono", "Menlo", "Monaco", "Cascadia Mono", monospace',
  scale: {
    hero: 'text-4xl sm:text-5xl font-black tracking-tight leading-none',
    title1: 'text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight',
    title2: 'text-lg sm:text-xl font-bold tracking-tight leading-snug',
    headline: 'text-sm sm:text-base font-semibold leading-normal',
    body: 'text-xs sm:text-sm font-normal leading-relaxed text-slate-300',
    caption: 'text-[11px] font-medium tracking-wide uppercase text-slate-400',
    footnote: 'text-[10px] font-normal text-slate-500',
  },
  tabularNums: {
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum"',
  },
} as const;

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const radii = {
  sm: 'rounded-lg', // 8px
  md: 'rounded-xl', // 12px
  lg: 'rounded-2xl', // 16px
  xl: 'rounded-3xl', // 24px
  full: 'rounded-full',
} as const;

export const materials = {
  // Translucent Apple Glass Materials
  ultraThin:
    'bg-slate-950/40 backdrop-blur-md border border-white/5 text-slate-200',
  thin:
    'bg-slate-950/65 backdrop-blur-xl border border-white/10 text-slate-200',
  regular:
    'bg-slate-900/80 backdrop-blur-2xl border border-white/10 text-slate-100 shadow-xl',
  thick:
    'bg-slate-900/95 backdrop-blur-3xl border border-white/15 text-white shadow-2xl',
  sheet:
    'bg-slate-900/98 backdrop-blur-2xl border-t border-white/10 text-slate-100 shadow-2xl',
} as const;

export const colors = {
  court: {
    emerald: '#10b981',
    emeraldHover: '#059669',
    emeraldSubtle: 'rgba(16, 185, 129, 0.12)',
    courtLine: 'rgba(255, 255, 255, 0.90)',
    courtSurface: 'rgba(16, 185, 129, 0.08)',
  },
  teams: {
    teamA: '#38bdf8', // Azure Sky
    teamASubtle: 'rgba(56, 189, 248, 0.12)',
    teamB: '#fb923c', // Tangerine
    teamBSubtle: 'rgba(251, 146, 60, 0.12)',
  },
  system: {
    in: '#10b981',
    out: '#f43f5e',
    warning: '#f59e0b',
    neutral: '#94a3b8',
  },
} as const;

export const motionTokens = {
  spring: {
    sheet: { type: 'spring', stiffness: 360, damping: 32 },
    snappy: { type: 'spring', stiffness: 420, damping: 28 },
    gentle: { type: 'spring', stiffness: 280, damping: 30 },
  },
  fade: {
    duration: 0.18,
    ease: [0.16, 1, 0.3, 1],
  },
} as const;
