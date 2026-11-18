import React from 'react';
import { ScoreAuditEntry } from '../game/scoringEngine';
import { X, ShieldCheck, Clock, Zap, MapPin } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ReadonlyArray<ScoreAuditEntry>;
  teamAName: string;
  teamBName: string;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  entries,
  teamAName,
  teamBName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              BWF Scoring Audit Trail ({entries.length} Events)
            </h2>
            <p className="text-xs text-slate-400">
              Complete verifiable log of every auto-call and manual correction
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No points recorded yet in this match.
            </div>
          ) : (
            <div className="space-y-2">
              {entries.slice().reverse().map((entry) => {
                const isTeamA = entry.scoredBy === 'A';
                const teamLabel = isTeamA ? teamAName : teamBName;
                const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <div
                    key={entry.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs hover:border-slate-700 transition-colors"
                  >
                    {/* Left: Score Badge & Point Winner */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 font-mono font-bold text-sm px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-100">
                        <span className="text-sky-300">{entry.scoreA}</span>
                        <span className="text-slate-500">-</span>
                        <span className="text-orange-300">{entry.scoreB}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isTeamA ? 'bg-sky-400' : 'bg-orange-500'
                            }`}
                          />
                          <span className="font-bold text-slate-200">
                            Point to {teamLabel} ({entry.scoredBy})
                          </span>
                          {entry.isAutoCall ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                              AUTO
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                              MANUAL
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{entry.reason}</p>
                      </div>
                    </div>

                    {/* Right: Metrics & Details */}
                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      {entry.shuttleSpeedKmh && (
                        <div className="flex items-center gap-1 text-yellow-300 font-mono">
                          <Zap size={12} />
                          <span>{entry.shuttleSpeedKmh} km/h</span>
                        </div>
                      )}
                      {entry.landingZone && (
                        <div className="flex items-center gap-1 text-slate-300">
                          <MapPin size={12} />
                          <span>{entry.landingZone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 font-mono text-slate-500">
                        <Clock size={12} />
                        <span>{timeStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
