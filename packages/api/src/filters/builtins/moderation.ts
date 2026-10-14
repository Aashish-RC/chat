import type { FilterDefinition, InletPayload, OutletPayload, FilterContext } from '../types';
import { FilterBlockError } from '../errors';

export interface ModerationFilterOptions {
  blocklist?: Array<string | RegExp>;
  blockedTerms?: Array<string | RegExp>;
  blockInlet?: boolean;
  outletAction?: 'block' | 'redact';
  redactReplacement?: string;
}

export function checkBlocked(text: string, blocklist: Array<string | RegExp>): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  for (const item of blocklist) {
    if (item instanceof RegExp) {
      if (item.test(text)) {
        return item.source;
      }
    } else if (typeof item === 'string') {
      try {
        const regex = new RegExp(item, 'i');
        if (regex.test(text)) {
          return item;
        }
      } catch {
        const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(text)) {
          return item;
        }
      }
    }
  }
  return null;
}

export function redactBlocked(
  text: string,
  blocklist: Array<string | RegExp>,
  replacement = '[REDACTED]',
): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let result = text;
  for (const item of blocklist) {
    if (item instanceof RegExp) {
      const flags = item.flags.includes('g') ? item.flags : `${item.flags}g`;
      const globalRegex = new RegExp(item.source, flags);
      result = result.replace(globalRegex, replacement);
    } else if (typeof item === 'string') {
      try {
        const globalRegex = new RegExp(item, 'gi');
        result = result.replace(globalRegex, replacement);
      } catch {
        const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        result = result.replace(regex, replacement);
      }
    }
  }
  return result;
}

export function createModerationFilter(options?: ModerationFilterOptions): FilterDefinition {
  const blocklist = options?.blocklist ?? options?.blockedTerms ?? [];
  const blockInlet = options?.blockInlet ?? true;
  const outletAction = options?.outletAction ?? 'redact';
  const redactReplacement = options?.redactReplacement ?? '[REDACTED]';

  return {
    id: 'moderation_blocklist',
    name: 'Content Moderation Blocklist',
    description: 'Enforces word and topic blocklists on prompts and responses.',
    priority: 20,
    enabled: true,
    inlet: async (payload: InletPayload, _context: FilterContext): Promise<InletPayload> => {
      if (!blockInlet || blocklist.length === 0) {
        return payload;
      }

      if (typeof payload.text === 'string') {
        const matched = checkBlocked(payload.text, blocklist);
        if (matched) {
          throw new FilterBlockError('moderation_blocklist', `Contains blocked term: '${matched}'`);
        }
      }

      if (typeof payload.prompt === 'string') {
        const matched = checkBlocked(payload.prompt, blocklist);
        if (matched) {
          throw new FilterBlockError('moderation_blocklist', `Contains blocked term: '${matched}'`);
        }
      }

      if (Array.isArray(payload.messages)) {
        for (const msg of payload.messages) {
          if (typeof msg.content === 'string') {
            const matched = checkBlocked(msg.content, blocklist);
            if (matched) {
              throw new FilterBlockError(
                'moderation_blocklist',
                `Contains blocked term: '${matched}'`,
              );
            }
          }
        }
      }

      return payload;
    },
    outlet: async (payload: OutletPayload, _context: FilterContext): Promise<OutletPayload> => {
      if (blocklist.length === 0) {
        return payload;
      }

      if (typeof payload.text === 'string') {
        if (outletAction === 'block') {
          const matched = checkBlocked(payload.text, blocklist);
          if (matched) {
            throw new FilterBlockError(
              'moderation_blocklist',
              `Model output blocked due to prohibited term: '${matched}'`,
            );
          }
        } else {
          return {
            ...payload,
            text: redactBlocked(payload.text, blocklist, redactReplacement),
          };
        }
      }

      return payload;
    },
  };
}
