import React, { useEffect, useState, useRef } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { TooltipAnchor, IconButton } from '@librechat/client';
import useAudioLevels from '~/hooks/Input/useAudioLevels';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export interface VoiceRecordingBarProps {
  recording: boolean;
  transcribing?: boolean;
  durationSeconds?: number;
  onCancel: () => void;
  onConfirm: () => void;
  className?: string;
}

const BAR_COUNT = 32;

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function VoiceRecordingBar({
  recording,
  transcribing = false,
  durationSeconds = 0,
  onCancel,
  onConfirm,
  className,
}: VoiceRecordingBarProps) {
  const localize = useLocalize();
  const readAudioLevel = useAudioLevels(recording);
  const [bars, setBars] = useState<number[]>(() => new Array(BAR_COUNT).fill(0.1));
  const rafRef = useRef<number | null>(null);
  const lastSampleRef = useRef<number>(0);

  useEffect(() => {
    if (!recording) {
      setBars(new Array(BAR_COUNT).fill(0.1));
      return;
    }

    const update = (now: number) => {
      if (now - lastSampleRef.current >= 60) {
        lastSampleRef.current = now;
        const currentLevel = readAudioLevel() ?? 0;
        setBars((prev) => {
          const next = [...prev.slice(1), Math.max(0.1, currentLevel)];
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [recording, readAudioLevel]);

  return (
    <div
      data-testid="voice-recording-bar"
      className={cn(
        'relative flex w-full items-center justify-between gap-3 rounded-2xl',
        'border border-border-light bg-surface-secondary/90 px-4 py-2.5 shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      {/* Recording status & indicator */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="relative flex size-3 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-red-500" />
        </span>
        <span className="text-text-primary text-xs font-semibold tabular-nums tracking-wide">
          {formatDuration(durationSeconds)}
        </span>
      </div>

      {/* Waveform Bars */}
      <div
        className="flex h-7 flex-1 items-center justify-center gap-1 overflow-hidden px-2"
        aria-hidden="true"
      >
        {bars.map((level, idx) => (
          <div
            key={idx}
            className={cn(
              'w-1 rounded-full transition-all duration-75',
              transcribing
                ? 'bg-text-tertiary'
                : 'bg-indigo-500 dark:bg-indigo-400',
            )}
            style={{
              height: `${Math.min(100, Math.max(14, level * 100))}%`,
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex shrink-0 items-center gap-1.5">
        <TooltipAnchor
          description={localize('com_ui_voice_cancel_recording')}
          render={
            <IconButton
              type="button"
              label={localize('com_ui_voice_cancel_recording')}
              aria-label={localize('com_ui_voice_cancel_recording')}
              data-testid="cancel-recording-button"
              variant="ghost"
              size="sm"
              className="text-text-secondary hover:text-text-primary hover:bg-surface-hover size-8 rounded-full"
              onClick={onCancel}
            >
              <X className="size-4" />
            </IconButton>
          }
        />

        {transcribing ? (
          <div className="flex size-8 items-center justify-center rounded-full bg-surface-tertiary text-text-secondary">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          <TooltipAnchor
            description={localize('com_ui_voice_confirm_recording')}
            render={
              <IconButton
                type="button"
                label={localize('com_ui_voice_confirm_recording')}
                aria-label={localize('com_ui_voice_confirm_recording')}
                data-testid="confirm-recording-button"
                variant="primary"
                size="sm"
                className="size-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                onClick={onConfirm}
              >
                <Check className="size-4" />
              </IconButton>
            }
          />
        )}
      </div>
    </div>
  );
}
