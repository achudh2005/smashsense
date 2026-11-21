import { Point2D } from '../court/courtGeometry';
import { RawPlayerDetection } from '../tracking/byteTrack';
import { AutoCourtDetectionResult } from '../court/autoCourtDetector';

export interface FrameProcessingRequest {
  type: 'PROCESS_FRAME';
  imageBitmap?: ImageBitmap;
  imageData?: ImageData;
  width: number;
  height: number;
  timestamp: number;
  courtPolygon?: Point2D[]; // in pixel space
}

export interface FrameProcessingResponse {
  type: 'FRAME_RESULT';
  timestamp: number;
  players: RawPlayerDetection[];
  shuttlecock: {
    pixel: Point2D;
    confidence: number;
  } | null;
  processingTimeMs: number;
  detectedCourt?: AutoCourtDetectionResult;
}

export interface WorkerInitMessage {
  type: 'INIT';
  useSimulation?: boolean;
}

export interface WorkerResetAutoDetectMessage {
  type: 'RESET_AUTO_DETECT';
}

export type WorkerInMessage = FrameProcessingRequest | WorkerInitMessage | WorkerResetAutoDetectMessage;
export type WorkerOutMessage = FrameProcessingResponse | { type: 'READY' };
