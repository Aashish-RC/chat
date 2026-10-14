import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button, Input, Label, SecretInput, OGDialog, OGDialogTemplate } from '@librechat/client';
import type { JSONSchema } from '~/components/Tools/Valves';
import type { ConfigFieldDetail } from '~/common';
import {
  CONFIG_HTML_BLOCK_TAGS,
  CONFIG_HTML_CLASS_ATTR,
  createConfigHtmlSanitizer,
} from '~/utils/configHtml';
import { ValvesForm } from '~/components/Tools/Valves';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface MCPConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  fieldsSchema: Record<string, ConfigFieldDetail>;
  initialValues: Record<string, string>;
  onSave: (updatedValues: Record<string, string>) => void;
  isSubmitting?: boolean;
  onRevoke?: () => void;
  serverName: string;
  valvesSchema?: JSONSchema | Record<string, unknown> | null;
  initialValves?: Record<string, unknown>;
  onSaveValves?: (valves: Record<string, unknown>) => void;
}

export default function MCPConfigDialog({
  isOpen,
  onOpenChange,
  fieldsSchema,
  initialValues,
  onSave,
  isSubmitting = false,
  onRevoke,
  serverName,
  valvesSchema,
  initialValves,
  onSaveValves,
}: MCPConfigDialogProps) {
  const localize = useLocalize();
  const hasFields = Object.keys(fieldsSchema).length > 0;
  const [activeTab, setActiveTab] = useState<'variables' | 'valves'>(() =>
    !hasFields && valvesSchema ? 'valves' : 'variables',
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Record<string, string>>({
    defaultValues: initialValues,
  });

  const sanitize = useMemo(
    () =>
      createConfigHtmlSanitizer({
        allowedTags: CONFIG_HTML_BLOCK_TAGS,
        allowedAttr: CONFIG_HTML_CLASS_ATTR,
      }),
    [],
  );

  useEffect(() => {
    if (isOpen) {
      reset(initialValues);
      if (!hasFields && valvesSchema) {
        setActiveTab('valves');
      } else {
        setActiveTab('variables');
      }
    }
  }, [isOpen, initialValues, reset, hasFields, valvesSchema]);

  const onFormSubmit = (data: Record<string, string>) => {
    onSave(data);
  };

  const handleRevoke = () => {
    if (onRevoke) {
      onRevoke();
    }
  };

  const dialogTitle = localize('com_ui_configure_mcp_variables_for', { 0: serverName });

  return (
    <OGDialog open={isOpen} onOpenChange={onOpenChange}>
      <OGDialogTemplate
        className="sm:max-w-lg"
        title={dialogTitle}
        headerClassName="px-6 pt-6 pb-2"
        main={
          <div className="flex flex-col">
            {valvesSchema && hasFields && (
              <div className="flex border-b border-border-light px-6 pb-3 pt-1 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('variables')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    activeTab === 'variables'
                      ? 'bg-surface-secondary text-text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {localize('com_ui_mcp_variables') || 'Variables'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('valves')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    activeTab === 'valves'
                      ? 'bg-surface-secondary text-text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {localize('com_ui_valves')}
                </button>
              </div>
            )}

            {activeTab === 'valves' && valvesSchema ? (
              <div className="px-6 py-3 max-h-[60vh] overflow-y-auto">
                <ValvesForm
                  schema={valvesSchema}
                  initialValues={initialValves}
                  onSave={onSaveValves}
                  isSubmitting={isSubmitting}
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 px-6 pb-2 pt-2">
                {Object.entries(fieldsSchema).map(([key, details]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key} className="text-sm font-medium">
                      {details.title}
                    </Label>
                    <Controller
                      name={key}
                      control={control}
                      defaultValue={initialValues[key] || ''}
                      render={({ field }) => {
                        const placeholder = localize('com_ui_mcp_enter_var', { 0: details.title });
                        const className =
                          'w-full rounded-md border-border-medium focus:border-border-heavy focus:ring-ring-primary sm:text-sm';
                        if (details.sensitive === false) {
                          return (
                            <Input
                              id={key}
                              {...field}
                              type="text"
                              placeholder={placeholder}
                              className={className}
                            />
                          );
                        }
                        return (
                          <SecretInput
                            id={key}
                            {...field}
                            autoComplete="new-password"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            controlsOnHover
                            placeholder={placeholder}
                            className={className}
                          />
                        );
                      }}
                    />
                    {details.description && (
                      <p
                        className="text-text-secondary [&_a]:text-link [&_a]:hover:text-link-hover text-xs [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: sanitize(details.description) }}
                      />
                    )}
                    {errors[key] && (
                      <p className="text-text-destructive text-xs">{errors[key]?.message}</p>
                    )}
                  </div>
                ))}
              </form>
            )}
          </div>
        }
        selection={
          activeTab === 'variables'
            ? {
                selectHandler: handleSubmit(onFormSubmit),
                selectClasses:
                  'bg-surface-submit text-text-on-status hover:bg-surface-submit-hover',
                selectText: isSubmitting ? localize('com_ui_saving') : localize('com_ui_save'),
              }
            : undefined
        }
        buttons={
          onRevoke && activeTab === 'variables' ? (
            <Button variant="destructive" onClick={handleRevoke} disabled={isSubmitting}>
              {localize('com_ui_revoke')}
            </Button>
          ) : undefined
        }
        footerClassName="flex justify-end gap-2 px-6 pb-6 pt-2"
        showCancelButton={true}
      />
    </OGDialog>
  );
}
