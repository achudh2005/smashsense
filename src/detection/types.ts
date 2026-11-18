import { Point2D } from '../court/courtGeometry';
import { RawPlayerDetection } from '../tracking/byteTrack';

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
}

export interface WorkerInitMessage {
  type: 'INIT';
  useSimulation?: boolean;
}

export type WorkerInMessage = FrameProcessingRequest | WorkerInitMessage;
export type WorkerOutMessage = FrameProcessingResponse | { type: 'READY' };
