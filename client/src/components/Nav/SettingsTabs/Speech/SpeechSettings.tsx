import React from 'react';
import VoiceInterfaceModeSelector from './STT/VoiceInterfaceModeSelector';

export { VoiceInterfaceModeSelector };

export default function SpeechSettings() {
  return (
    <div className="flex flex-col gap-3">
      <VoiceInterfaceModeSelector />
    </div>
  );
}
