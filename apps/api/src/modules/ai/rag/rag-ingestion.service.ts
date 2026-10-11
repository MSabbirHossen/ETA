import { AIKnowledgeChunkModel } from '../models/chunk.model.js';
import { chunkDocument } from './chunker.js';
import { AIProviderFactory } from '../provider/provider.factory.js';
import { Course } from '../../academic/course.model.js';
import { Lesson } from '../../learning/lesson.model.js';
import { LearningMaterial } from '../../learning/material.model.js';
import { CourseStatus, LessonStatus, MaterialStatus } from '@eta/types';

export class RAGIngestionService {
  /**
   * Validates embedding vector integrity before persistence.
   */
  public static validateEmbedding(vector: unknown, expectedDim: number): number[] {
    if (!Array.isArray(vector)) {
      throw new Error('Vector must be an array');
    }
    if (vector.length !== expectedDim) {
      throw new Error(`Vector dimension mismatch: expected ${expectedDim}, got ${vector.length}`);
    }
    let normSq = 0;
    for (let i = 0; i < vector.length; i++) {
      const v = vector[i];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new Error('Vector contains non-finite number');
      }
      normSq += v * v;
    }
    if (normSq <= 0) {
      throw new Error('Vector cannot have zero norm');
    }
    return vector;
  }

  /**
   * Ingests a Lesson into the RAG Knowledge Chunk store.
   * Only PUBLISHED lessons are stored. DRAFT or ARCHIVED lessons are excluded.
   */
  public static async ingestLesson(lessonId: string): Promise<number> {
    const query = Lesson.findById(lessonId);
    let lesson: any = null;
    if (query && typeof (query as any).populate === 'function') {
      const pop = (query as any).populate('courseId', 'title status');
      lesson = pop && typeof pop.lean === 'function' ? await pop.lean() : await pop;
    } else {
      lesson = query && typeof (query as any).lean === 'function' ? await (query as any).lean() : await query;
    }
    if (!lesson) return 0;

    const isPublished = lesson.status === LessonStatus.PUBLISHED || (lesson.status as any) === 'PUBLISHED';
    if (!isPublished) {
      await this.purgeSource(lessonId, 'LESSON');
      return 0;
    }

    const fullText = `${lesson.title}\n\n${lesson.description || ''}\n\n${lesson.bodyContent || ''}`;
    const chunks = chunkDocument(fullText);
    if (chunks.length === 0) return 0;

    const meta = AIProviderFactory.getProviderMetadata();

    // Check if chunks already exist with identical contentHash and matching embedding metadata
    const existing = await AIKnowledgeChunkModel.find({
      sourceId: lessonId,
      sourceType: 'LESSON',
      embeddingDimension: meta.embeddingDimension,
      embeddingVersion: meta.version,
    }).lean();

    const existingHashes = new Set(existing.map((e) => e.contentHash));
    const isIdentical =
      chunks.length === existing.length &&
      chunks.every((c) => existingHashes.has(c.contentHash));

    if (isIdentical) {
      return existing.length;
    }

    // Purge old chunks for this lesson
    await this.purgeSource(lessonId, 'LESSON');

    // Generate embeddings via AI provider
    const provider = AIProviderFactory.getProvider();
    const texts = chunks.map((c) => `${lesson.title}: ${c.content}`);
    const embeddings = await provider.embedBatch(texts);

    const docs = chunks.map((chunk, idx) => {
      const validVector = this.validateEmbedding(embeddings[idx], meta.embeddingDimension);
      return {
        sourceType: 'LESSON',
        sourceId: lessonId,
        courseId: (lesson.courseId as any)?._id || lesson.courseId,
        subjectId: lesson.subjectId,
        moduleId: lesson.moduleId,
        lessonId: lesson._id,
        title: lesson.title,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        visibility: lesson.visibility || 'enrollment-only',
        status: lesson.status,
        embedding: validVector,
        embeddingProvider: meta.provider,
        embeddingModel: meta.embeddingModel,
        embeddingDimension: meta.embeddingDimension,
        embeddingVersion: meta.version,
        contentHash: chunk.contentHash,
        sourceUpdatedAt: lesson.updatedAt || new Date(),
      };
    });

    await AIKnowledgeChunkModel.insertMany(docs);
    return docs.length;
  }

  /**
   * Ingests a LearningMaterial into the knowledge chunk store.
   */
  public static async ingestMaterial(materialId: string): Promise<number> {
    const query = LearningMaterial.findById(materialId);
    const material: any =
      query && typeof (query as any).lean === 'function' ? await (query as any).lean() : await query;
    if (!material) return 0;

    if (material.status !== MaterialStatus.PUBLISHED) {
      await this.purgeSource(materialId, 'MATERIAL');
      return 0;
    }

    const fullText = `${material.title}\n\n${material.description || ''}`;
    const chunks = chunkDocument(fullText);
    if (chunks.length === 0) return 0;

    await this.purgeSource(materialId, 'MATERIAL');

    const meta = AIProviderFactory.getProviderMetadata();
    const provider = AIProviderFactory.getProvider();
    const texts = chunks.map((c) => `${material.title}: ${c.content}`);
    const embeddings = await provider.embedBatch(texts);

    const docs = chunks.map((chunk, idx) => {
      const validVector = this.validateEmbedding(embeddings[idx], meta.embeddingDimension);
      return {
        sourceType: 'MATERIAL',
        sourceId: materialId,
        courseId: material.courseId,
        lessonId: material.lessonId,
        title: material.title,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        visibility: 'enrollment-only',
        status: material.status,
        embedding: validVector,
        embeddingProvider: meta.provider,
        embeddingModel: meta.embeddingModel,
        embeddingDimension: meta.embeddingDimension,
        embeddingVersion: meta.version,
        contentHash: chunk.contentHash,
        sourceUpdatedAt: material.updatedAt || new Date(),
      };
    });

    await AIKnowledgeChunkModel.insertMany(docs);
    return docs.length;
  }

  /**
   * Ingests a published Course syllabus / description.
   */
  public static async ingestCourse(courseId: string): Promise<number> {
    const query = Course.findById(courseId);
    const course: any =
      query && typeof (query as any).lean === 'function' ? await (query as any).lean() : await query;
    if (!course || course.status !== CourseStatus.ACTIVE) {
      await this.purgeSource(courseId, 'COURSE');
      return 0;
    }

    const fullText = `${course.title} (${course.code})\n\n${course.description || ''}`;
    const chunks = chunkDocument(fullText);
    if (chunks.length === 0) return 0;

    await this.purgeSource(courseId, 'COURSE');

    const meta = AIProviderFactory.getProviderMetadata();
    const provider = AIProviderFactory.getProvider();
    const texts = chunks.map((c) => `${course.title}: ${c.content}`);
    const embeddings = await provider.embedBatch(texts);

    const docs = chunks.map((chunk, idx) => {
      const validVector = this.validateEmbedding(embeddings[idx], meta.embeddingDimension);
      return {
        sourceType: 'COURSE',
        sourceId: courseId,
        courseId: course._id,
        title: course.title,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        visibility: course.visibility || 'enrollment-only',
        status: course.status,
        embedding: validVector,
        embeddingProvider: meta.provider,
        embeddingModel: meta.embeddingModel,
        embeddingDimension: meta.embeddingDimension,
        embeddingVersion: meta.version,
        contentHash: chunk.contentHash,
        sourceUpdatedAt: course.updatedAt || new Date(),
      };
    });

    await AIKnowledgeChunkModel.insertMany(docs);
    return docs.length;
  }

  /**
   * Purges all chunks associated with a source entity upon unpublish or deletion.
   */
  public static async purgeSource(sourceId: string, sourceType: string): Promise<number> {
    const res = await AIKnowledgeChunkModel.deleteMany({ sourceId, sourceType });
    return res.deletedCount;
  }

  /**
   * Reindexes published curriculum content across the platform or for a specific course.
   */
  public static async reindexAll(courseId?: string): Promise<{ courses: number; lessons: number; materials: number }> {
    if (courseId) {
      const course = await Course.findById(courseId).lean();
      let courseCount = 0;
      if (course && course.status === CourseStatus.ACTIVE) {
        await this.ingestCourse(courseId);
        courseCount = 1;
      }

      const lessons = await Lesson.find({ courseId, status: LessonStatus.PUBLISHED }).select('_id').lean();
      let lessonCount = 0;
      for (const l of lessons) {
        await this.ingestLesson(l._id.toString());
        lessonCount++;
      }

      const materials = await LearningMaterial.find({ courseId, status: MaterialStatus.PUBLISHED }).select('_id').lean();
      let materialCount = 0;
      for (const m of materials) {
        await this.ingestMaterial(m._id.toString());
        materialCount++;
      }

      return { courses: courseCount, lessons: lessonCount, materials: materialCount };
    }

    const courses = await Course.find({ status: CourseStatus.ACTIVE }).select('_id').lean();
    let courseCount = 0;
    for (const c of courses) {
      await this.ingestCourse(c._id.toString());
      courseCount++;
    }

    const lessons = await Lesson.find({ status: LessonStatus.PUBLISHED }).select('_id').lean();
    let lessonCount = 0;
    for (const l of lessons) {
      await this.ingestLesson(l._id.toString());
      lessonCount++;
    }

    const materials = await LearningMaterial.find({ status: MaterialStatus.PUBLISHED }).select('_id').lean();
    let materialCount = 0;
    for (const m of materials) {
      await this.ingestMaterial(m._id.toString());
      materialCount++;
    }

    return { courses: courseCount, lessons: lessonCount, materials: materialCount };
  }
}
