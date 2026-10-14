import type { FilterDefinition, InletPayload, OutletPayload, FilterContext } from '../types';

export interface DecoratorFilterOptions {
  promptPrefix?: string;
  promptSuffix?: string;
  responseSuffix?: string;
}

export function createDecoratorFilter(options?: DecoratorFilterOptions): FilterDefinition {
  const promptPrefix = options?.promptPrefix ?? '';
  const promptSuffix = options?.promptSuffix ?? '';
  const responseSuffix = options?.responseSuffix ?? '';

  return {
    id: 'prompt_decorator',
    name: 'Prompt & Response Decorator',
    description: 'Injects custom prefixes/suffixes to prompts and model responses.',
    priority: 50,
    enabled: true,
    inlet: async (payload: InletPayload, _context: FilterContext): Promise<InletPayload> => {
      if (!promptPrefix && !promptSuffix) {
        return payload;
      }

      const updated = { ...payload };
      if (typeof updated.text === 'string') {
        let text = updated.text;
        if (promptPrefix) {
          const separator = promptPrefix.endsWith(' ') || promptPrefix.endsWith('\n') ? '' : '\n';
          text = `${promptPrefix}${separator}${text}`;
        }
        if (promptSuffix) {
          const separator = promptSuffix.startsWith(' ') || promptSuffix.startsWith('\n') ? '' : '\n';
          text = `${text}${separator}${promptSuffix}`;
        }
        updated.text = text;
      }

      if (typeof updated.prompt === 'string') {
        let prompt = updated.prompt;
        if (promptPrefix) {
          const separator = promptPrefix.endsWith(' ') || promptPrefix.endsWith('\n') ? '' : '\n';
          prompt = `${promptPrefix}${separator}${prompt}`;
        }
        if (promptSuffix) {
          const separator = promptSuffix.startsWith(' ') || promptSuffix.startsWith('\n') ? '' : '\n';
          prompt = `${prompt}${separator}${promptSuffix}`;
        }
        updated.prompt = prompt;
      }

      return updated;
    },
    outlet: async (payload: OutletPayload, _context: FilterContext): Promise<OutletPayload> => {
      if (!responseSuffix) {
        return payload;
      }

      const updated = { ...payload };
      if (typeof updated.text === 'string') {
        const separator = responseSuffix.startsWith(' ') || responseSuffix.startsWith('\n') ? '' : '\n\n';
        updated.text = `${updated.text}${separator}${responseSuffix}`;
      }
      return updated;
    },
  };
}
