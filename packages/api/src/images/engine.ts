import crypto from 'crypto';

export interface ImageGenerationOptions {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  sampler?: string;
  seed?: number;
  model?: string;
  engine?: 'comfyui' | 'automatic1111' | 'openai' | 'auto';
}

export interface ImageGenerationResult {
  buffer: Buffer;
  mimeType: string;
  metadata: {
    prompt: string;
    negative_prompt?: string;
    model?: string;
    seed: number;
    steps: number;
    sampler: string;
    cfg_scale: number;
    engine: 'comfyui' | 'automatic1111' | 'openai';
    width: number;
    height: number;
  };
}

/**
 * Generates an image using Automatic1111 SD WebUI REST API (/sdapi/v1/txt2img)
 */
export async function generateAutomatic1111(
  options: ImageGenerationOptions,
  baseUrl: string = process.env.AUTOMATIC1111_BASE_URL || 'http://127.0.0.1:7860',
): Promise<ImageGenerationResult> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const width = options.width || 512;
  const height = options.height || 512;
  const steps = options.steps || 20;
  const cfg_scale = options.cfg_scale || 7;
  const sampler = options.sampler || 'Euler a';
  const seed = options.seed !== undefined && options.seed !== -1 ? options.seed : Math.floor(Math.random() * 2147483647);

  const payload = {
    prompt: options.prompt,
    negative_prompt: options.negative_prompt || '',
    width,
    height,
    steps,
    cfg_scale,
    sampler_name: sampler,
    seed,
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.AUTOMATIC1111_API_AUTH) {
    const auth = Buffer.from(process.env.AUTOMATIC1111_API_AUTH).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  }

  const response = await fetch(`${cleanUrl}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Automatic1111 generation failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { images?: string[]; info?: string };
  if (!data.images || data.images.length === 0) {
    throw new Error('Automatic1111 returned no images in response');
  }

  const rawBase64 = data.images[0].replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(rawBase64, 'base64');

  let actualSeed = seed;
  let actualModel = options.model || 'Automatic1111';
  if (data.info) {
    try {
      const parsedInfo = JSON.parse(data.info);
      if (parsedInfo.seed !== undefined) {
        actualSeed = parsedInfo.seed;
      }
      if (parsedInfo.sd_model_name) {
        actualModel = parsedInfo.sd_model_name;
      }
    } catch {
      // Ignore info parse error
    }
  }

  return {
    buffer,
    mimeType: 'image/png',
    metadata: {
      prompt: options.prompt,
      negative_prompt: options.negative_prompt,
      model: actualModel,
      seed: actualSeed,
      steps,
      sampler,
      cfg_scale,
      engine: 'automatic1111',
      width,
      height,
    },
  };
}

/**
 * Builds a standard ComfyUI txt2img prompt graph.
 */
function buildComfyUIWorkflow(options: ImageGenerationOptions, seed: number) {
  const width = options.width || 512;
  const height = options.height || 512;
  const steps = options.steps || 20;
  const cfg_scale = options.cfg_scale || 7;
  const sampler = options.sampler || 'euler';
  const ckpt = options.model || 'v1-5-pruned-emaonly.safetensors';

  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        cfg: cfg_scale,
        denoise: 1,
        latent_image: ['5', 0],
        model: ['4', 0],
        negative: ['7', 0],
        positive: ['6', 0],
        sampler_name: sampler,
        scheduler: 'normal',
        seed,
        steps,
      },
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: ckpt,
      },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: {
        batch_size: 1,
        height,
        width,
      },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: {
        clip: ['4', 1],
        text: options.prompt,
      },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: {
        clip: ['4', 1],
        text: options.negative_prompt || '',
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['3', 0],
        vae: ['4', 2],
      },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: {
        filename_prefix: 'LibreChat',
        images: ['8', 0],
      },
    },
  };
}

/**
 * Generates an image using ComfyUI REST endpoints (/prompt, /history, /view)
 */
export async function generateComfyUI(
  options: ImageGenerationOptions,
  baseUrl: string = process.env.COMFYUI_BASE_URL || 'http://127.0.0.1:8188',
): Promise<ImageGenerationResult> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const clientId = crypto.randomUUID();
  const seed = options.seed !== undefined && options.seed !== -1 ? options.seed : Math.floor(Math.random() * 2147483647);
  const workflow = buildComfyUIWorkflow(options, seed);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.COMFYUI_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.COMFYUI_API_KEY}`;
  }

  // 1. Queue prompt
  const queueRes = await fetch(`${cleanUrl}/prompt`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });

  if (!queueRes.ok) {
    const errorText = await queueRes.text();
    throw new Error(`ComfyUI queue failed (${queueRes.status}): ${errorText}`);
  }

  const queueData = (await queueRes.json()) as { prompt_id: string };
  const promptId = queueData.prompt_id;

  // 2. Poll for execution completion in /history/{promptId}
  let completedOutput: { filename: string; subfolder: string; type: string } | null = null;
  const maxAttempts = 60;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const histRes = await fetch(`${cleanUrl}/history/${promptId}`, { headers });
    if (!histRes.ok) {
      continue;
    }
    const histData = (await histRes.json()) as Record<string, { outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }> }>;
    const run = histData[promptId];
    if (run && run.outputs) {
      for (const nodeId of Object.keys(run.outputs)) {
        const nodeOutput = run.outputs[nodeId];
        if (nodeOutput?.images && nodeOutput.images.length > 0) {
          completedOutput = nodeOutput.images[0];
          break;
        }
      }
      if (completedOutput) {
        break;
      }
    }
  }

  if (!completedOutput) {
    throw new Error('ComfyUI timed out waiting for generation output');
  }

  // 3. Retrieve image from /view
  const viewParams = new URLSearchParams({
    filename: completedOutput.filename,
    subfolder: completedOutput.subfolder,
    type: completedOutput.type,
  });

  const viewRes = await fetch(`${cleanUrl}/view?${viewParams.toString()}`, { headers });
  if (!viewRes.ok) {
    throw new Error(`ComfyUI failed to retrieve output image: ${viewRes.status}`);
  }

  const arrayBuffer = await viewRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    mimeType: 'image/png',
    metadata: {
      prompt: options.prompt,
      negative_prompt: options.negative_prompt,
      model: options.model || 'ComfyUI',
      seed,
      steps: options.steps || 20,
      sampler: options.sampler || 'euler',
      cfg_scale: options.cfg_scale || 7,
      engine: 'comfyui',
      width: options.width || 512,
      height: options.height || 512,
    },
  };
}

