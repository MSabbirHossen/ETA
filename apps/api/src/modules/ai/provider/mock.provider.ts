import crypto from 'node:crypto';
import type { AIProvider, AICompletion, AIChunk, AIGenerationOptions } from './ai-provider.interface.js';

/**
 * Deterministic Mock AI Provider — PRD §93, §94
 *
 * Provides completely offline, zero-cost, deterministic execution for tests
 * and development without requiring paid third-party API keys.
 */
export class MockAIProvider implements AIProvider {
  private readonly dimension = 64;

  /**
   * Generates a deterministic normalized 64-dimensional float vector.
   * Words are hashed into dimension buckets with term frequencies, yielding
   * positive cosine similarity for semantically or lexically overlapping texts.
   */
  public async embedText(text: string): Promise<number[]> {
    const vector = new Array<number>(this.dimension).fill(0);
    const tokens = text.toLowerCase().match(/\b\w+\b/g) || [text];

    for (const token of tokens) {
      const hash = crypto.createHash('sha256').update(token).digest();
      const bucket = hash.readUInt16BE(0) % this.dimension;
      const weight = (hash.readUInt8(2) % 10) + 1;
      const current = vector[bucket] ?? 0;
      vector[bucket] = current + weight;
    }

    // Normalize to unit length (L2 norm)
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return vector;
    return vector.map((v) => Math.round((v / norm) * 10000) / 10000);
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embedText(t)));
  }

  public async generateText(prompt: string, options?: AIGenerationOptions): Promise<AICompletion> {
    const sysPrompt = options?.systemPrompt || '';

    // 1. Structured Question Generation Mock
    if (sysPrompt.includes('GENERATE_QUESTIONS') || prompt.includes('GENERATE_QUESTIONS')) {
      return {
        text: JSON.stringify([
          {
            prompt: 'What is the primary function of the core architecture in ETA?',
            type: 'MCQ',
            options: [
              { id: 'opt_1', text: 'Provide unified academic management', isCorrect: true, explanation: 'ETA is designed as a unified academic operating system.' },
              { id: 'opt_2', text: 'Act solely as a public blog', isCorrect: false, explanation: 'It is a full LMS and SIS.' },
              { id: 'opt_3', text: 'Replace human instructors completely', isCorrect: false, explanation: 'Instructors retain academic authority.' },
              { id: 'opt_4', text: 'Unrestricted anonymous data export', isCorrect: false, explanation: 'Strict RBAC is maintained.' },
            ],
            suggestedCorrectAnswer: 'Provide unified academic management',
            explanation: 'ETA unifies LMS, SIS, and institutional management into a single platform.',
            difficulty: 'MEDIUM',
            marks: 2,
            topic: 'Platform Architecture',
            tags: ['architecture', 'core'],
          },
          {
            prompt: 'Authorization checks must always be evaluated on the client.',
            type: 'TRUE_FALSE',
            options: [
              { id: 'opt_true', text: 'True', isCorrect: false },
              { id: 'opt_false', text: 'False', isCorrect: true, explanation: 'All authorization is strictly backend-enforced.' },
            ],
            suggestedCorrectAnswer: 'False',
            explanation: 'Backend-enforced RBAC is a non-negotiable core architecture requirement.',
            difficulty: 'EASY',
            marks: 1,
            topic: 'Security & RBAC',
            tags: ['security', 'rbac'],
          },
        ]),
        mode: 'GROUNDED',
        tokensUsed: { prompt: 150, completion: 220, total: 370 },
      };
    }

    // 2. Structured Rubric Feedback Mock
    if (sysPrompt.includes('RUBRIC_FEEDBACK') || prompt.includes('RUBRIC_FEEDBACK')) {
      return {
        text: JSON.stringify({
          feedback: 'The submission demonstrates a solid understanding of the required concepts. The implementation is cleanly structured and aligns well with the key requirements.',
          suggestedScore: 88,
          strengths: [
            'Clear and cohesive structure',
            'Strong alignment with the core learning objectives',
            'Accurate terminology usage throughout the answer',
          ],
          areasForImprovement: [
            'Could expand on edge case considerations',
            'Provide deeper analysis on comparative performance',
          ],
          rubricCriteriaMatch: [
            { criterion: 'Core Concept Comprehension', comment: 'Well articulated with direct references to lesson materials.', score: 45 },
            { criterion: 'Clarity and Formatting', comment: 'Cleanly presented with minimal ambiguity.', score: 43 },
          ],
          advisoryNotice: 'This feedback is AI-assisted advisory draft for instructor review. The instructor retains sole authority over final scores.',
        }),
        mode: 'GROUNDED',
        tokensUsed: { prompt: 180, completion: 210, total: 390 },
      };
    }

    // 3. Lesson Summary Mock
    if (sysPrompt.includes('LESSON_SUMMARY') || prompt.includes('LESSON_SUMMARY')) {
      return {
        text: JSON.stringify({
          summary: 'This lesson covers the core principles, domain models, and practical implementations of the topic. Key concepts and architectural boundaries are thoroughly outlined.',
          keyConcepts: [
            { concept: 'Domain Boundaries', definition: 'Modular separation of concerns between services', importance: 'Prevents coupling and enables independent scalability' },
            { concept: 'Backend Authorization', definition: 'Enforcing permissions at the server layer', importance: 'Guarantees security regardless of client implementation' },
            { concept: 'Grounded Retrieval', definition: 'Supplying verified curriculum excerpts to language models', importance: 'Eliminates hallucinations and ensures academic validity' },
          ],
        }),
        mode: 'GROUNDED',
        tokensUsed: { prompt: 120, completion: 150, total: 270 },
      };
    }

    // 4. Insufficient Context Check
    if (prompt.includes('NO_RELEVANT_CONTEXT')) {
      return {
        text: 'I could not find relevant learning materials in your enrolled courses to answer this question. Please ask your instructor or consult the course syllabus.',
        mode: 'INSUFFICIENT_CONTEXT',
        tokensUsed: { prompt: 50, completion: 30, total: 80 },
      };
    }

    // 5. Academic Integrity / Cheating Refusal
    if (prompt.toLowerCase().includes('give me the answer key') || prompt.toLowerCase().includes('what is the correct answer to the exam')) {
      return {
        text: 'As an educational study assistant, I cannot provide direct exam answer keys or complete restricted assessment solutions. However, I can explain the underlying concepts to help you master the material!',
        mode: 'GROUNDED',
        tokensUsed: { prompt: 60, completion: 45, total: 105 },
      };
    }

    // 6. Default Educational Grounded Response
    const responseText = `Based on your course materials, here is an explanation of the topic:

The curriculum emphasizes structured understanding and practical application. All architectural principles and learning objectives should be reviewed within the respective lesson modules.

If you would like to explore this further, check the recommended lessons in your syllabus.`;

    return {
      text: responseText,
      mode: 'GROUNDED',
      tokensUsed: { prompt: 100, completion: 90, total: 190 },
    };
  }

  public async *streamText(prompt: string, options?: AIGenerationOptions): AsyncIterable<AIChunk> {
    const result = await this.generateText(prompt, options);
    const words = result.text.split(' ');

    for (let i = 0; i < words.length; i++) {
      const isLast = i === words.length - 1;
      const delta = words[i] + (isLast ? '' : ' ');
      yield { delta, done: false };
    }
    yield { delta: '', done: true };
  }
}
