import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  Label,
  Input,
  Switch,
  Slider,
  Button,
  Select,
  Textarea,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from '@librechat/client';
import type { ValvesFormProps, ValveField } from './types';
import { parseValvesSchema, extractDefaultValues } from './schemaParser';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export default function ValvesForm({
  schema,
  initialValues,
  values: controlledValues,
  onChange,
  onSave,
  isSubmitting = false,
  readOnly = false,
  className,
}: ValvesFormProps) {
  const localize = useLocalize();
  const fields = useMemo(() => parseValvesSchema(schema), [schema]);
  const defaultValues = useMemo(() => extractDefaultValues(fields), [fields]);

  const [formState, setFormState] = useState<Record<string, unknown>>(() => ({
    ...defaultValues,
    ...(initialValues ?? {}),
    ...(controlledValues ?? {}),
  }));

  useEffect(() => {
    if (controlledValues) {
      setFormState((prev) => ({
        ...prev,
        ...controlledValues,
      }));
    } else if (initialValues) {
      setFormState({
        ...defaultValues,
        ...initialValues,
      });
    }
  }, [controlledValues, initialValues, defaultValues]);

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      setFormState((prev) => {
        const next = { ...prev, [key]: value };
        onChange?.(next);
        return next;
      });
    },
    [onChange],
  );

  const handleResetField = useCallback(
    (field: ValveField) => {
      const defVal = defaultValues[field.key];
      handleFieldChange(field.key, defVal);
    },
    [defaultValues, handleFieldChange],
  );

  const handleResetAll = useCallback(() => {
    setFormState({ ...defaultValues });
    onChange?.({ ...defaultValues });
  }, [defaultValues, onChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      onSave(formState);
    }
  };

  if (fields.length === 0) {
    return (
      <div className={cn('p-4 text-center text-xs text-text-secondary', className)}>
        {localize('com_ui_valves_no_valves')}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col space-y-4', className)}>
      <div className="flex flex-col space-y-4">
        {fields.map((field) => {
          const currentVal = formState[field.key];
          const isDefault =
            currentVal === defaultValues[field.key] ||
            (currentVal === undefined && defaultValues[field.key] === undefined);

          const min = field.minimum ?? 0;
          const max = field.maximum ?? 100;
          const step = field.step ?? (field.type === 'integer' ? 1 : 0.1);

          return (
            <div
              key={field.key}
              className="flex flex-col space-y-1.5 rounded-lg border border-border-light bg-surface-primary p-3 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={field.key} className="text-sm font-medium text-text-primary">
                    {field.title}
                  </Label>
                  {field.required && (
                    <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                      {localize('com_ui_valves_required')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleResetField(field)}
                  disabled={readOnly || isDefault}
                  className={cn(
                    'flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors',
                    isDefault
                      ? 'text-text-tertiary opacity-60'
                      : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
                  )}
                  title={localize('com_ui_valves_reset_default')}
                >
                  <RotateCcw className="size-3" />
                  <span className="text-[11px]">
                    {isDefault ? localize('com_ui_valves_default') : localize('com_ui_valves_custom')}
                  </span>
                </button>
              </div>

              {field.description && (
                <p className="text-xs text-text-secondary leading-relaxed">{field.description}</p>
              )}

              <div className="pt-1">
                {field.type === 'number' || field.type === 'integer' ? (
                  <div className="flex items-center gap-3">
                    <Slider
                      aria-label={field.title}
                      min={min}
                      max={max}
                      step={step}
                      value={[typeof currentVal === 'number' ? currentVal : min]}
                      onValueChange={([val]) => handleFieldChange(field.key, val)}
                      disabled={readOnly}
                      className="flex-1"
                    />
                    <Input
                      id={field.key}
                      type="number"
                      min={min}
                      max={max}
                      step={step}
                      value={typeof currentVal === 'number' ? currentVal : min}
                      onChange={(e) => {
                        const parsed =
                          field.type === 'integer'
                            ? parseInt(e.target.value, 10)
                            : parseFloat(e.target.value);
                        handleFieldChange(field.key, isNaN(parsed) ? min : parsed);
                      }}
                      disabled={readOnly}
                      className="w-20 text-right sm:text-xs"
                    />
                  </div>
                ) : field.type === 'boolean' ? (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-text-secondary">
                      {currentVal
                        ? localize('com_ui_valves_enabled')
                        : localize('com_ui_valves_disabled')}
                    </span>
                    <Switch
                      id={field.key}
                      aria-label={field.title}
                      checked={Boolean(currentVal)}
                      onCheckedChange={(checked) => handleFieldChange(field.key, checked)}
                      disabled={readOnly}
                    />
                  </div>
                ) : field.type === 'enum' && field.enumOptions && field.enumOptions.length > 0 ? (
                  <Select
                    value={String(currentVal ?? field.enumOptions[0].value)}
                    onValueChange={(val) => handleFieldChange(field.key, val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger id={field.key} aria-label={field.title} className="w-full">
                      <SelectValue placeholder={field.title} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.enumOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'array' || field.type === 'object' ? (
                  <Textarea
                    id={field.key}
                    rows={2}
                    value={
                      typeof currentVal === 'object' && currentVal !== null
                        ? JSON.stringify(currentVal, null, 2)
                        : String(currentVal ?? '')
                    }
                    onChange={(e) => {
                      const text = e.target.value;
                      try {
                        const parsed = JSON.parse(text);
                        handleFieldChange(field.key, parsed);
                      } catch {
                        handleFieldChange(field.key, text);
                      }
                    }}
                    disabled={readOnly}
                    placeholder={
                      field.type === 'array' ? '["item1", "item2"]' : '{"key": "value"}'
                    }
                    className="w-full font-mono text-xs"
                  />
                ) : field.isMultiline ? (
                  <Textarea
                    id={field.key}
                    rows={3}
                    value={String(currentVal ?? '')}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    disabled={readOnly}
                    placeholder={field.title}
                    className="w-full text-xs"
                  />
                ) : (
                  <Input
                    id={field.key}
                    type="text"
                    value={String(currentVal ?? '')}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    disabled={readOnly}
                    placeholder={field.title}
                    className="w-full sm:text-xs"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          type="button"
          onClick={handleResetAll}
          disabled={readOnly || isSubmitting}
          className="text-xs"
        >
          <RotateCcw className="mr-1.5 size-3.5" />
          {localize('com_ui_valves_reset_all')}
        </Button>
        {onSave && (
          <Button variant="default" type="submit" disabled={readOnly || isSubmitting}>
            {isSubmitting ? localize('com_ui_saving') : localize('com_ui_save')}
          </Button>
        )}
      </div>
    </form>
  );
}
