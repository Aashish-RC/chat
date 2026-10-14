import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { OGDialog, OGDialogHeader, OGDialogContent, OGDialogTitle } from '@librechat/client';
import type { ValvesModalProps } from './types';
import ValvesForm from './ValvesForm';
import { useLocalize } from '~/hooks';

export default function ValvesModal({
  isOpen,
  onOpenChange,
  title,
  serverName,
  toolName,
  schema,
  initialValues,
  onSave,
  isSubmitting = false,
}: ValvesModalProps) {
  const localize = useLocalize();

  const modalTitle =
    title ||
    (toolName
      ? `${toolName} ${localize('com_ui_valves')}`
      : serverName
        ? `${serverName} ${localize('com_ui_valves')}`
        : localize('com_ui_valves_title'));

  const handleSave = (values: Record<string, unknown>) => {
    onSave?.(values);
    onOpenChange(false);
  };

  return (
    <OGDialog open={isOpen} onOpenChange={onOpenChange}>
      <OGDialogContent
        className="flex max-h-[85vh] w-11/12 max-w-xl flex-col overflow-hidden"
        title={modalTitle}
      >
        <OGDialogHeader>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-text-primary" />
            <OGDialogTitle className="text-lg font-semibold">{modalTitle}</OGDialogTitle>
          </div>
          <p className="text-xs text-text-secondary">{localize('com_ui_valves_description')}</p>
        </OGDialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <ValvesForm
            schema={schema}
            initialValues={initialValues}
            onSave={handleSave}
            isSubmitting={isSubmitting}
          />
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
