import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  webrtcP2PService,
  P2PConnectionState,
  SecondaryAngleCall,
  CameraPerspective,
} from '../sync/webrtcP2PService';
import { X, Smartphone, Wifi, CheckCircle2, Copy, RefreshCw } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface DualCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DualCameraModal: React.FC<DualCameraModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [role, setRole] = useState<'HOST' | 'CLIENT'>('HOST');
  const [p2pState, setP2pState] = useState<P2PConnectionState>(webrtcP2PService.getState());
  const [latencyMs, setLatencyMs] = useState(webrtcP2PService.getLatencyMs());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [offerString, setOfferString] = useState<string>('');
  const [answerInput, setAnswerInput] = useState<string>('');
  const [clientOfferInput, setClientOfferInput] = useState<string>('');
  const [clientAnswerString, setClientAnswerString] = useState<string>('');
  const [clientPerspective, setClientPerspective] = useState<CameraPerspective>('sideline');
  const [recentCalls, setRecentCalls] = useState<SecondaryAngleCall[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setP2pState(webrtcP2PService.getState());
    setLatencyMs(webrtcP2PService.getLatencyMs());
    setRecentCalls(webrtcP2PService.getRecentSecondaryCalls());

    const unsubState = webrtcP2PService.onStateChange(setP2pState);
    const unsubLat = webrtcP2PService.onLatencyChange(setLatencyMs);
    const unsubCalls = webrtcP2PService.onSecondaryCall((call) => {
      setRecentCalls((prev) => [call, ...prev.slice(0, 9)]);
    });

    return () => {
      unsubState();
      unsubLat();
      unsubCalls();
    };
  }, [isOpen]);

  // Host: Generate Offer & QR Code on mount or switch to HOST
  useEffect(() => {
    if (isOpen && role === 'HOST' && p2pState === 'DISCONNECTED') {
      webrtcP2PService.createHostOffer().then((offer) => {
        setOfferString(offer);
        QRCode.toDataURL(offer, { width: 280, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
          .then(setQrDataUrl)
          .catch(console.warn);
      });
    }
  }, [isOpen, role, p2pState]);

  if (!isOpen) return null;

  const handleApplyAnswer = async () => {
    if (!answerInput.trim()) return;
    try {
      await webrtcP2PService.applyClientAnswer(answerInput.trim());
      haptics.success();
    } catch {
      haptics.warning();
    }
  };

  const handleClientJoin = async () => {
    if (!clientOfferInput.trim()) return;
    try {
      const answer = await webrtcP2PService.acceptHostOffer(clientOfferInput.trim());
      setClientAnswerString(answer);
      haptics.success();
    } catch {
      haptics.warning();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    haptics.selection();
  };

  const handleSendTestCall = (call: 'IN' | 'OUT', marginMm: number) => {
    webrtcP2PService.sendSecondaryCall({
      timestamp: Date.now(),
      call,
      marginMm,
      confidence: 0.92,
      cameraAngle: clientPerspective,
      deviceLabel: 'Device B (Sideline Phone)',
    });
    haptics.success();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">Dual-Phone Wireless Hawk-Eye</h2>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    p2pState === 'CONNECTED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {p2pState === 'CONNECTED' ? `CONNECTED (${latencyMs}ms RTT)` : p2pState}
                </span>
              </div>
              <p className="text-xs text-neutral-400">Zero-server peer-to-peer multi-angle synchronization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-900/40 p-1">
          <button
            onClick={() => setRole('HOST')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors ${
              role === 'HOST'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Device A (Primary Baseline Host)
          </button>
          <button
            onClick={() => setRole('CLIENT')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors ${
              role === 'CLIENT'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Device B (Secondary Sideline Client)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {role === 'HOST' ? (
            /* HOST MODE */
            <div className="space-y-6">
              {p2pState !== 'CONNECTED' ? (
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/50">
                  {/* QR Code */}
                  <div className="w-52 h-52 bg-white p-2 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="WebRTC Pairing QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="space-y-3 text-xs">
                    <div className="font-semibold text-neutral-200 text-sm">
                      1. Scan or Copy Pairing Code
                    </div>
                    <p className="text-neutral-400 text-xs leading-relaxed">
                      Place Device B at the sideline or net post. Point its camera at this QR code or copy the pairing payload below.
                    </p>
                    <button
                      onClick={() => handleCopy(offerString)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {isCopied ? 'Copied to Clipboard!' : 'Copy Pairing Payload'}
                    </button>

                    {/* Paste Answer Input */}
                    <div className="pt-2 space-y-1.5">
                      <label className="text-[11px] text-neutral-400 block font-medium">
                        2. Paste Answer from Device B:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={answerInput}
                          onChange={(e) => setAnswerInput(e.target.value)}
                          placeholder="Paste response payload..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 font-mono text-[11px] text-neutral-200"
                        />
                        <button
                          onClick={handleApplyAnswer}
                          className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold text-xs shrink-0"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Already connected */
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-emerald-200">
                        P2P Multi-Camera Linked & Synchronized
                      </div>
                      <div className="text-xs text-emerald-400/80">
                        Device B transmitting secondary line observations • RTT Latency: {latencyMs}ms
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => webrtcP2PService.close()}
                    className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/60"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* Recent Secondary Angle Stream */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Live Secondary Angle Stream (Received from Device B)
                </h3>
                {recentCalls.length === 0 ? (
                  <div className="p-4 rounded-xl border border-neutral-800/80 bg-neutral-900/30 text-xs text-neutral-500 text-center">
                    Awaiting line evaluation events from secondary camera...
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900/50">
                    {recentCalls.map((c) => (
                      <div key={c.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[11px] ${
                              c.call === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {c.call}
                          </span>
                          <span className="text-neutral-300 font-medium">
                            {c.cameraAngle.toUpperCase()} • {c.marginMm} mm
                          </span>
                        </div>
                        <span className="text-neutral-500 font-mono text-[11px]">
                          {Math.round(c.confidence * 100)}% Conf
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* CLIENT MODE */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-200">Connect to Device A</h3>
                  <p className="text-xs text-neutral-400">
                    Paste the pairing payload from Device A to generate the return answer
                  </p>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={clientOfferInput}
                    onChange={(e) => setClientOfferInput(e.target.value)}
                    placeholder="Paste Device A offer payload here..."
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 font-mono text-xs text-neutral-200"
                  />
                  <button
                    onClick={handleClientJoin}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold text-xs"
                  >
                    Generate Return Answer
                  </button>
                </div>

                {clientAnswerString && (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-emerald-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
                      <span>Copy this return payload and paste into Device A:</span>
                      <button
                        onClick={() => handleCopy(clientAnswerString)}
                        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-200"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400 truncate">
                      {clientAnswerString}
                    </div>
                  </div>
                )}
              </div>

              {/* Perspective & Send Test Observation */}
              <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300">Camera Placement Angle:</span>
                  <select
                    value={clientPerspective}
                    onChange={(e) => setClientPerspective(e.target.value as CameraPerspective)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-200 font-medium"
                  >
                    <option value="sideline">Sideline (Right/Left)</option>
                    <option value="net_post">Net Post (Front)</option>
                    <option value="behind_baseline">Elevated Corner</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => handleSendTestCall('IN', 8)}
                    className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-colors"
                  >
                    Send "IN (8mm)" Call
                  </button>
                  <button
                    onClick={() => handleSendTestCall('OUT', 12)}
                    className="flex-1 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-colors"
                  >
                    Send "OUT (12mm)" Call
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Wifi className="w-4 h-4 text-sky-400" />
            <span>Zero server video transmission • Local data channel</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-semibold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
