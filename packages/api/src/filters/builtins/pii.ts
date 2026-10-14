import type { FilterDefinition, InletPayload, OutletPayload, FilterContext } from '../types';

export interface PIIRedactionOptions {
  maskEmail?: string;
  maskPhone?: string;
  maskApiKey?: string;
  redactInlet?: boolean;
  redactOutlet?: boolean;
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const API_KEY_REGEX = /\b(?:sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{36}|AIza[0-9A-Za-z-_]{35}|bearer\s+[a-zA-Z0-9_\-.]{20,})\b/gi;

export function redactText(text: string, options?: PIIRedactionOptions): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const maskEmail = options?.maskEmail ?? '[EMAIL_REDACTED]';
  const maskPhone = options?.maskPhone ?? '[PHONE_REDACTED]';
  const maskApiKey = options?.maskApiKey ?? '[API_KEY_REDACTED]';

  return text
    .replace(EMAIL_REGEX, maskEmail)
    .replace(PHONE_REGEX, maskPhone)
    .replace(API_KEY_REGEX, maskApiKey);
}

export function createPIIFilter(options?: PIIRedactionOptions): FilterDefinition {
  const redactInlet = options?.redactInlet ?? true;
  const redactOutlet = options?.redactOutlet ?? true;

  return {
    id: 'pii_redaction',
    name: 'PII Redaction',
    description: 'Redacts sensitive personal information and API keys from prompts and responses.',
    priority: 10,
    enabled: true,
    inlet: async (payload: InletPayload, _context: FilterContext): Promise<InletPayload> => {
      if (!redactInlet) {
        return payload;
      }

      const updated = { ...payload };
      if (typeof updated.text === 'string') {
        updated.text = redactText(updated.text, options);
      }
      if (typeof updated.prompt === 'string') {
        updated.prompt = redactText(updated.prompt, options);
      }
      if (Array.isArray(updated.messages)) {
        updated.messages = updated.messages.map((msg) => {
          if (typeof msg.content === 'string') {
            return { ...msg, content: redactText(msg.content, options) };
          }
          return msg;
        });
      }
      return updated;
    },
    outlet: async (payload: OutletPayload, _context: FilterContext): Promise<OutletPayload> => {
      if (!redactOutlet) {
        return payload;
      }

      const updated = { ...payload };
      if (typeof updated.text === 'string') {
        updated.text = redactText(updated.text, options);
      }
      return updated;
    },
  };
}
