import { parseValvesSchema, extractDefaultValues } from '../schemaParser';

describe('schemaParser', () => {
  it('should return an empty array for undefined or empty schema', () => {
    expect(parseValvesSchema(undefined)).toEqual([]);
    expect(parseValvesSchema(null)).toEqual([]);
    expect(parseValvesSchema({})).toEqual([]);
  });

  it('should parse properties correctly with types, bounds, and enums', () => {
    const schema = {
      type: 'object',
      properties: {
        max_results: {
          type: 'integer',
          title: 'Max Results',
          description: 'Maximum items to return',
          minimum: 1,
          maximum: 50,
          default: 10,
        },
        temperature: {
          type: 'number',
          title: 'Temperature',
          minimum: 0,
          maximum: 2,
          step: 0.1,
          default: 0.7,
        },
        enable_cache: {
          type: 'boolean',
          title: 'Enable Cache',
          default: true,
        },
        mode: {
          type: 'string',
          title: 'Mode',
          enum: ['fast', 'deep', 'balanced'],
          default: 'balanced',
        },
        prompt_template: {
          type: 'string',
          title: 'Prompt Template',
          description: 'A multiline template string',
          default: 'You are an assistant.\nAnswer carefully.',
        },
      },
      required: ['max_results', 'mode'],
    };

    const fields = parseValvesSchema(schema);
    expect(fields).toHaveLength(5);

    const maxResultsField = fields.find((f) => f.key === 'max_results');
    expect(maxResultsField).toBeDefined();
    expect(maxResultsField?.type).toBe('integer');
    expect(maxResultsField?.required).toBe(true);
    expect(maxResultsField?.minimum).toBe(1);
    expect(maxResultsField?.maximum).toBe(50);
    expect(maxResultsField?.step).toBe(1);
    expect(maxResultsField?.default).toBe(10);

    const tempField = fields.find((f) => f.key === 'temperature');
    expect(tempField?.type).toBe('number');
    expect(tempField?.step).toBe(0.1);
    expect(tempField?.required).toBe(false);

    const boolField = fields.find((f) => f.key === 'enable_cache');
    expect(boolField?.type).toBe('boolean');
    expect(boolField?.default).toBe(true);

    const enumField = fields.find((f) => f.key === 'mode');
    expect(enumField?.type).toBe('enum');
    expect(enumField?.enumOptions).toEqual([
      { label: 'fast', value: 'fast' },
      { label: 'deep', value: 'deep' },
      { label: 'balanced', value: 'balanced' },
    ]);

    const multilineField = fields.find((f) => f.key === 'prompt_template');
    expect(multilineField?.isMultiline).toBe(true);
  });

  it('should extract default values correctly', () => {
    const schema = {
      type: 'object',
      properties: {
        num: { type: 'number', default: 42 },
        flag: { type: 'boolean', default: true },
        choice: { type: 'string', enum: ['a', 'b'], default: 'b' },
        blank: { type: 'string' },
      },
    };

    const fields = parseValvesSchema(schema);
    const defaults = extractDefaultValues(fields);

    expect(defaults).toEqual({
      num: 42,
      flag: true,
      choice: 'b',
      blank: '',
    });
  });
});
