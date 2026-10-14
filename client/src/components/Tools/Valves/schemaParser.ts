import type { JSONSchema, JSONSchemaProperty, ValveField, ValveOption } from './types';

function formatKeyToTitle(key: string): string {
  if (!key) {
    return '';
  }
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function parseValvesSchema(
  schema?: JSONSchema | Record<string, unknown> | null,
): ValveField[] {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  const rawProperties = (schema.properties ?? {}) as Record<string, JSONSchemaProperty>;
  const requiredKeys = new Set(Array.isArray(schema.required) ? schema.required : []);
  const fields: ValveField[] = [];

  for (const [key, rawProp] of Object.entries(rawProperties)) {
    if (!rawProp || typeof rawProp !== 'object') {
      continue;
    }

    const title = rawProp.title || formatKeyToTitle(key);
    const description = rawProp.description;
    const isRequired = requiredKeys.has(key);
    const rawType = typeof rawProp.type === 'string' ? rawProp.type.toLowerCase() : '';

    let type: ValveField['type'] = 'string';
    let enumOptions: ValveOption[] | undefined;

    if (Array.isArray(rawProp.enum) && rawProp.enum.length > 0) {
      type = 'enum';
      enumOptions = rawProp.enum.map((opt) => ({
        label: String(opt),
        value: String(opt),
      }));
    } else if (rawProp.input?.type === 'select' && Array.isArray(rawProp.input?.options)) {
      type = 'enum';
      enumOptions = rawProp.input.options.map((opt) => {
        if (typeof opt === 'object' && opt !== null && 'value' in opt) {
          return {
            label: String(opt.label ?? opt.value),
            value: String(opt.value),
          };
        }
        return {
          label: String(opt),
          value: String(opt),
        };
      });
    } else if (rawType === 'boolean') {
      type = 'boolean';
    } else if (rawType === 'integer') {
      type = 'integer';
    } else if (rawType === 'number') {
      type = 'number';
    } else if (rawType === 'array') {
      type = 'array';
    } else if (rawType === 'object') {
      type = 'object';
    } else {
      type = 'string';
    }

    let minimum = typeof rawProp.minimum === 'number' ? rawProp.minimum : undefined;
    let maximum = typeof rawProp.maximum === 'number' ? rawProp.maximum : undefined;
    let step = typeof rawProp.step === 'number' ? rawProp.step : undefined;

    if (type === 'integer' || type === 'number') {
      if (step === undefined) {
        step = type === 'integer' ? 1 : 0.1;
      }
    }

    const isMultiline =
      rawProp.format === 'textarea' ||
      (typeof rawProp.default === 'string' && rawProp.default.includes('\n')) ||
      (typeof description === 'string' &&
        (description.toLowerCase().includes('multiline') ||
          description.toLowerCase().includes('prompt') ||
          description.toLowerCase().includes('template') ||
          description.toLowerCase().includes('json')));

    fields.push({
      key,
      title,
      description,
      type,
      required: isRequired,
      default: rawProp.default,
      minimum,
      maximum,
      step,
      enumOptions,
      isMultiline,
      rawProperty: rawProp,
    });
  }

  return fields;
}

export function extractDefaultValues(fields: ValveField[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.default !== undefined && field.default !== null) {
      defaults[field.key] = field.default;
    } else if (field.type === 'boolean') {
      defaults[field.key] = false;
    } else if (field.type === 'number' || field.type === 'integer') {
      defaults[field.key] = field.minimum ?? 0;
    } else if (field.type === 'enum' && field.enumOptions && field.enumOptions.length > 0) {
      defaults[field.key] = field.enumOptions[0].value;
    } else if (field.type === 'array') {
      defaults[field.key] = [];
    } else if (field.type === 'object') {
      defaults[field.key] = {};
    } else {
      defaults[field.key] = '';
    }
  }
  return defaults;
}
