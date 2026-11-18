import React, { useState, useCallback } from 'react';
import { Point2D } from '../court/courtGeometry';
import { computeCourtCalibration } from '../court/homography';
import { useSmashSenseStore } from '../game/gameState';
import { db } from '../storage/db';
import { Check, RotateCcw, Save, Crosshair, MapPin } from 'lucide-react';

interface CalibrationOverlayProps {
  videoWidth: number;
  videoHeight: number;
}

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  videoWidth,
  videoHeight,
}) => {
  const screenCorners = useSmashSenseStore((s) => s.screenCorners);
  const activeVenueName = useSmashSenseStore((s) => s.activeVenueName);
  const setCalibrationCorners = useSmashSenseStore((s) => s.setCalibrationCorners);
  const setCalibrationMode = useSmashSenseStore((s) => s.setCalibrationMode);

  const [activeCornerIdx, setActiveCornerIdx] = useState<number>(0);
  const [localCorners, setLocalCorners] = useState<Point2D[]>(screenCorners);
  const [venueName, setVenueName] = useState<string>(activeVenueName || 'My Court');
  const [isSaved, setIsSaved] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Loupe / Magnifier coordinates
  const [cursorPos, setCursorPos] = useState<Point2D | null>(null);
  const [showLoupe, setShowLoupe] = useState(false);

  const cornerLabels = [
    { name: 'Top-Left', desc: 'Far Left Baseline' },
    { name: 'Top-Right', desc: 'Far Right Baseline' },
    { name: 'Bottom-Right', desc: 'Near Right Baseline' },
    { name: 'Bottom-Left', desc: 'Near Left Baseline' },
  ];

  // Update store when local corners change
  const applyCalibration = useCallback(
    (corners: Point2D[]) => {
      setLocalCorners(corners);
      setCalibrationCorners(corners, venueName);
    },
    [setCalibrationCorners, venueName]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * videoWidth;
    const y = ((e.clientY - rect.top) / rect.height) * videoHeight;

    // Check if clicked near an existing pin (radius ~35px)
    let clickedPinIdx = -1;
    localCorners.forEach((corner, idx) => {
      const dist = Math.hypot(corner.x - x, corner.y - y);
      if (dist < 38) {
        clickedPinIdx = idx;
      }
    });

    if (clickedPinIdx !== -1) {
      setDraggingIdx(clickedPinIdx);
      setActiveCornerIdx(clickedPinIdx);
    } else {
      // Place the currently selected corner at clicked point
      const updated = [...localCorners];
      updated[activeCornerIdx] = { x: Math.round(x), y: Math.round(y) };
      applyCalibration(updated);
      setDraggingIdx(activeCornerIdx);
      // Advance to next corner automatically if setting up sequentially
      setActiveCornerIdx((prev) => (prev + 1) % 4);
    }

    setCursorPos({ x, y });
    setShowLoupe(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(videoWidth, ((e.clientX - rect.left) / rect.width) * videoWidth));
    const y = Math.max(0, Math.min(videoHeight, ((e.clientY - rect.top) / rect.height) * videoHeight));

    setCursorPos({ x, y });

    if (draggingIdx !== null) {
      const updated = [...localCorners];
      updated[draggingIdx] = { x: Math.round(x), y: Math.round(y) };
      applyCalibration(updated);
    }
  };

  const handlePointerUp = () => {
    setDraggingIdx(null);
    setShowLoupe(false);
  };

  const handleSaveVenue = async () => {
    try {
      const { matrix, inverse } = computeCourtCalibration(localCorners);
      const venueId = await db.venues.add({
        name: venueName,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      });

      await db.calibrations.add({
        venueId: Number(venueId),
        venueName,
        screenCorners: localCorners,
        courtToImageMatrix: matrix,
        imageToCourtMatrix: inverse,
        cameraResolution: `${videoWidth}x${videoHeight}`,
        updatedAt: Date.now(),
      });

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.warn('Failed to save venue calibration:', err);
    }
  };

  const handleResetDefault = () => {
    const defaultCorners: Point2D[] = [
      { x: videoWidth * 0.30, y: videoHeight * 0.16 }, // TL
      { x: videoWidth * 0.70, y: videoHeight * 0.16 }, // TR
      { x: videoWidth * 0.88, y: videoHeight * 0.86 }, // BR
      { x: videoWidth * 0.12, y: videoHeight * 0.86 }, // BL
    ];
    applyCalibration(defaultCorners);
  };

  return (
    <div
      className="absolute inset-0 z-40 touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top Banner with Calibration Controls */}
      <div
        className="absolute top-14 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl space-y-3 pointer-events-auto"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-sm text-slate-100">Court Calibration</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefault}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Reset corners to default centered perspective"
            >
              <RotateCcw size={13} />
              Reset
            </button>
            <button
              onClick={() => setCalibrationMode(false)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
            >
              <Check size={14} />
              Done
            </button>
          </div>
        </div>

        {/* 4 Corner Selector Tabs */}
        <div className="grid grid-cols-4 gap-2">
          {cornerLabels.map((lbl, idx) => {
            const isSelected = activeCornerIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveCornerIdx(idx)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-950'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">{lbl.name}</span>
                <span className="text-[9px] text-slate-400 truncate w-full">{lbl.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Venue Save Bar */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
          <MapPin size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="Venue name (e.g. Club Court 2)"
            className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleSaveVenue}
            disabled={isSaved}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              isSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {isSaved ? <Check size={13} /> : <Save size={13} />}
            {isSaved ? 'Saved!' : 'Save Venue'}
          </button>
        </div>
      </div>

      {/* Floating Loupe Magnifier for precise touch placement */}
      {showLoupe && cursorPos && (
        <div
          className="pointer-events-none fixed z-50 w-28 h-28 rounded-full border-2 border-emerald-400 bg-slate-900/90 shadow-2xl overflow-hidden flex items-center justify-center"
          style={{
            left: `${Math.min(window.innerWidth - 130, Math.max(10, (cursorPos.x / videoWidth) * window.innerWidth - 60))}px`,
            top: `${Math.max(10, (cursorPos.y / videoHeight) * window.innerHeight - 150)}px`,
          }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Loupe crosshair */}
            <div className="absolute w-full h-[1px] bg-emerald-400/80" />
            <div className="absolute h-full w-[1px] bg-emerald-400/80" />
            <div className="w-3 h-3 rounded-full border border-emerald-300" />
            <span className="absolute bottom-1 text-[9px] font-mono text-emerald-300 font-bold">
              {Math.round(cursorPos.x)}, {Math.round(cursorPos.y)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
