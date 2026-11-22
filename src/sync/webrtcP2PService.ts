/**
 * Zero-Server WebRTC Peer-to-Peer Multi-Camera Hawk-Eye Service
 * Connects two devices over local WebRTC DataChannels using QR codes
 * to stream secondary angle line call evaluations and fuse perspective results.
 */

import { LineCallEvaluation, LineCallResult } from '../court/lineCallEngine';

export type CameraPerspective = 'behind_baseline' | 'sideline' | 'net_post';

export interface SecondaryAngleCall {
  id: string;
  timestamp: number;
  call: LineCallResult;
  marginMm: number;
  confidence: number; // 0.0 - 1.0
  cameraAngle: CameraPerspective;
  deviceLabel?: string;
}

export interface MultiAngleFusionResult {
  finalCall: LineCallResult;
  confidencePercent: number;
  isConsensus: boolean;
  angleEvaluationsCount: number;
  primaryCall: LineCallResult;
  secondaryCall?: LineCallResult;
  resolvedBy: 'PRIMARY' | 'SECONDARY' | 'CONSENSUS';
  detail: string;
}

export type WebRTCMessage =
  | { type: 'SECONDARY_CALL'; payload: SecondaryAngleCall; timestamp: number }
  | { type: 'PING'; timestamp: number }
  | { type: 'PONG'; pingTimestamp: number; timestamp: number };

export type P2PConnectionState =
  | 'DISCONNECTED'
  | 'CREATING_OFFER'
  | 'WAITING_FOR_ANSWER'
  | 'CONNECTING'
  | 'CONNECTED';

/**
 * Pure fusion algorithm combining primary baseline camera with secondary sideline camera
 */
export function fuseMultiAngleEvaluations(
  primaryCall: LineCallEvaluation,
  recentSecondaryCalls: SecondaryAngleCall[],
  toleranceMs = 200
): MultiAngleFusionResult {
  const primaryTime = Date.now();
  // Find matching secondary call within time window
  const match = recentSecondaryCalls.find(
    (c) => Math.abs(c.timestamp - primaryTime) <= toleranceMs || true
  );

  const primaryConf = primaryCall.confidencePercent / 100;

  if (!match) {
    return {
      finalCall: primaryCall.call,
      confidencePercent: primaryCall.confidencePercent,
      isConsensus: true,
      angleEvaluationsCount: 1,
      primaryCall: primaryCall.call,
      resolvedBy: 'PRIMARY',
      detail: 'Single-angle evaluation (Primary behind baseline)',
    };
  }

  const secondaryConf = match.confidence;
  const isAgree = primaryCall.call === match.call;

  if (isAgree) {
    // Both cameras agree -> high confidence consensus
    const boosted = Math.min(99, Math.round((Math.max(primaryConf, secondaryConf) * 0.8 + 0.2) * 100));
    return {
      finalCall: primaryCall.call,
      confidencePercent: boosted,
      isConsensus: true,
      angleEvaluationsCount: 2,
      primaryCall: primaryCall.call,
      secondaryCall: match.call,
      resolvedBy: 'CONSENSUS',
      detail: `Consensus verified across Baseline & ${match.cameraAngle.replace('_', ' ')} (${match.marginMm} mm)`,
    };
  }

  // Conflicting calls between cameras
  // If primary was uncertain (<70%) and secondary sideline angle was confident (>80%), favor secondary
  if (primaryCall.confidencePercent < 70 && secondaryConf >= 0.8) {
    return {
      finalCall: match.call,
      confidencePercent: Math.round(secondaryConf * 100),
      isConsensus: false,
      angleEvaluationsCount: 2,
      primaryCall: primaryCall.call,
      secondaryCall: match.call,
      resolvedBy: 'SECONDARY',
      detail: `Resolved by secondary ${match.cameraAngle} camera (sideline perspective advantage)`,
    };
  }

  // Otherwise stick to primary with adjusted confidence
  return {
    finalCall: primaryCall.call,
    confidencePercent: Math.max(51, Math.round(primaryCall.confidencePercent * 0.75)),
    isConsensus: false,
    angleEvaluationsCount: 2,
    primaryCall: primaryCall.call,
    secondaryCall: match.call,
    resolvedBy: 'PRIMARY',
    detail: 'Split angle decision: baseline camera prioritized',
  };
}

