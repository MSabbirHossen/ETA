import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIProviderFactory } from './provider/provider.factory.js';
import { DisabledAIProvider } from './provider/disabled.provider.js';
import { aiRouter } from './ai.route.js';

describe('AI Kill Switch & Disabled Mode — PRD §103, §104', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    AIProviderFactory.resetProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
    AIProviderFactory.resetProvider();
  });

  it('instantiates DisabledAIProvider when AI_PROVIDER is disabled', () => {
    process.env.AI_PROVIDER = 'disabled';
    const provider = AIProviderFactory.getProvider();
    expect(provider).toBeInstanceOf(DisabledAIProvider);
  });

  it('instantiates DisabledAIProvider when FEATURE_AI_STUDY_ASSISTANT is false', () => {
    process.env.FEATURE_AI_STUDY_ASSISTANT = 'false';
    const provider = AIProviderFactory.getProvider();
    expect(provider).toBeInstanceOf(DisabledAIProvider);
  });

  it('throws ServiceUnavailableError when calling methods on DisabledAIProvider', async () => {
    const disabled = new DisabledAIProvider();
    await expect(disabled.generateText('test')).rejects.toThrow('disabled');
    await expect(disabled.embedText('test')).rejects.toThrow('disabled');
  });

  it('intercepts AI router requests and returns 503 when FEATURE_AI_STUDY_ASSISTANT is false', () => {
    process.env.FEATURE_AI_STUDY_ASSISTANT = 'false';

    // The first middleware in aiRouter stack is the kill switch middleware
    const killSwitchLayer = aiRouter.stack[0];
    expect(killSwitchLayer).toBeDefined();

    const req: any = {};
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    killSwitchLayer.handle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'AI_SERVICES_DISABLED' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('intercepts AI router requests and returns 503 when AI_PROVIDER is disabled', () => {
    process.env.AI_PROVIDER = 'disabled';

    const killSwitchLayer = aiRouter.stack[0];
    const req: any = {};
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    killSwitchLayer.handle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'AI_SERVICES_DISABLED' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('allows request through when AI is enabled', () => {
    process.env.FEATURE_AI_STUDY_ASSISTANT = 'true';
    process.env.AI_PROVIDER = 'mock';

    const killSwitchLayer = aiRouter.stack[0];
    const req: any = {};
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    killSwitchLayer.handle(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
