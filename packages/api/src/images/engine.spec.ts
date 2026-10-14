import {
  generateAutomatic1111,
  generateComfyUI,
  generateOpenAIDallE,
  generateImage,
} from './engine';

const originalFetch = global.fetch;

describe('Local Stable Diffusion & ComfyUI Image Engine', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.COMFYUI_BASE_URL;
    delete process.env.AUTOMATIC1111_BASE_URL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.IMAGE_ENGINE_CHOICE;
  });

  describe('Automatic1111 Engine', () => {
    it('sends txt2img payload and parses base64 and metadata', async () => {
      const mockImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          images: [mockImageBase64],
          info: JSON.stringify({
            seed: 4242,
            sd_model_name: 'v1-5-pruned',
          }),
        }),
      } as Response);

      global.fetch = mockFetch;

      const result = await generateAutomatic1111(
        {
          prompt: 'A cyberpunk street in the rain',
          negative_prompt: 'blurry',
          width: 512,
          height: 512,
          steps: 25,
          cfg_scale: 7.5,
          sampler: 'Euler a',
          seed: 4242,
        },
        'http://127.0.0.1:7860',
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:7860/sdapi/v1/txt2img',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"prompt":"A cyberpunk street in the rain"'),
        }),
      );

      expect(result.metadata.engine).toBe('automatic1111');
      expect(result.metadata.seed).toBe(4242);
      expect(result.metadata.model).toBe('v1-5-pruned');
      expect(result.metadata.steps).toBe(25);
      expect(result.buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('ComfyUI Engine', () => {
    it('queues workflow, polls history, and retrieves output image', async () => {
      const mockImageBuffer = Buffer.from('fake-png-bytes');
      const mockFetch = jest.fn((url: string) => {
        if (url.includes('/prompt')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ prompt_id: 'test-prompt-id-123' }),
          } as Response);
        }
        if (url.includes('/history/test-prompt-id-123')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              'test-prompt-id-123': {
                outputs: {
                  '9': {
                    images: [{ filename: 'LibreChat_0001.png', subfolder: '', type: 'output' }],
                  },
                },
              },
            }),
          } as Response);
        }
        if (url.includes('/view?')) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: async () =>
              mockImageBuffer.buffer.slice(
                mockImageBuffer.byteOffset,
                mockImageBuffer.byteOffset + mockImageBuffer.byteLength,
              ),
          } as Response);
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await generateComfyUI(
        {
          prompt: 'A majestic mountain at sunrise',
          width: 512,
          height: 512,
          steps: 20,
          sampler: 'euler',
          seed: 9999,
        },
        'http://127.0.0.1:8188',
      );

      expect(result.metadata.engine).toBe('comfyui');
      expect(result.metadata.seed).toBe(9999);
      expect(result.buffer).toEqual(mockImageBuffer);
    });
  });

  describe('OpenAI DALL-E Fallback Engine', () => {
    it('generates image through DALL-E endpoint when configured', async () => {
      const mockB64 = Buffer.from('dalle-image').toString('base64');
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ b64_json: mockB64 }],
        }),
      } as Response);

      global.fetch = mockFetch;

      const result = await generateOpenAIDallE(
        {
          prompt: 'An astronaut riding a horse',
          width: 1024,
          height: 1024,
        },
        'sk-test-key',
        'https://api.openai.com/v1',
      );

      expect(result.metadata.engine).toBe('openai');
      expect(result.buffer.toString()).toBe('dalle-image');
    });
  });

  describe('Multi-Engine Dispatcher', () => {
    it('cascades from ComfyUI to Automatic1111 when ComfyUI is unavailable', async () => {
      const mockImageBase64 = Buffer.from('a1111-image').toString('base64');

      const mockFetch = jest.fn((url: string) => {
        if (url.includes(':8188')) {
          return Promise.reject(new Error('Connection refused'));
        }
        if (url.includes('/sdapi/v1/txt2img')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              images: [mockImageBase64],
              info: JSON.stringify({ seed: 777 }),
            }),
          } as Response);
        }
        return Promise.reject(new Error(`Unhandled: ${url}`));
      });

      global.fetch = mockFetch as unknown as typeof fetch;

      process.env.COMFYUI_BASE_URL = 'http://127.0.0.1:8188';
      process.env.AUTOMATIC1111_BASE_URL = 'http://127.0.0.1:7860';

      const result = await generateImage({
        prompt: 'Cascade test prompt',
      });

      expect(result.metadata.engine).toBe('automatic1111');
      expect(result.buffer.toString()).toBe('a1111-image');
    });
  });
});