/**
 * Fallback image generation using OpenAI DALL-E endpoint
 */
export async function generateOpenAIDallE(
  options: ImageGenerationOptions,
  apiKey: string | undefined = process.env.OPENAI_API_KEY,
  baseUrl: string = process.env.DALLE_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
): Promise<ImageGenerationResult> {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured for DALL-E image fallback');
  }

  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const model = options.model || 'dall-e-3';
  const size = options.width && options.height ? `${options.width}x${options.height}` : '1024x1024';

  const response = await fetch(`${cleanUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: options.prompt,
      n: 1,
      size,
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI DALL-E failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  if (!data.data || data.data.length === 0) {
    throw new Error('OpenAI returned no image data');
  }

  let buffer: Buffer;
  if (data.data[0].b64_json) {
    buffer = Buffer.from(data.data[0].b64_json, 'base64');
  } else if (data.data[0].url) {
    const imgRes = await fetch(data.data[0].url);
    const ab = await imgRes.arrayBuffer();
    buffer = Buffer.from(ab);
  } else {
    throw new Error('No valid image data or URL from OpenAI');
  }

  return {
    buffer,
    mimeType: 'image/png',
    metadata: {
      prompt: options.prompt,
      model,
      seed: options.seed ?? 0,
      steps: options.steps ?? 30,
      sampler: 'dalle',
      cfg_scale: options.cfg_scale ?? 7,
      engine: 'openai',
      width: options.width || 1024,
      height: options.height || 1024,
    },
  };
}

/**
 * Multi-Engine Driver Dispatcher
 * Automatically cascades or directs to the specified engine.
 */
export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const chosenEngine = options.engine || (process.env.IMAGE_ENGINE_CHOICE as ImageGenerationOptions['engine']) || 'auto';

  if (chosenEngine === 'comfyui') {
    return generateComfyUI(options);
  }

  if (chosenEngine === 'automatic1111') {
    return generateAutomatic1111(options);
  }

  if (chosenEngine === 'openai') {
    return generateOpenAIDallE(options);
  }

  // 'auto' mode: try ComfyUI if configured, then Automatic1111, then fallback to OpenAI DALL-E
  const errors: string[] = [];

  if (process.env.COMFYUI_BASE_URL) {
    try {
      return await generateComfyUI(options);
    } catch (err) {
      errors.push(`ComfyUI error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (process.env.AUTOMATIC1111_BASE_URL) {
    try {
      return await generateAutomatic1111(options);
    } catch (err) {
      errors.push(`Automatic1111 error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // If neither base URL was explicitly defined, try default local ComfyUI first
  if (!process.env.COMFYUI_BASE_URL && !process.env.AUTOMATIC1111_BASE_URL) {
    try {
      return await generateComfyUI(options);
    } catch (comfyErr) {
      errors.push(`ComfyUI default: ${comfyErr instanceof Error ? comfyErr.message : String(comfyErr)}`);
      try {
        return await generateAutomatic1111(options);
      } catch (a1111Err) {
        errors.push(`Automatic1111 default: ${a1111Err instanceof Error ? a1111Err.message : String(a1111Err)}`);
      }
    }
  }

  // Fallback to OpenAI DALL-E
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateOpenAIDallE(options);
    } catch (openAiErr) {
      errors.push(`OpenAI DALL-E error: ${openAiErr instanceof Error ? openAiErr.message : String(openAiErr)}`);
    }
  }

  throw new Error(`All image generation engines failed. Attempts:\n${errors.join('\n')}`);
}
