import type { ICitation, AIResponseMode } from '@eta/types';

export interface AICompletion {
  text: string;
  citations?: ICitation[];
  mode?: AIResponseMode;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface AIChunk {
  delta: string;
  done: boolean;
}

export interface AIGenerationOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  generateText(prompt: string, options?: AIGenerationOptions): Promise<AICompletion>;
  streamText(prompt: string, options?: AIGenerationOptions): AsyncIterable<AIChunk>;
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
