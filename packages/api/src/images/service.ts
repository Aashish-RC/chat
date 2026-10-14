import type { Request, Response } from 'express';
import { generateImage, type ImageGenerationOptions } from './engine';

export interface ImageServiceDeps {
  saveImageBuffer?: (params: {
    userId: string;
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    tenantId?: string | null;
  }) => Promise<{ file_id: string; filepath: string; filename: string }>;
}

export interface ImageHandlers {
  generate: (req: Request, res: Response) => Promise<Response | undefined>;
  getConfig: (req: Request, res: Response) => Promise<Response>;
}

export function createImageHandlers(deps: ImageServiceDeps = {}): ImageHandlers {
  const generate = async (req: Request, res: Response) => {
    try {
      const {
        prompt,
        negative_prompt,
        size,
        width: reqWidth,
        height: reqHeight,
        steps,
        cfg_scale,
        sampler,
        seed,
        model,
        engine,
      } = req.body as {
        prompt?: string;
        negative_prompt?: string;
        size?: string;
        width?: number;
        height?: number;
        steps?: number;
        cfg_scale?: number;
        sampler?: string;
        seed?: number;
        model?: string;
        engine?: ImageGenerationOptions['engine'];
      };

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required for image generation' });
      }

      let width = reqWidth;
      let height = reqHeight;
      if (size && size.includes('x')) {
        const [w, h] = size.split('x').map(Number);
        if (!isNaN(w) && !isNaN(h)) {
          width = w;
          height = h;
        }
      }

      const options: ImageGenerationOptions = {
        prompt: prompt.trim(),
        negative_prompt,
        width,
        height,
        steps: steps ? Number(steps) : undefined,
        cfg_scale: cfg_scale ? Number(cfg_scale) : undefined,
        sampler,
        seed: seed !== undefined ? Number(seed) : undefined,
        model,
        engine,
      };

      const result = await generateImage(options);

      let savedFile: { file_id: string; filepath: string; filename: string } | null = null;
      const user = (req as unknown as { user?: { id: string; tenantId?: string | null } }).user;
      const userId = user?.id || 'anonymous';
      const tenantId = user?.tenantId;

      if (deps.saveImageBuffer) {
        try {
          const extension = result.mimeType === 'image/jpeg' ? 'jpg' : 'png';
          const fileName = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
          savedFile = await deps.saveImageBuffer({
            userId,
            tenantId,
            buffer: result.buffer,
            fileName,
            mimeType: result.mimeType,
          });
        } catch (saveErr) {
          console.warn('[ImageGeneration] Failed to save image via saveImageBuffer, providing base64 fallback:', saveErr);
        }
      }

      const base64Uri = `data:${result.mimeType};base64,${result.buffer.toString('base64')}`;

      return res.status(200).json({
        success: true,
        file_id: savedFile?.file_id,
        filepath: savedFile?.filepath || base64Uri,
        filename: savedFile?.filename || 'generated.png',
        url: savedFile?.filepath || base64Uri,
        base64: base64Uri,
        metadata: result.metadata,
      });
    } catch (error) {
      console.error('[ImageGeneration] Generation handler error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal image generation failure',
      });
    }
  };

  const getConfig = async (_req: Request, res: Response) => {
    return res.status(200).json({
      engines: {
        comfyui: !!process.env.COMFYUI_BASE_URL,
        automatic1111: !!process.env.AUTOMATIC1111_BASE_URL,
        openai: !!process.env.OPENAI_API_KEY,
      },
      default_engine: process.env.IMAGE_ENGINE_CHOICE || 'auto',
    });
  };

  return { generate: generate, getConfig: getConfig };
}
