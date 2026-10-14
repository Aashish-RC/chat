export type JSONSchemaPrimitive = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

export interface JSONSchemaProperty {
  type?: JSONSchemaPrimitive | string;
  title?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  step?: number;
  enum?: (string | number)[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  input?: {
    type?: string;
    options?: Array<{ label: string; value: string | number } | string>;
  };
  [key: string]: unknown;
}

export interface JSONSchema {
  type?: string;
  title?: string;
  description?: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

export interface ValveOption {
  label: string;
  value: string;
}

export interface ValveField {
  key: string;
  title: string;
  description?: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'array' | 'object';
  required: boolean;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  step?: number;
  enumOptions?: ValveOption[];
  isMultiline?: boolean;
  rawProperty: JSONSchemaProperty;
}

export interface ValvesFormProps {
  schema?: JSONSchema | Record<string, unknown> | null;
  initialValues?: Record<string, unknown>;
  values?: Record<string, unknown>;
  onChange?: (values: Record<string, unknown>) => void;
  onSave?: (values: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
  className?: string;
}

export interface ValvesModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title?: string;
  serverName?: string;
  toolName?: string;
  schema?: JSONSchema | Record<string, unknown> | null;
  initialValues?: Record<string, unknown>;
  onSave?: (values: Record<string, unknown>) => void;
  isSubmitting?: boolean;
}
