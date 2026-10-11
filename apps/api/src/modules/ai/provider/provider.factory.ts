import type { AIProvider } from './ai-provider.interface.js';
import { MockAIProvider } from './mock.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { DisabledAIProvider } from './disabled.provider.js';

export interface AIProviderMetadata {
  provider: 'mock' | 'openai' | 'disabled';
  model: string;
  embeddingModel: string;
  embeddingDimension: number;
  version: string;
}

let cachedProvider: AIProvider | null = null;

export class AIProviderFactory {
  public static getProviderMetadata(): AIProviderMetadata {
    const env = process.env.NODE_ENV;
    const isFeatureDisabled = process.env.FEATURE_AI_STUDY_ASSISTANT === 'false';
    const providerType = isFeatureDisabled ? 'disabled' : (process.env.AI_PROVIDER || 'mock').toLowerCase();

    if (providerType === 'disabled') {
      return {
        provider: 'disabled',
        model: 'none',
        embeddingModel: 'none',
        embeddingDimension: 0,
        version: 'v1',
      };
    }

    if (providerType === 'openai') {
      const dim = process.env.AI_EMBEDDING_DIM ? Number(process.env.AI_EMBEDDING_DIM) : 1536;
      if (Number.isNaN(dim) || dim <= 0) {
        throw new Error(`Invalid AI_EMBEDDING_DIM configuration: ${process.env.AI_EMBEDDING_DIM}`);
      }
      return {
        provider: 'openai',
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        embeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small',
        embeddingDimension: dim,
        version: 'v1',
      };
    }

    return {
      provider: 'mock',
      model: 'mock-academic-v1',
      embeddingModel: 'mock-l2-hash',
      embeddingDimension: 64,
      version: 'v1',
    };
  }

  public static getProvider(): AIProvider {
    if (cachedProvider) return cachedProvider;

    const env = process.env.NODE_ENV;
    const isFeatureDisabled = process.env.FEATURE_AI_STUDY_ASSISTANT === 'false';
    const providerType = isFeatureDisabled ? 'disabled' : (process.env.AI_PROVIDER || 'mock').toLowerCase();
    const apiKey = process.env.AI_API_KEY || '';

    // Kill-switch: explicit disabled mode
    if (providerType === 'disabled') {
      cachedProvider = new DisabledAIProvider();
      return cachedProvider;
    }

    // Production safety enforcement: never silently serve MockAIProvider in production
    if (env === 'production') {
      if (providerType === 'mock' || !apiKey) {
        throw new Error(
          'Production environment cannot run MockAIProvider. AI_PROVIDER must be configured with a valid provider (e.g., openai) or disabled, and AI_API_KEY must be provided.',
        );
      }
    }

    // Tests and dev explicit mock
    if (env === 'test' || providerType === 'mock' || !apiKey) {
      cachedProvider = new MockAIProvider();
      return cachedProvider;
    }

    if (providerType === 'openai') {
      const meta = this.getProviderMetadata();
      cachedProvider = new OpenAIProvider(apiKey, meta.model, meta.embeddingModel, meta.embeddingDimension);
      return cachedProvider;
    }

    // Default fallback to Mock
    cachedProvider = new MockAIProvider();
    return cachedProvider;
  }

  public static setProvider(provider: AIProvider): void {
    cachedProvider = provider;
  }

  public static resetProvider(): void {
    cachedProvider = null;
  }
}