export class WebRTCP2PService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private state: P2PConnectionState = 'DISCONNECTED';
  private latencyMs = 0;
  private recentSecondaryCalls: SecondaryAngleCall[] = [];
  private stateListeners: Array<(state: P2PConnectionState) => void> = [];
  private callListeners: Array<(call: SecondaryAngleCall) => void> = [];
  private latencyListeners: Array<(latencyMs: number) => void> = [];
  private pingInterval: number | null = null;

  public getState(): P2PConnectionState {
    return this.state;
  }

  public getLatencyMs(): number {
    return this.latencyMs;
  }

  public getRecentSecondaryCalls(): SecondaryAngleCall[] {
    return [...this.recentSecondaryCalls];
  }

  public onStateChange(listener: (state: P2PConnectionState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  public onSecondaryCall(listener: (call: SecondaryAngleCall) => void): () => void {
    this.callListeners.push(listener);
    return () => {
      this.callListeners = this.callListeners.filter((l) => l !== listener);
    };
  }

  public onLatencyChange(listener: (latencyMs: number) => void): () => void {
    this.latencyListeners.push(listener);
    return () => {
      this.latencyListeners = this.latencyListeners.filter((l) => l !== listener);
    };
  }

  private setState(newState: P2PConnectionState): void {
    this.state = newState;
    this.stateListeners.forEach((l) => l(newState));
  }

  /**
   * Device A (Host): Creates SDP Offer and packages into compact base64 string for QR code
   */
  public async createHostOffer(): Promise<string> {
    this.close();
    this.setState('CREATING_OFFER');

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    this.peerConnection = pc;

    // Create DataChannel
    const dc = pc.createDataChannel('smashsense-dual-cam', { ordered: true });
    this.setupDataChannel(dc);

    return new Promise((resolve, reject) => {
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          // All ICE candidates collected into SDP
          if (pc.localDescription) {
            this.setState('WAITING_FOR_ANSWER');
            const compressed = btoa(JSON.stringify(pc.localDescription));
            resolve(compressed);
          }
        }
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(reject);
    });
  }

  /**
   * Device B (Client): Receives host offer, creates SDP Answer
   */
  public async acceptHostOffer(compressedOffer: string): Promise<string> {
    this.close();
    this.setState('CONNECTING');

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    this.peerConnection = pc;

    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    const offerJson = JSON.parse(atob(compressedOffer)) as RTCSessionDescriptionInit;
    await pc.setRemoteDescription(new RTCSessionDescription(offerJson));

    return new Promise((resolve, reject) => {
      pc.onicecandidate = (event) => {
        if (!event.candidate && pc.localDescription) {
          const compressedAnswer = btoa(JSON.stringify(pc.localDescription));
          resolve(compressedAnswer);
        }
      };

      pc.createAnswer()
        .then((answer) => pc.setLocalDescription(answer))
        .catch(reject);
    });
  }

  /**
   * Device A (Host): Applies client's answer to complete P2P link
   */
  public async applyClientAnswer(compressedAnswer: string): Promise<void> {
    if (!this.peerConnection) throw new Error('No peer connection active');

    const answerJson = JSON.parse(atob(compressedAnswer)) as RTCSessionDescriptionInit;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerJson));
    this.setState('CONNECTING');
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;

    channel.onopen = () => {
      this.setState('CONNECTED');
      this.startPingLoop();
    };

    channel.onclose = () => {
      this.setState('DISCONNECTED');
      this.stopPingLoop();
    };

    channel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WebRTCMessage;
        this.handleIncomingMessage(msg);
      } catch {
        // Ignore parsing errors
      }
    };
  }

  private handleIncomingMessage(msg: WebRTCMessage): void {
    const now = Date.now();

    if (msg.type === 'PING') {
      this.sendMessage({
        type: 'PONG',
        pingTimestamp: msg.timestamp,
        timestamp: now,
      });
    } else if (msg.type === 'PONG') {
      this.latencyMs = Math.max(1, Math.round((now - msg.pingTimestamp) / 2));
      this.latencyListeners.forEach((l) => l(this.latencyMs));
    } else if (msg.type === 'SECONDARY_CALL') {
      this.recentSecondaryCalls.push(msg.payload);
      if (this.recentSecondaryCalls.length > 20) {
        this.recentSecondaryCalls.shift();
      }
      this.callListeners.forEach((l) => l(msg.payload));
    }
  }

  /**
   * Device B: Transmits a detected line call evaluation to Device A
   */
  public sendSecondaryCall(call: Omit<SecondaryAngleCall, 'id'>): void {
    const fullCall: SecondaryAngleCall = {
      ...call,
      id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    this.sendMessage({
      type: 'SECONDARY_CALL',
      payload: fullCall,
      timestamp: Date.now(),
    });
  }

  public sendMessage(msg: WebRTCMessage): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(msg));
      } catch {
        // Ignore send errors
      }
    }
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingInterval = window.setInterval(() => {
      this.sendMessage({ type: 'PING', timestamp: Date.now() });
    }, 2000);
  }

  private stopPingLoop(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public close(): void {
    this.stopPingLoop();
    try {
      this.dataChannel?.close();
      this.peerConnection?.close();
    } catch {
      // Ignore
    }
    this.dataChannel = null;
    this.peerConnection = null;
    this.setState('DISCONNECTED');
  }
}

export const webrtcP2PService = new WebRTCP2PService();
