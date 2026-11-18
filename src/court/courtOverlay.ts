import { Matrix3x3, projectPoint } from './homography';
import { getStandardCourtLines, STANDARD_COURT_CORNERS, Point2D } from './courtGeometry';

export interface CourtRenderOptions {
  lineWidth?: number;
  lineColor?: string;
  netColor?: string;
  fillCourt?: boolean;
  courtFillColor?: string;
  showLabels?: boolean;
  showServiceBoxes?: boolean;
}

/**
 * Draws the calibrated badminton court wireframe onto a 2D canvas context.
 */
export function drawCourtOverlay(
  ctx: CanvasRenderingContext2D,
  courtToImage: Matrix3x3,
  options: CourtRenderOptions = {}
): void {
  const {
    lineWidth = 2.5,
    lineColor = '#ffffff',
    netColor = '#ef4444',
    fillCourt = true,
    courtFillColor = 'rgba(21, 128, 61, 0.12)', // subtle court green tint
  } = options;

  ctx.save();

  // 1. Fill Court Area with subtle green mat color if requested
  if (fillCourt) {
    const projectedCorners = STANDARD_COURT_CORNERS.map(c => projectPoint(courtToImage, c));
    ctx.beginPath();
    ctx.moveTo(projectedCorners[0].x, projectedCorners[0].y);
    for (let i = 1; i < projectedCorners.length; i++) {
      ctx.lineTo(projectedCorners[i].x, projectedCorners[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = courtFillColor;
    ctx.fill();
  }

  // 2. Draw all standard court lines
  const lines = getStandardCourtLines();

  for (const line of lines) {
    const p1 = projectPoint(courtToImage, line.from);
    const p2 = projectPoint(courtToImage, line.to);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);

    if (line.isNet) {
      // Net Line styling
      ctx.strokeStyle = netColor;
      ctx.lineWidth = lineWidth * 1.6;
      ctx.setLineDash([]);
      ctx.stroke();

      // Net Mesh Pattern / Ribbon
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = lineWidth * 0.8;
      ctx.stroke();
    } else {
      // Standard White Lines
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([]);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws the calibration pins with touch/click targets and optional magnifier loupe.
 */
export function drawCalibrationPins(
  ctx: CanvasRenderingContext2D,
  corners: Point2D[],
  selectedIndex: number | null = null,
  activeHoverIndex: number | null = null
): void {
  const labels = ['TL (Far Left)', 'TR (Far Right)', 'BR (Near Right)', 'BL (Near Left)'];
  const colors = ['#38bdf8', '#38bdf8', '#f97316', '#f97316'];

  ctx.save();

  corners.forEach((corner, idx) => {
    const isSelected = selectedIndex === idx;
    const isHovered = activeHoverIndex === idx;
    const radius = isSelected ? 16 : isHovered ? 14 : 12;

    // Outer glow
    ctx.beginPath();
    ctx.arc(corner.x, corner.y, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.4)' : 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // Main pin circle
    ctx.beginPath();
    ctx.arc(corner.x, corner.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = colors[idx];
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Center crosshair
    ctx.beginPath();
    ctx.moveTo(corner.x - 6, corner.y);
    ctx.lineTo(corner.x + 6, corner.y);
    ctx.moveTo(corner.x, corner.y - 6);
    ctx.lineTo(corner.x, corner.y + 6);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label pill
    ctx.font = 'bold 12px ui-monospace, monospace';
    const text = labels[idx];
    const textWidth = ctx.measureText(text).width;
    const pillY = idx < 2 ? corner.y - radius - 12 : corner.y + radius + 20;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(corner.x - textWidth / 2 - 8, pillY - 14, textWidth + 16, 22, 6);
    ctx.fill();
    ctx.strokeStyle = colors[idx];
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, corner.x, pillY - 3);
  });

  ctx.restore();
}
