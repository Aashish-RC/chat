import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { InletPayload, OutletPayload, FilterContext } from './types';
import { FilterManager, defaultFilterManager } from './manager';
import { FilterBlockError } from './errors';

export function createInletFilterMiddleware(manager: FilterManager = defaultFilterManager): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    try {
      const payload: InletPayload = {
        text: req.body.text,
        prompt: req.body.prompt,
        messages: req.body.messages,
        ...req.body,
      };

      const context: FilterContext = {
        req,
        res,
        userId: (req as Request & { user?: { id?: string } })?.user?.id,
        conversationId: req.body.conversationId,
        model: req.body.model,
        endpoint: req.body.endpoint,
      };

      const filtered = await manager.applyInlet(payload, context);

      if (filtered.text !== undefined) {
        req.body.text = filtered.text;
      }
      if (filtered.prompt !== undefined) {
        req.body.prompt = filtered.prompt;
      }
      if (filtered.messages !== undefined) {
        req.body.messages = filtered.messages;
      }

      next();
    } catch (error) {
      if (error instanceof FilterBlockError) {
        res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
          filterId: error.filterId,
          reason: error.reason,
        });
        return;
      }
      next(error);
    }
  };
}

export async function applyInletFilters(
  req: Request,
  manager: FilterManager = defaultFilterManager,
): Promise<InletPayload> {
  const payload: InletPayload = {
    text: req.body?.text,
    prompt: req.body?.prompt,
    messages: req.body?.messages,
    ...(req.body || {}),
  };

  const context: FilterContext = {
    req,
    userId: (req as Request & { user?: { id?: string } })?.user?.id,
    conversationId: req.body?.conversationId,
    model: req.body?.model,
    endpoint: req.body?.endpoint,
  };

  const filtered = await manager.applyInlet(payload, context);

  if (req.body && typeof req.body === 'object') {
    if (filtered.text !== undefined) {
      req.body.text = filtered.text;
    }
    if (filtered.prompt !== undefined) {
      req.body.prompt = filtered.prompt;
    }
    if (filtered.messages !== undefined) {
      req.body.messages = filtered.messages;
    }
  }

  return filtered;
}

export async function applyOutletFilters(
  output: string | OutletPayload,
  context: FilterContext = {},
  manager: FilterManager = defaultFilterManager,
): Promise<OutletPayload> {
  const payload: OutletPayload =
    typeof output === 'string'
      ? { text: output }
      : { ...output };

  return manager.applyOutlet(payload, context);
}
