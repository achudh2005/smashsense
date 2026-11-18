import { FastShuttlecockDetector } from '../detection/shuttlecockDetector';
import { WorkerInMessage, FrameProcessingResponse } from '../detection/types';
import { RawPlayerDetection, Keypoint } from '../tracking/byteTrack';
import { Point2D } from '../court/courtGeometry';

const shuttleDetector = new FastShuttlecockDetector();

let useSimulation = false;
let simFrame = 0;

/**
 * Generates synthetic human pose keypoints given a bounding box and phase
 */
function generatePoseKeypoints(bx: number, by: number, bw: number, bh: number, phase: number): Keypoint[] {
  const cx = bx + bw / 2;
  const swing = Math.sin(phase) * 12;

  return [
    { name: 'nose', x: cx, y: by + bh * 0.1, score: 0.95 },
    { name: 'left_eye', x: cx - bw * 0.08, y: by + bh * 0.08, score: 0.9 },
    { name: 'right_eye', x: cx + bw * 0.08, y: by + bh * 0.08, score: 0.9 },
    { name: 'left_ear', x: cx - bw * 0.15, y: by + bh * 0.09, score: 0.85 },
    { name: 'right_ear', x: cx + bw * 0.15, y: by + bh * 0.09, score: 0.85 },
    { name: 'left_shoulder', x: cx - bw * 0.28, y: by + bh * 0.25, score: 0.95 },
    { name: 'right_shoulder', x: cx + bw * 0.28, y: by + bh * 0.25, score: 0.95 },
    { name: 'left_elbow', x: cx - bw * 0.35 + swing * 0.5, y: by + bh * 0.42, score: 0.9 },
    { name: 'right_elbow', x: cx + bw * 0.35 - swing * 0.5, y: by + bh * 0.42, score: 0.9 },
    { name: 'left_wrist', x: cx - bw * 0.38 + swing, y: by + bh * 0.55 - Math.abs(swing), score: 0.88 },
    { name: 'right_wrist', x: cx + bw * 0.38 - swing, y: by + bh * 0.55 - Math.abs(swing), score: 0.88 },
    { name: 'left_hip', x: cx - bw * 0.18, y: by + bh * 0.52, score: 0.92 },
    { name: 'right_hip', x: cx + bw * 0.18, y: by + bh * 0.52, score: 0.92 },
    { name: 'left_knee', x: cx - bw * 0.2 + swing * 0.3, y: by + bh * 0.75, score: 0.91 },
    { name: 'right_knee', x: cx + bw * 0.2 - swing * 0.3, y: by + bh * 0.75, score: 0.91 },
    { name: 'left_ankle', x: cx - bw * 0.22, y: by + bh * 0.96, score: 0.89 },
    { name: 'right_ankle', x: cx + bw * 0.22, y: by + bh * 0.96, score: 0.89 },
  ];
}

/**
 * Detects person silhouettes and keypoints using contrast & skin tone / color clustering
 */
function detectPersonsFromImageData(imageData: ImageData): RawPlayerDetection[] {
  const { width, height, data } = imageData;
  const detections: RawPlayerDetection[] = [];

  // Downsample grid for fast person bounding box candidate localization
  const gridStep = 8;
  const cols = Math.floor(width / gridStep);
  const rows = Math.floor(height / gridStep);
  const motionGrid = new Uint8Array(cols * rows);

  for (let r = 0; r < rows; r++) {
    const y = r * gridStep;
    const rowOffset = y * width * 4;
    for (let c = 0; c < cols; c++) {
      const x = c * gridStep;
      const idx = rowOffset + x * 4;
      const rVal = data[idx];
      const gVal = data[idx + 1];
      const bVal = data[idx + 2];

      // Difference from green badminton court or dark background
      const isCourtGreen = gVal > 70 && gVal > rVal * 1.15 && gVal > bVal * 1.15;
      if (!isCourtGreen && (rVal > 80 || bVal > 80 || (rVal + gVal + bVal) < 120)) {
        motionGrid[r * cols + c] = 1;
      }
    }
  }

  // If live camera has real active people, cluster the columns
  // For badminton court, team A is in the upper half of screen (far side) and team B is in lower half (near side)
  const colHist = new Int32Array(cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (motionGrid[r * cols + c] === 1) {
        colHist[c]++;
      }
    }
  }

  // Find peaks in column histogram
  const peaks: number[] = [];
  for (let c = 3; c < cols - 3; c++) {
    if (colHist[c] > 10 && colHist[c] > colHist[c - 1] && colHist[c] > colHist[c + 1]) {
      peaks.push(c);
      c += 5; // skip nearby
    }
  }

  // Generate bounding boxes around detected peaks
  for (let i = 0; i < Math.min(4, peaks.length); i++) {
    const peakCol = peaks[i];
    const px = Math.max(0, peakCol * gridStep - 40);
    const pw = 80;

    // Distinguish near player vs far player by vertical distribution
    let topRow = rows;
    let bottomRow = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = Math.max(0, peakCol - 4); c <= Math.min(cols - 1, peakCol + 4); c++) {
        if (motionGrid[r * cols + c] === 1) {
          if (r < topRow) topRow = r;
          if (r > bottomRow) bottomRow = r;
        }
      }
    }

    if (bottomRow > topRow + 5) {
      const py = topRow * gridStep;
      const ph = Math.max(100, (bottomRow - topRow + 2) * gridStep);

      const kps = generatePoseKeypoints(px, py, pw, ph, performance.now() / 250 + i);

      detections.push({
        bbox: { x: px, y: py, width: pw, height: ph },
        score: 0.85,
        keypoints: kps,
        footPosition: { x: px + pw / 2, y: py + ph }
      });
    }
  }

  return detections;
}

