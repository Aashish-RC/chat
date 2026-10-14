import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Sliders,
  Maximize2,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Check,
} from 'lucide-react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  OGDialogClose,
  Button,
} from '@librechat/client';
import { dataService, type TImageGenerateResponse } from 'librechat-data-provider';
import GeneratedImageCard from '~/components/Chat/Messages/Content/GeneratedImageCard';
import { cn } from '~/utils';

export interface ImageGenModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
  onImageGenerated?: (result: TImageGenerateResponse) => void;
}

const ASPECT_RATIOS = [
  { label: '1:1 Square', width: 512, height: 512, icon: '▢' },
  { label: '3:2 Landscape', width: 768, height: 512, icon: '▭' },
  { label: '2:3 Portrait', width: 512, height: 768, icon: '▯' },
  { label: '16:9 Cinema', width: 912, height: 512, icon: '▬' },
  { label: 'HD 1024', width: 1024, height: 1024, icon: '⬛' },
];

const SAMPLERS = ['Euler a', 'Euler', 'DPM++ 2M Karras', 'DPM++ SDE Karras', 'DDIM'];

export default function ImageGenModal({
  isOpen,
  onOpenChange,
  initialPrompt = '',
  onImageGenerated,
}: ImageGenModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]);
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7.0);
  const [sampler, setSampler] = useState(SAMPLERS[0]);
  const [engine, setEngine] = useState<'auto' | 'comfyui' | 'automatic1111' | 'openai'>('auto');
  const [seed, setSeed] = useState<number>(-1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TImageGenerateResponse | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await dataService.generateImage({
        prompt: prompt.trim(),
        negative_prompt: negativePrompt.trim() || undefined,
        width: selectedRatio.width,
        height: selectedRatio.height,
        steps,
        cfg_scale: cfgScale,
        sampler,
        seed: seed === -1 ? undefined : seed,
        engine,
      });

      if (res.success) {
        setLastResult(res);
        if (onImageGenerated) {
          onImageGenerated(res);
        }
      } else {
        setError('Image generation failed without returning an error message.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown generation failure occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <OGDialog open={isOpen} onOpenChange={onOpenChange}>
      <OGDialogContent className="border border-border-light bg-surface-primary text-text-primary max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950 sm:max-w-2xl">
        <OGDialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border-light dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md">
              <Sparkles className="size-5" />
            </div>
            <div>
              <OGDialogTitle className="text-lg font-bold tracking-tight">
                Synthesize Image
              </OGDialogTitle>
              <p className="text-xs text-text-secondary">
                Generate images locally via ComfyUI, Automatic1111, or DALL-E fallback
              </p>
            </div>
          </div>
          <OGDialogClose asChild>
            <button
              type="button"
              className="text-text-secondary hover:text-text-primary rounded-lg p-1.5 transition-colors hover:bg-surface-tertiary"
            >
              <X className="size-4" />
            </button>
          </OGDialogClose>
        </OGDialogHeader>

        <form onSubmit={handleGenerate} className="mt-4 space-y-4">
          {/* Prompt Input */}
          <div>
            <label className="text-text-primary block text-xs font-semibold tracking-wide uppercase">
              Prompt <span className="text-purple-500">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A futuristic solarpunk city with floating glass domes, vibrant bioluminescence, octane render, 8k..."
              rows={3}
              required
              className="mt-1.5 w-full rounded-xl border border-border-light bg-surface-secondary/70 p-3 text-sm text-text-primary placeholder:text-text-secondary-alt shadow-xs focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500 dark:border-white/10 dark:bg-zinc-900"
            />
          </div>

          {/* Aspect Ratio Selector */}
          <div>
            <label className="text-text-primary block text-xs font-semibold tracking-wide uppercase">
              Resolution & Aspect Ratio
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {ASPECT_RATIOS.map((ratio) => {
                const isSelected = selectedRatio.width === ratio.width && selectedRatio.height === ratio.height;
                return (
                  <button
                    key={ratio.label}
                    type="button"
                    onClick={() => setSelectedRatio(ratio)}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-xl border p-2 text-xs font-medium transition-all',
                      isSelected
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold shadow-xs'
                        : 'border-border-light bg-surface-secondary/50 text-text-secondary hover:border-border-medium hover:text-text-primary dark:border-white/5 dark:bg-zinc-900/60',
                    )}
                  >
                    <span className="text-base leading-none mb-1">{ratio.icon}</span>
                    <span className="text-[11px] truncate">{ratio.label}</span>
                    <span className="text-[9px] opacity-70">{ratio.width}×{ratio.height}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Engine Selector */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-text-primary block text-xs font-semibold tracking-wide uppercase">
                Engine Driver
              </label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as typeof engine)}
                className="mt-1.5 w-full rounded-xl border border-border-light bg-surface-secondary/70 p-2.5 text-xs text-text-primary shadow-xs focus:border-purple-500 focus:outline-hidden dark:border-white/10 dark:bg-zinc-900"
              >
                <option value="auto">Auto (ComfyUI → A1111 → DALL-E)</option>
                <option value="comfyui">ComfyUI (Local WebSocket/REST)</option>
                <option value="automatic1111">Automatic1111 (Local SD WebUI)</option>
                <option value="openai">OpenAI DALL-E (Cloud API)</option>
              </select>
            </div>

            <div>
              <label className="text-text-primary block text-xs font-semibold tracking-wide uppercase">
                Sampler
              </label>
              <select
                value={sampler}
                onChange={(e) => setSampler(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border-light bg-surface-secondary/70 p-2.5 text-xs text-text-primary shadow-xs focus:border-purple-500 focus:outline-hidden dark:border-white/10 dark:bg-zinc-900"
              >
                {SAMPLERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Accordion Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="text-text-secondary hover:text-text-primary flex items-center gap-1.5 text-xs font-semibold transition-colors"
            >
              <Sliders className="size-3.5" />
              <span>{showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings (Steps, CFG, Seed)'}</span>
              {showAdvanced ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3.5 rounded-xl border border-border-light bg-surface-secondary/30 p-3.5 dark:border-white/5 dark:bg-zinc-900/40">
                {/* Negative Prompt */}
                <div>
                  <label className="text-text-secondary block text-xs font-medium">
                    Negative Prompt
                  </label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="blurry, distorted, low quality, artifacts, watermark"
                    className="mt-1 w-full rounded-lg border border-border-light bg-surface-primary p-2 text-xs text-text-primary shadow-xs focus:border-purple-500 focus:outline-hidden dark:border-white/10 dark:bg-zinc-900"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Steps */}
                  <div>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Steps</span>
                      <span className="font-semibold text-text-primary">{steps}</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      step={1}
                      value={steps}
                      onChange={(e) => setSteps(Number(e.target.value))}
                      className="mt-1 w-full accent-purple-600"
                    />
                  </div>

                  {/* CFG Scale */}
                  <div>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>CFG Scale</span>
                      <span className="font-semibold text-text-primary">{cfgScale.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={0.5}
                      value={cfgScale}
                      onChange={(e) => setCfgScale(Number(e.target.value))}
                      className="mt-1 w-full accent-purple-600"
                    />
                  </div>

                  {/* Seed */}
                  <div>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Seed</span>
                      <button
                        type="button"
                        onClick={() => setSeed(-1)}
                        className="text-[10px] text-purple-500 hover:underline"
                      >
                        Random
                      </button>
                    </div>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value))}
                      placeholder="-1 for random"
                      className="mt-1 w-full rounded-lg border border-border-light bg-surface-primary p-1.5 text-xs text-text-primary dark:border-white/10 dark:bg-zinc-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500 dark:border-red-500/30">
              <span className="font-bold">Generation failed: </span>
              {error}
            </div>
          )}

          {/* Last Result Preview in Modal */}
          {lastResult && (
            <div className="mt-4 pt-3 border-t border-border-light dark:border-white/10">
              <span className="text-xs font-semibold text-text-primary block mb-2">Result:</span>
              <GeneratedImageCard
                src={lastResult.url || lastResult.filepath || lastResult.base64 || ''}
                metadata={lastResult.metadata}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <OGDialogClose asChild>
              <button
                type="button"
                className="rounded-xl px-4 py-2.5 text-xs font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
              >
                Close
              </button>
            </OGDialogClose>
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>Generate Image</span>
                </>
              )}
            </button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
