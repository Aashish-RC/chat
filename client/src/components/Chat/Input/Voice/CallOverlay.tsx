import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { Mic, MicOff, PhoneOff, Volume2, Sparkles } from 'lucide-react';
import { TooltipAnchor, IconButton } from '@librechat/client';
import usePauseGlobalAudio from '~/hooks/Audio/usePauseGlobalAudio';
import type { Dictation } from '~/hooks/Input/useDictation';
import useAudioLevels from '~/hooks/Input/useAudioLevels';
import { useLocalize } from '~/hooks';
import VoiceOrb from './VoiceOrb';
import store from '~/store';
import { cn } from '~/utils';

export interface CallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  dictation: Dictation;
  isSubmitting: boolean;
  stopGenerating?: () => void;
  index?: number;
  modelName?: string;
}

const SPEECH_THRESHOLD = 0.08;
const SILENCE_TIMEOUT_MS = 1800;

export default function CallOverlay({
  isOpen,
  onClose,
  dictation,
  isSubmitting,
  stopGenerating,
  index = 0,
  modelName,
}: CallOverlayProps) {
  const localize = useLocalize();
  const { pauseGlobalAudio } = usePauseGlobalAudio(index);
  const isGlobalAudioPlaying = useRecoilValue(store.globalAudioPlayingFamily(index));

  const [muted, setMuted] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);

  const assistantSpeaking =
    isGlobalAudioPlaying ||
    (typeof window !== 'undefined' && window.speechSynthesis?.speaking === true);

  const status = isSubmitting
    ? 'thinking'
    : assistantSpeaking
      ? 'speaking'
      : 'listening';

  const readAudioLevel = useAudioLevels(isOpen && dictation.active && !muted);

  const userHasSpokenRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Automatically start recording when call overlay opens
  useEffect(() => {
    if (!isOpen) {
      userHasSpokenRef.current = false;
      return;
    }

    if (!dictation.active && !muted && !isSubmitting && !assistantSpeaking) {
      dictation.start();
    }
  }, [isOpen, dictation, muted, isSubmitting, assistantSpeaking]);

  // Audio level monitoring, silence detection, and barge-in
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const checkAudio = () => {
      const level = readAudioLevel() ?? 0;
      setCurrentLevel(level);

      const now = performance.now();

      // 1. Barge-in detection: if assistant is speaking or thinking and user speaks loudly
      if ((assistantSpeaking || isSubmitting) && level > SPEECH_THRESHOLD * 1.5) {
        pauseGlobalAudio();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        stopGenerating?.();
        if (!dictation.active && !muted) {
          dictation.start();
        }
        userHasSpokenRef.current = true;
        lastSpeechTimeRef.current = now;
      }

      // 2. User speaking detection
      if (level > SPEECH_THRESHOLD) {
        userHasSpokenRef.current = true;
        lastSpeechTimeRef.current = now;
      }

      // 3. Silence detection for auto-send
      if (
        userHasSpokenRef.current &&
        dictation.active &&
        !isSubmitting &&
        !assistantSpeaking &&
        now - lastSpeechTimeRef.current > SILENCE_TIMEOUT_MS
      ) {
        userHasSpokenRef.current = false;
        dictation.stopAndSend();
      }

      rafRef.current = requestAnimationFrame(checkAudio);
    };

    rafRef.current = requestAnimationFrame(checkAudio);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [
    isOpen,
    readAudioLevel,
    assistantSpeaking,
    isSubmitting,
    pauseGlobalAudio,
    stopGenerating,
    dictation,
    muted,
  ]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleEndCall();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggleMute = useCallback(() => {
    if (muted) {
      setMuted(false);
      if (!dictation.active && !isSubmitting) {
        dictation.start();
      }
    } else {
      setMuted(true);
      if (dictation.active) {
        dictation.stopToComposer();
      }
    }
  }, [muted, dictation, isSubmitting]);

  const handleEndCall = useCallback(() => {
    pauseGlobalAudio();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (dictation.active) {
      dictation.stopToComposer();
    }
    onClose();
  }, [pauseGlobalAudio, dictation, onClose]);

  if (!isOpen) {
    return null;
  }

  let statusLabel = localize('com_ui_voice_listening');
  if (status === 'thinking') {
    statusLabel = localize('com_ui_voice_thinking');
  } else if (status === 'speaking') {
    statusLabel = localize('com_ui_voice_speaking');
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Interactive Voice Call"
      data-testid="call-overlay"
      className={cn(
        'fixed inset-0 z-50 flex flex-col justify-between items-center',
        'bg-neutral-950/90 backdrop-blur-2xl text-white select-none transition-all duration-300',
        'p-6 sm:p-10',
      )}
    >
      {/* Header bar */}
      <div className="flex w-full max-w-2xl items-center justify-between text-neutral-400">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-indigo-400" />
          <span className="text-sm font-medium tracking-wide text-neutral-200">
            {modelName ? `${modelName} · Voice Call` : 'Interactive Voice Call'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-neutral-300 backdrop-blur-md">
            <span
              className={cn(
                'size-2 rounded-full',
                status === 'listening' && 'bg-emerald-400 animate-pulse',
                status === 'thinking' && 'bg-amber-400 animate-ping',
                status === 'speaking' && 'bg-indigo-400 animate-pulse',
              )}
            />
            <span>{statusLabel}</span>
          </div>
        </div>
      </div>

      {/* Main Orb Area */}
      <div className="flex flex-col items-center justify-center gap-6 my-auto">
        <VoiceOrb
          level={muted ? 0 : currentLevel}
          muted={muted}
          speaking={assistantSpeaking || status === 'thinking'}
          className="scale-125 sm:scale-150"
        />

        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2 className="text-xl sm:text-2xl font-light tracking-wide text-neutral-100">
            {statusLabel}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-sm">
            {muted
              ? 'Microphone is muted. Tap unmute to speak.'
              : status === 'speaking'
                ? 'Speak anytime to interrupt and ask a new question.'
                : 'Speak naturally. Silence automatically sends your message.'}
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex w-full max-w-md items-center justify-center gap-6 pb-4">
        {/* Mute Button */}
        <TooltipAnchor
          description={
            muted
              ? localize('com_ui_voice_unmute')
              : localize('com_ui_voice_mute')
          }
          render={
            <IconButton
              type="button"
              label={
                muted
                  ? localize('com_ui_voice_unmute')
                  : localize('com_ui_voice_mute')
              }
              aria-label={
                muted
                  ? localize('com_ui_voice_unmute')
                  : localize('com_ui_voice_mute')
              }
              data-testid="mute-call-button"
              variant="ghost"
              size="lg"
              className={cn(
                'size-14 rounded-full transition-all duration-200',
                muted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
              )}
              onClick={handleToggleMute}
            >
              {muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
            </IconButton>
          }
        />

        {/* End Call Button */}
        <TooltipAnchor
          description={localize('com_ui_voice_end_call')}
          render={
            <IconButton
              type="button"
              label={localize('com_ui_voice_end_call')}
              aria-label={localize('com_ui_voice_end_call')}
              data-testid="end-call-button"
              variant="primary"
              size="lg"
              className="size-16 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 active:scale-95 transition-all"
              onClick={handleEndCall}
            >
              <PhoneOff className="size-7" />
            </IconButton>
          }
        />
      </div>
    </div>
  );
}
