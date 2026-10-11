import mongoose from 'mongoose';
import type { ICitation } from '@eta/types';
import type { UserDocument } from '../../users/user.model.js';
import { resolveActorScope } from '../../search/search.scope.js';
import { AIKnowledgeChunkModel, type AIKnowledgeChunkDocument } from '../models/chunk.model.js';
import { AIProviderFactory } from '../provider/provider.factory.js';
import { Course } from '../../academic/course.model.js';
import { Lesson } from '../../learning/lesson.model.js';
import { LearningMaterial } from '../../learning/material.model.js';
import { CourseStatus, LessonStatus, MaterialStatus } from '@eta/types';
import { chunkDocument } from './chunker.js';

export interface RetrievedChunk {
  chunk: AIKnowledgeChunkDocument;
  similarity: number;
  citation: ICitation;
}

export const MAX_RETRIEVAL_CANDIDATES = 200;

export class RAGRetrievalService {
  /**
   * Computes cosine similarity between two unit-normalized vectors.
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      const valA = a[i] ?? 0;
      const valB = b[i] ?? 0;
      dot += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Retrieves strictly authorized, authoritatively verified curriculum chunks.
   *
   * NON-NEGOTIABLE CORE TRUST BOUNDARIES:
   * 1. Authorization resolution occurs BEFORE retrieval (PRD §5.4, §8, §94).
   * 2. Query-aware candidate generation prevents recency bias from excluding older relevant curriculum.
   * 3. Authoritative domain state validation ensures unpublished, archived, or deleted sources
   *    are never retrievable even if asynchronous RAG purge failed.
   * 4. Content version validation ensures outdated chunk hashes from failed reindexing are discarded.
   */
  public static async retrieveAuthorizedChunks(
    query: string,
    user?: UserDocument,
    options?: {
      targetCourseId?: string;
      targetLessonId?: string;
      topK?: number;
      minSimilarity?: number;
    },
  ): Promise<RetrievedChunk[]> {
    const topK = options?.topK ?? 4;
    const minSimilarity = options?.minSimilarity ?? 0.2;

    // 1. Resolve Actor Scope Server-Side (PRD §5.4, §8, §94)
    const scope = await resolveActorScope(user);

    // 2. Determine Authorized Course Boundaries
    let authorizedCourseIds: mongoose.Types.ObjectId[] = [];

    if (scope.isAdmin) {
      // Admins have institutional access to all published content
      const allCourseIds = await AIKnowledgeChunkModel.distinct('courseId', { status: 'PUBLISHED' });
      authorizedCourseIds = allCourseIds.map((id: any) => new mongoose.Types.ObjectId(id));
    } else {
      const courseIdStrings = new Set<string>();

      // Student active enrollments
      for (const cId of scope.enrolledCourseIds) {
        courseIdStrings.add(cId);
      }
      // Teacher assigned courses
      for (const cId of scope.teacherCourseIds) {
        courseIdStrings.add(cId);
      }

      authorizedCourseIds = Array.from(courseIdStrings).map(
        (id) => new mongoose.Types.ObjectId(id),
      );
    }

    // If an unauthenticated or unauthorized student has 0 authorized courses, return empty immediately
    if (authorizedCourseIds.length === 0) {
      return [];
    }

    // If targetCourseId is specified, verify it is strictly within authorized scope
    if (options?.targetCourseId) {
      const isAuthorized = authorizedCourseIds.some(
        (id) => id.toString() === options.targetCourseId,
      );
      if (!isAuthorized) {
        // Targeted course is outside student/teacher scope — refuse retrieval
        return [];
      }
      authorizedCourseIds = [new mongoose.Types.ObjectId(options.targetCourseId)];
    }

    // 3. Database Filter: Only authorized, published chunks are retrievable
    const dbFilter: Record<string, any> = {
      status: 'PUBLISHED',
      courseId: { $in: authorizedCourseIds },
    };

    if (options?.targetLessonId) {
      dbFilter.lessonId = new mongoose.Types.ObjectId(options.targetLessonId);
    }

    // 3.1. Query-Aware Candidate Generation:
    // Extract keywords to prevent recency bias from excluding older relevant curriculum chunks
    const stopWords = new Set([
      'what', 'is', 'the', 'a', 'an', 'in', 'of', 'for', 'to', 'and', 'or', 'on', 'at',
      'how', 'why', 'can', 'you', 'explain', 'tell', 'me', 'about', 'with', 'from',
      'this', 'that', 'these', 'those', 'which', 'where', 'when', 'who', 'whom',
      'does', 'did', 'have', 'has', 'had', 'are', 'was', 'were', 'been',
    ]);
    const rawTokens = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !stopWords.has(t));

