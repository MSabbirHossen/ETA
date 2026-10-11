import type { AIProvider, AICompletion, AIChunk, AIGenerationOptions } from './ai-provider.interface.js';
import { ServiceUnavailableError } from '../../../common/errors.js';

export class DisabledAIProvider implements AIProvider {
  async generateText(_prompt: string, _options?: AIGenerationOptions): Promise<AICompletion> {
    throw new ServiceUnavailableError('Educational AI ("Ask ETA") is currently disabled.');
  }

  async *streamText(_prompt: string, _options?: AIGenerationOptions): AsyncIterable<AIChunk> {
    throw new ServiceUnavailableError('Educational AI ("Ask ETA") is currently disabled.');
  }

  async embedText(_text: string): Promise<number[]> {
    throw new ServiceUnavailableError('AI vector embeddings are currently disabled.');
  }

  async embedBatch(_texts: string[]): Promise<number[][]> {
    throw new ServiceUnavailableError('AI vector embeddings are currently disabled.');
  }
}
