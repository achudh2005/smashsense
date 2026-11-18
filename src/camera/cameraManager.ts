export type CameraResolution = '480p' | '720p' | '1080p';

export interface ResolutionConfig {
  width: number;
  height: number;
  label: string;
}

export const RESOLUTION_PRESETS: Record<CameraResolution, ResolutionConfig> = {
  '480p': { width: 854, height: 480, label: '480p (Fastest / Mobile)' },
  '720p': { width: 1280, height: 720, label: '720p (Balanced 60fps)' },
  '1080p': { width: 1920, height: 1080, label: '1080p (High Precision)' },
};

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  facing: 'user' | 'environment' | 'unknown';
}

export class CameraManager {
  private currentStream: MediaStream | null = null;

  public async getAvailableCameras(): Promise<CameraDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      return videoDevices.map((d, index) => {
        let facing: 'user' | 'environment' | 'unknown' = 'unknown';
        const labelLower = d.label.toLowerCase();
        if (labelLower.includes('back') || labelLower.includes('rear') || labelLower.includes('environment')) {
          facing = 'environment';
        } else if (labelLower.includes('front') || labelLower.includes('user') || labelLower.includes('face')) {
          facing = 'user';
        }

        return {
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
          facing,
        };
      });
    } catch (err) {
      console.warn('Failed to enumerate media devices:', err);
      return [];
    }
  }

  public async startStream(
    facingMode: 'user' | 'environment' = 'environment',
    resolution: CameraResolution = '720p',
    deviceId?: string
  ): Promise<MediaStream> {
    this.stopStream();

    const targetRes = RESOLUTION_PRESETS[resolution];

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId
        ? {
            deviceId: { exact: deviceId },
            width: { ideal: targetRes.width },
            height: { ideal: targetRes.height },
            frameRate: { ideal: 60, min: 24 },
          }
        : {
            facingMode: { ideal: facingMode },
            width: { ideal: targetRes.width },
            height: { ideal: targetRes.height },
            frameRate: { ideal: 60, min: 24 },
          },
    };

    try {
      this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.currentStream;
    } catch (err) {
      console.warn('Failed with ideal constraints, trying basic video constraints', err);
      // Fallback without strict dimensions
      this.currentStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode },
      });
      return this.currentStream;
    }
  }

  public stopStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => {
        track.stop();
      });
      this.currentStream = null;
    }
  }

  public getStream(): MediaStream | null {
    return this.currentStream;
  }
}

export const cameraManager = new CameraManager();