    let candidateChunks: any[] = [];

    if (rawTokens.length > 0) {
      const tokenRegexes = rawTokens.slice(0, 8).map((tok) => {
        const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped, 'i');
      });

      const keywordConditions = tokenRegexes.flatMap((rx) => [
        { title: rx },
        { content: rx },
      ]);

      const [matchedChunks, recentChunks] = await Promise.all([
        AIKnowledgeChunkModel.find({ ...dbFilter, $or: keywordConditions })
          .limit(150)
          .populate('courseId', 'title code')
          .populate('lessonId', 'title slug')
          .lean(),
        AIKnowledgeChunkModel.find(dbFilter)
          .sort({ sourceUpdatedAt: -1 })
          .limit(50)
          .populate('courseId', 'title code')
          .populate('lessonId', 'title slug')
          .lean(),
      ]);

      const candidateMap = new Map<string, any>();
      for (const c of matchedChunks) {
        candidateMap.set(c._id.toString(), c);
      }
      for (const c of recentChunks) {
        if (candidateMap.size >= MAX_RETRIEVAL_CANDIDATES) break;
        candidateMap.set(c._id.toString(), c);
      }
      candidateChunks = Array.from(candidateMap.values());
    } else {
      candidateChunks = await AIKnowledgeChunkModel.find(dbFilter)
        .sort({ sourceUpdatedAt: -1 })
        .limit(MAX_RETRIEVAL_CANDIDATES)
        .populate('courseId', 'title code')
        .populate('lessonId', 'title slug')
        .lean();
    }

    if (candidateChunks.length === 0) {
      return [];
    }

    // 3.2. Authoritative Domain-State & Version Validation (PRD §94 - Domain State Wins)
    // Gather candidate source IDs grouped by sourceType
    const validCourseObjectIds = Array.from(
      new Set(
        candidateChunks
          .map((c) => ((c.courseId as any)?._id || c.courseId)?.toString())
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
      ),
    ).map((id) => new mongoose.Types.ObjectId(id));

    const validLessonObjectIds = Array.from(
      new Set(
        candidateChunks
          .filter((c) => c.sourceType === 'LESSON')
          .map((c) => c.sourceId)
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
      ),
    ).map((id) => new mongoose.Types.ObjectId(id));

    const validMaterialObjectIds = Array.from(
      new Set(
        candidateChunks
          .filter((c) => c.sourceType === 'MATERIAL')
          .map((c) => c.sourceId)
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
      ),
    ).map((id) => new mongoose.Types.ObjectId(id));

    const [authoritativeCourses, authoritativeLessons, authoritativeMaterials] = await Promise.all([
      validCourseObjectIds.length > 0
        ? Course.find({ _id: { $in: validCourseObjectIds }, status: CourseStatus.ACTIVE })
            .select('_id status')
            .lean()
        : [],
      validLessonObjectIds.length > 0
        ? Lesson.find({ _id: { $in: validLessonObjectIds } })
            .select('_id status visibility updatedAt title description bodyContent')
            .lean()
        : [],
      validMaterialObjectIds.length > 0
        ? LearningMaterial.find({ _id: { $in: validMaterialObjectIds } })
            .select('_id status visibility updatedAt title description content')
            .lean()
        : [],
    ]);

    const activeCourseIdSet = new Set(authoritativeCourses.map((c: any) => c._id.toString()));
    const lessonMap = new Map<string, any>(authoritativeLessons.map((l: any) => [l._id.toString(), l]));
    const materialMap = new Map<string, any>(authoritativeMaterials.map((m: any) => [m._id.toString(), m]));

    const validCandidateChunks: typeof candidateChunks = [];

    for (const chunk of candidateChunks) {
      const cId = ((chunk.courseId as any)?._id || chunk.courseId)?.toString();
      // If course is not currently active, reject derived chunk
      if (!cId || !activeCourseIdSet.has(cId)) {
        continue;
      }

      if (chunk.sourceType === 'LESSON') {
        const lesson = lessonMap.get(chunk.sourceId);
        // Authoritative lesson must exist and be strictly PUBLISHED
        if (!lesson) continue;
        if (lesson.status !== LessonStatus.PUBLISHED && (lesson.status as any) !== 'PUBLISHED') {
          continue;
        }

        // Content version validation: Verify candidate chunk hash matches current lesson content
        const fullText = `${lesson.title}\n\n${lesson.description || ''}\n\n${lesson.bodyContent || ''}`;
        const currentChunks = chunkDocument(fullText);
        const currentHashes = new Set(currentChunks.map((c) => c.contentHash));
        if (chunk.contentHash && !currentHashes.has(chunk.contentHash)) {
          continue; // Chunk represents outdated version of lesson
        }
      } else if (chunk.sourceType === 'MATERIAL') {
        const material = materialMap.get(chunk.sourceId);
        // Authoritative material must exist and be strictly PUBLISHED
        if (!material) continue;
        if (material.status !== MaterialStatus.PUBLISHED && (material.status as any) !== 'PUBLISHED') {
          continue;
        }

        // Content version validation
        const fullText = `${material.title}\n\n${material.description || ''}\n\n${material.content || ''}`;
        const currentChunks = chunkDocument(fullText);
        const currentHashes = new Set(currentChunks.map((c) => c.contentHash));
        if (chunk.contentHash && !currentHashes.has(chunk.contentHash)) {
          continue; // Chunk represents outdated version of material
        }
      }

      validCandidateChunks.push(chunk);
    }

    if (validCandidateChunks.length === 0) {
      return [];
    }

    // 4. Generate Query Embedding
    const provider = AIProviderFactory.getProvider();
    const queryEmbedding = await provider.embedText(query);

    // 5. Score and Rank Chunks
    const scored: RetrievedChunk[] = [];

    for (const chunk of validCandidateChunks) {
      const chunkEmbedding = chunk.embedding;
      let score = 0;

      if (chunkEmbedding && chunkEmbedding.length > 0) {
        // Strict embedding dimension compatibility check:
        // Reject cosine comparison if stored chunk dimension does not match active query dimension
        if (chunkEmbedding.length !== queryEmbedding.length) {
          continue;
        }
        score = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
      } else {
        // Fallback lexical token overlap if vector is missing
        const qTokens = new Set(query.toLowerCase().split(/\s+/));
        const cTokens = chunk.content.toLowerCase().split(/\s+/);
        let matches = 0;
        for (const t of cTokens) {
          if (qTokens.has(t)) matches++;
        }
        score = matches / (qTokens.size + 1);
      }

      if (score >= minSimilarity) {
        const courseTitle = (chunk.courseId as any)?.title || 'Course';
        const lessonTitle = (chunk.lessonId as any)?.title || chunk.title;
        const lessonSlug = (chunk.lessonId as any)?.slug;
        const courseId = (chunk.courseId as any)?._id?.toString() || chunk.courseId?.toString();

        const citation: ICitation = {
          sourceType: chunk.sourceType,
          sourceId: chunk.sourceId,
          title: chunk.title,
          courseTitle,
          lessonTitle,
          url: lessonSlug
            ? `/student/courses/${courseId}?lesson=${lessonSlug}`
            : `/student/courses/${courseId}`,
          snippet: chunk.content.slice(0, 200) + '...',
        };

        scored.push({
          chunk: chunk as any,
          similarity: score,
          citation,
        });
      }
    }

    // Sort descending by similarity score
    scored.sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, topK);
  }
}
