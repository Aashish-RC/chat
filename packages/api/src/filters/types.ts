import type { Request, Response } from 'express';

export type FilterPhase = 'inlet' | 'outlet';

export interface FilterContext {
  req?: Request;
  res?: Response;
  userId?: string;
  conversationId?: string;
  model?: string;
  endpoint?: string;
  [key: string]: unknown;
}

export interface InletPayload {
  text?: string;
  prompt?: string;
  messages?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface OutletPayload {
  text?: string;
  response?: unknown;
  message?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FilterDefinition {
  id: string;
  name: string;
  description?: string;
  /** Lower number runs earlier. Default is 100. */
  priority?: number;
  enabled?: boolean;
  inlet?: (payload: InletPayload, context: FilterContext) => Promise<InletPayload> | InletPayload;
  outlet?: (payload: OutletPayload, context: FilterContext) => Promise<OutletPayload> | OutletPayload;
}
