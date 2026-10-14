import type {
  FilterDefinition,
  FilterContext,
  InletPayload,
  OutletPayload,
} from './types';
import { createPIIFilter } from './builtins/pii';
import { createModerationFilter } from './builtins/moderation';
import { createDecoratorFilter } from './builtins/decorator';

export class FilterManager {
  private filters: Map<string, FilterDefinition> = new Map();

  constructor(initialFilters: FilterDefinition[] = []) {
    for (const filter of initialFilters) {
      this.registerFilter(filter);
    }
  }

  public registerFilter(filter: FilterDefinition): void {
    this.filters.set(filter.id, {
      ...filter,
      priority: filter.priority ?? 100,
      enabled: filter.enabled ?? true,
    });
  }

  public register(filter: FilterDefinition): void {
    this.registerFilter(filter);
  }

  public unregisterFilter(filterId: string): boolean {
    return this.filters.delete(filterId);
  }

  public unregister(filterId: string): boolean {
    return this.unregisterFilter(filterId);
  }

  public getFilter(filterId: string): FilterDefinition | undefined {
    return this.filters.get(filterId);
  }

  public getFilters(): FilterDefinition[] {
    return Array.from(this.filters.values()).sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
    );
  }

  public setFilterEnabled(filterId: string, enabled: boolean): boolean {
    const filter = this.filters.get(filterId);
    if (!filter) {
      return false;
    }
    filter.enabled = enabled;
    return true;
  }

  public clearFilters(): void {
    this.filters.clear();
  }

  public async applyInlet(
    payload: InletPayload,
    context: FilterContext = {},
  ): Promise<InletPayload> {
    const sorted = this.getFilters().filter((f) => f.enabled !== false && typeof f.inlet === 'function');
    let currentPayload = { ...payload };

    for (const filter of sorted) {
      if (filter.inlet) {
        currentPayload = await filter.inlet(currentPayload, context);
      }
    }

    return currentPayload;
  }

  public async applyOutlet(
    payload: OutletPayload,
    context: FilterContext = {},
  ): Promise<OutletPayload> {
    const sorted = this.getFilters().filter((f) => f.enabled !== false && typeof f.outlet === 'function');
    let currentPayload = { ...payload };

    for (const filter of sorted) {
      if (filter.outlet) {
        currentPayload = await filter.outlet(currentPayload, context);
      }
    }

    return currentPayload;
  }
}

export function createDefaultFilterManager(): FilterManager {
  const manager = new FilterManager();
  manager.registerFilter(createPIIFilter());
  manager.registerFilter(createModerationFilter());
  manager.registerFilter(createDecoratorFilter());
  return manager;
}

export const defaultFilterManager: FilterManager = createDefaultFilterManager();
