import React, { useState } from 'react';
import { Download, RefreshCw, Sparkles, Copy, Check, Info } from 'lucide-react';
import { Button, TooltipAnchor } from '@librechat/client';
import { dataService, type TImageGenerateResponse } from 'librechat-data-provider';
import DialogImage from './DialogImage';
import { cn } from '~/utils';

export interface GeneratedImageMetadata {
  prompt: string;
  negative_prompt?: string;
  model?: string;
  seed: number;
  steps: number;
  sampler: string;
  cfg_scale: number;
  engine: 'comfyui' | 'automatic1111' | 'openai';
  width: number;
  height: number;
}

export interface GeneratedImageCardProps {
  src: string;
  metadata: GeneratedImageMetadata;
  altText?: string;
  onRegenerated?: (newResult: TImageGenerateResponse) => void;
  className?: string;
}

export default function GeneratedImageCard({
  src,
  metadata,
  altText = 'Generated Image',
  onRegenerated,
  className,
}: GeneratedImageCardProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [currentMeta, setCurrentMeta] = useState(metadata);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(currentSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentMeta.engine || 'generated'}_seed_${currentMeta.seed}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement('a');
      a.href = currentSrc;
      a.download = `generated_image_${currentMeta.seed}.png`;
      a.target = '_blank';
      a.click();
    }
  };

  const handleRegenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRegenerating) return;
    setIsRegenerating(true);
    try {
      const res = await dataService.generateImage({
        prompt: currentMeta.prompt,
        negative_prompt: currentMeta.negative_prompt,
        width: currentMeta.width,
        height: currentMeta.height,
        steps: currentMeta.steps,
        cfg_scale: currentMeta.cfg_scale,
        sampler: currentMeta.sampler,
        model: currentMeta.model,
        engine: currentMeta.engine,
        seed: -1, // randomized seed
      });

      if (res.success) {
        const newUrl = res.url || res.filepath || res.base64 || '';
        setCurrentSrc(newUrl);
        setCurrentMeta(res.metadata);
        if (onRegenerated) {
          onRegenerated(res);
        }
      }
    } catch (err) {
      console.error('Failed to regenerate image:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopySeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(currentMeta.seed));
    setCopiedSeed(true);
    setTimeout(() => setCopiedSeed(false), 2000);
  };

  return (
    <div
      className={cn(
        'group relative my-3 max-w-lg overflow-hidden rounded-2xl border border-border-light bg-surface-primary shadow-lg transition-all hover:shadow-xl dark:border-white/10 dark:bg-zinc-900',
        className,
      )}
    >
      {/* Main Image Container */}
      <div
        className="relative cursor-pointer overflow-hidden bg-black/5 dark:bg-black/40"
        onClick={() => setIsLightboxOpen(true)}
      >
        <img
          src={currentSrc}
          alt={altText}
          className={cn(
            'h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]',
            isRegenerating && 'opacity-40 blur-xs transition-opacity',
          )}
        />

        {/* Loading Overlay when regenerating */}
        {isRegenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white backdrop-blur-xs">
            <RefreshCw className="size-8 animate-spin text-purple-400" />
            <span className="text-xs font-medium tracking-wide">Synthesizing new variation...</span>
          </div>
        )}

        {/* Floating Quick Action Overlay */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 transition-opacity group-hover:opacity-100">
          <TooltipAnchor
            description="Regenerate with new seed"
            render={
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-md transition hover:bg-black/80 hover:text-purple-300 disabled:opacity-50"
              >
                <RefreshCw className={cn('size-3.5', isRegenerating && 'animate-spin')} />
              </button>
            }
          />
          <TooltipAnchor
            description="Download original"
            render={
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-md transition hover:bg-black/80 hover:text-blue-300"
              >
                <Download className="size-3.5" />
              </button>
            }
          />
          <TooltipAnchor
            description="Toggle generation parameters"
            render={
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails((prev) => !prev);
                }}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-md transition hover:bg-black/80',
                  showDetails && 'bg-purple-600/80 text-white',
                )}
              >
                <Info className="size-3.5" />
              </button>
            }
          />
        </div>

        {/* Engine Badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/90 shadow-md backdrop-blur-md">
          <Sparkles className="size-3 text-purple-400" />
          <span className="uppercase">{currentMeta.engine || 'SD'}</span>
          {currentMeta.model && (
            <>
              <span className="text-white/40">•</span>
              <span className="max-w-[120px] truncate text-white/80">{currentMeta.model}</span>
            </>
          )}
        </div>
      </div>

      {/* Generation Metadata Details Bar */}
      <div className="border-t border-border-light bg-surface-primary/80 px-3.5 py-2.5 text-xs backdrop-blur-md dark:border-white/5 dark:bg-zinc-900/90">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {/* Seed badge with copy */}
            <button
              type="button"
              onClick={handleCopySeed}
              className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              title="Click to copy seed"
            >
              <span>Seed: {currentMeta.seed}</span>
              {copiedSeed ? (
                <Check className="size-3 text-emerald-500" />
              ) : (
                <Copy className="size-3 opacity-60" />
              )}
            </button>

            {/* Steps Badge */}
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Steps: {currentMeta.steps}
            </span>

            {/* Sampler Badge */}
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Sampler: {currentMeta.sampler}
            </span>

            {/* CFG Badge */}
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              CFG: {currentMeta.cfg_scale}
            </span>
          </div>

          {/* Dimension badge */}
          <span className="text-[11px] font-medium text-text-secondary">
            {currentMeta.width}x{currentMeta.height}
          </span>
        </div>

        {/* Collapsible Details Drawer */}
        {showDetails && (
          <div className="mt-2.5 space-y-1.5 rounded-lg border border-border-light bg-surface-secondary/50 p-2.5 text-[11px] leading-relaxed dark:border-white/5 dark:bg-zinc-800/40">
            <div>
              <span className="font-semibold text-text-primary">Prompt: </span>
              <span className="text-text-secondary">{currentMeta.prompt}</span>
            </div>
            {currentMeta.negative_prompt && (
              <div>
                <span className="font-semibold text-red-500/90">Negative: </span>
                <span className="text-text-secondary">{currentMeta.negative_prompt}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <DialogImage
        isOpen={isLightboxOpen}
        onOpenChange={setIsLightboxOpen}
        src={currentSrc}
        downloadImage={handleDownload}
        args={{
          prompt: currentMeta.prompt,
          quality: 'high',
          size: `${currentMeta.width}x${currentMeta.height}`,
          model: currentMeta.model,
          seed: currentMeta.seed,
          steps: currentMeta.steps,
          sampler: currentMeta.sampler,
        }}
      />
    </div>
  );
}