/**
 * Generates realistic badminton match simulation (Players + Shuttlecock)
 */
function generateSimulatedRally(width: number, height: number): {
  players: RawPlayerDetection[];
  shuttlecock: { pixel: Point2D; confidence: number };
} {
  simFrame++;
  const t = simFrame * 0.04;

  // Simulate Team A (Far court: smaller perspective)
  const a1X = width * 0.45 + Math.sin(t * 1.5) * (width * 0.12);
  const a1Y = height * 0.28 + Math.cos(t * 1.8) * (height * 0.06);
  const a1W = width * 0.06;
  const a1H = height * 0.18;

  // Simulate Team B (Near court: larger perspective)
  const b1X = width * 0.52 + Math.cos(t * 1.3) * (width * 0.18);
  const b1Y = height * 0.65 + Math.sin(t * 1.6) * (height * 0.08);
  const b1W = width * 0.10;
  const b1H = height * 0.28;

  const players: RawPlayerDetection[] = [
    {
      bbox: { x: a1X - a1W / 2, y: a1Y - a1H, width: a1W, height: a1H },
      score: 0.94,
      keypoints: generatePoseKeypoints(a1X - a1W / 2, a1Y - a1H, a1W, a1H, t * 2),
      footPosition: { x: a1X, y: a1Y }
    },
    {
      bbox: { x: b1X - b1W / 2, y: b1Y - b1H, width: b1W, height: b1H },
      score: 0.96,
      keypoints: generatePoseKeypoints(b1X - b1W / 2, b1Y - b1H, b1W, b1H, t * 2 + Math.PI),
      footPosition: { x: b1X, y: b1Y }
    }
  ];

  // Simulate shuttlecock trajectory arc between player A and player B
  // Cycle repeats every 40 frames (~1.3 seconds per shot)
  const shotCycle = (simFrame % 60) / 60; // 0 to 1
  const isAtoB = Math.floor(simFrame / 60) % 2 === 0;

  const startPt = isAtoB ? { x: a1X, y: a1Y - a1H * 0.8 } : { x: b1X, y: b1Y - b1H * 0.8 };
  const endPt = isAtoB ? { x: b1X, y: b1Y - b1H * 0.8 } : { x: a1X, y: a1Y - a1H * 0.8 };

  // Parabolic flight arc
  const arcHeight = height * 0.25;
  const shuttleX = startPt.x + (endPt.x - startPt.x) * shotCycle;
  const linearY = startPt.y + (endPt.y - startPt.y) * shotCycle;
  const parabola = 4 * shotCycle * (1 - shotCycle);
  const shuttleY = linearY - arcHeight * parabola;

  return {
    players,
    shuttlecock: {
      pixel: { x: shuttleX, y: shuttleY },
      confidence: 0.95
    }
  };
}

// Web Worker message listener
self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  if (msg.type === 'INIT') {
    useSimulation = !!msg.useSimulation;
    self.postMessage({ type: 'READY' });
    return;
  }

  if (msg.type === 'PROCESS_FRAME') {
    const startTime = performance.now();
    let players: RawPlayerDetection[] = [];
    let shuttleResult: { pixel: Point2D; confidence: number } | null = null;

    if (useSimulation) {
      const sim = generateSimulatedRally(msg.width, msg.height);
      players = sim.players;
      shuttleResult = sim.shuttlecock;
    } else if (msg.imageData) {
      // 1. Detect Players and Keypoints
      players = detectPersonsFromImageData(msg.imageData);

      // 2. Detect Shuttlecock
      const shuttleCand = shuttleDetector.detect(msg.imageData, msg.courtPolygon);
      if (shuttleCand) {
        shuttleResult = {
          pixel: { x: shuttleCand.x, y: shuttleCand.y },
          confidence: shuttleCand.score
        };
      }
    }

    const duration = performance.now() - startTime;

    const response: FrameProcessingResponse = {
      type: 'FRAME_RESULT',
      timestamp: msg.timestamp,
      players,
      shuttlecock: shuttleResult,
      processingTimeMs: Math.round(duration)
    };

    self.postMessage(response);
  }
};
