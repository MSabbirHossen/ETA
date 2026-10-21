import type { AIProvider, AICompletion, AIChunk, AIGenerationOptions } from './ai-provider.interface.js';
import {
  AuthenticationError,
  BadRequestError,
  InternalServerError,
  TooManyRequestsError,
} from '../../../common/errors.js';

export class OpenAIProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly embeddingModel: string;
  private readonly expectedDimension: number;
  private readonly timeoutMs: number;

  constructor(
    apiKey: string,
    model = 'gpt-4o-mini',
    embeddingModel = 'text-embedding-3-small',
    expectedDimension = 1536,
    timeoutMs = 30000,
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.embeddingModel = embeddingModel;
    this.expectedDimension = expectedDimension;
    this.timeoutMs = timeoutMs;
  }

  private validateVector(vector: unknown, expectedDim: number): number[] {
    if (!Array.isArray(vector)) {
      throw new InternalServerError('AI provider returned non-array embedding');
    }
    if (vector.length !== expectedDim) {
      throw new InternalServerError(
        `AI provider embedding dimension mismatch: expected ${expectedDim}, got ${vector.length}`,
      );
    }
    let normSq = 0;
    for (let i = 0; i < vector.length; i++) {
      const v = vector[i];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new InternalServerError('AI provider returned non-finite embedding element');
      }
      normSq += v * v;
    }
    if (normSq <= 0) {
      throw new InternalServerError('AI provider returned zero-norm embedding vector');
    }
    return vector;
  }

  private async fetchOpenAI(url: string, init: globalThis.RequestInit): Promise<globalThis.Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headersRecord = (init.headers as Record<string, string>) || {};
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...headersRecord,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new AuthenticationError('AI provider authentication failed: invalid API key');
        }
        if (res.status === 429) {
          throw new TooManyRequestsError('AI provider rate limit reached. Please try again later.');
        }
        if (res.status === 400) {
          throw new BadRequestError('AI provider rejected request as invalid.');
        }
        throw new InternalServerError(`AI provider upstream error with status ${res.status}`);
      }

      return res;
    } catch (err: unknown) {
      if ((err as any)?.name === 'AbortError') {
        throw new InternalServerError(`AI provider request timed out after ${this.timeoutMs}ms`);
      }
      if (
        err instanceof AuthenticationError ||
        err instanceof TooManyRequestsError ||
        err instanceof BadRequestError ||
        err instanceof InternalServerError
      ) {
        throw err;
      }
      throw new InternalServerError(`Failed to communicate with AI provider: ${(err as any)?.message || 'network error'}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  public async embedText(text: string): Promise<number[]> {
    const res = await this.fetchOpenAI('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      body: JSON.stringify({
        input: text,
        model: this.embeddingModel,
      }),
    });

    const data = (await res.json()) as any;
    if (!data?.data?.[0]?.embedding) {
      throw new InternalServerError('AI provider returned malformed embedding response');
    }
    return this.validateVector(data.data[0].embedding, this.expectedDimension);
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await this.fetchOpenAI('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      body: JSON.stringify({
        input: texts,
        model: this.embeddingModel,
      }),
    });

    const data = (await res.json()) as any;
    if (!data?.data || !Array.isArray(data.data)) {
      throw new InternalServerError('AI provider returned malformed batch embedding response');
    }
    return data.data.map((item: any) => this.validateVector(item.embedding, this.expectedDimension));
  }

  public async generateText(prompt: string, options?: AIGenerationOptions): Promise<AICompletion> {
    const messages = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await this.fetchOpenAI('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 1000,
      }),
    });

    const data = (await res.json()) as any;
    const choice = data?.choices?.[0];
    const text = choice?.message?.content || '';

    return {
      text,
      mode: 'GROUNDED',
      tokensUsed: {
        prompt: data.usage?.prompt_tokens ?? 0,
        completion: data.usage?.completion_tokens ?? 0,
        total: data.usage?.total_tokens ?? 0,
      },
    };
  }

  public async *streamText(prompt: string, options?: AIGenerationOptions): AsyncIterable<AIChunk> {
    const messages = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await this.fetchOpenAI('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 1000,
        stream: true,
      }),
    });

    if (!res.body) {
      throw new InternalServerError('OpenAI streaming response body is missing');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices[0]?.delta?.content || '';
            if (delta) {
              yield { delta, done: false };
            }
          } catch {
            // Ignore malformed streaming chunk
          }
        }
      }
    }
    yield { delta: '', done: true };
  }
}
