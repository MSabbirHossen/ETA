import type { ISemanticSearchResult } from '@eta/types';
import type { UserDocument } from '../../users/user.model.js';
import { RAGRetrievalService } from '../rag/rag-retrieval.service.js';

export class SemanticSearchService {
  /**
   * Executes semantic course and curriculum discovery across authorized materials.
   */
  public static async searchCurriculum(
    query: string,
    user?: UserDocument,
    options?: { courseId?: string; limit?: number },
  ): Promise<ISemanticSearchResult[]> {
    const limit = options?.limit ?? 5;

    const retrieved = await RAGRetrievalService.retrieveAuthorizedChunks(query, user, {
      targetCourseId: options?.courseId,
      topK: limit,
      minSimilarity: 0.15,
    });

    return retrieved.map((item) => ({
      chunkId: item.chunk._id.toString(),
      title: item.citation.title,
      courseTitle: item.citation.courseTitle,
      lessonTitle: item.citation.lessonTitle,
      snippet: item.chunk.content.slice(0, 240) + '...',
      similarityScore: Math.round(item.similarity * 100) / 100,
      url: item.citation.url,
    }));
  }
}
