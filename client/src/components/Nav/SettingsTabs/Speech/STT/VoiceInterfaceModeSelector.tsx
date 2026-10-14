import React from 'react';
import { Dropdown } from '@librechat/client';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useLocalize } from '~/hooks';
import store from '~/store';

export default function VoiceInterfaceModeSelector() {
  const localize = useLocalize();
  const [voiceInterfaceMode, setVoiceInterfaceMode] = useRecoilState<'fullscreen' | 'side'>(
    store.voiceInterfaceMode,
  );
  const speechToText = useRecoilValue(store.speechToText);

  const options = [
    { value: 'fullscreen', label: localize('com_nav_voice_mode_fullscreen') },
    { value: 'side', label: localize('com_nav_voice_mode_side') },
  ];

  const handleSelect = (value: string) => {
    setVoiceInterfaceMode(value as 'fullscreen' | 'side');
  };

  const labelId = 'voice-interface-mode-label';

  return (
    <div className="flex items-center justify-between">
      <div id={labelId}>{localize('com_nav_voice_interface_mode')}</div>
      <Dropdown
        value={voiceInterfaceMode}
        onChange={handleSelect}
        options={options}
        sizeClasses="z-50 w-[min(16rem,90vw)]"
        testId="VoiceInterfaceModeDropdown"
        className="z-50"
        aria-labelledby={labelId}
        disabled={!speechToText}
      />
    </div>
  );
}
