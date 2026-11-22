import React, { useState, useEffect } from 'react';
import {
  StoryCardOptions,
  renderStoryCardToBlob,
  downloadStoryCardPng,
  shareStoryCard,
} from '../export/storyCardGenerator';
import { X, Download, Share2, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface StoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: StoryCardOptions;
}

export const StoryCardModal: React.FC<StoryCardModalProps> = ({
  isOpen,
  onClose,
  options,
}) => {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let activeUrl = '';
    setIsGenerating(true);
    renderStoryCardToBlob(options)
      .then((b) => {
        setBlob(b);
        activeUrl = URL.createObjectURL(b);
        setPreviewUrl(activeUrl);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.error(err);
        setIsGenerating(false);
      });

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [isOpen, options]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!blob) return;
    downloadStoryCardPng(blob, `smashsense-${options.teamAName}-vs-${options.teamBName}.png`);
    haptics.success();
  };

  const handleShare = async () => {
    if (!blob) return;
    const ok = await shareStoryCard(blob);
    if (ok) {
      setIsShared(true);
      setTimeout(() => setIsShared(false), 2500);
      haptics.success();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-lg animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Match Story & Poster Card</h2>
              <p className="text-xs text-neutral-400">1080x1920 (9:16 vertical) Instagram & Strava format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Card Image Preview */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-neutral-900/40">
          {isGenerating ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <RefreshCw className="w-8 h-8 animate-spin text-pink-400" />
              <p className="text-xs">Generating high-resolution 1080x1920 graphic...</p>
            </div>
          ) : previewUrl ? (
            <div className="w-64 sm:w-72 aspect-[9/16] rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-2xl shadow-pink-950/20 transition-transform hover:scale-[1.02]">
              <img
                src={previewUrl}
                alt="SmashSense Match Story Preview"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="text-xs text-rose-400">Failed to render card</div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/90">
          <div className="text-xs text-neutral-400 flex items-center gap-1.5">
            {isShared ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Shared successfully!</span>
              </>
            ) : (
              <span>Ready for Instagram, WhatsApp & TikTok</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownload}
              disabled={!blob}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
            <button
              onClick={handleShare}
              disabled={!blob}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-pink-500/25"
            >
              <Share2 className="w-4 h-4" />
              Share Story
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
