import { AIIndexSyncJobModel, type AIIndexSyncOperation } from '../models/sync-job.model.js';
import { RAGIngestionService } from '../rag/rag-ingestion.service.js';
import { Lesson } from '../../learning/lesson.model.js';
import { LearningMaterial } from '../../learning/material.model.js';
import { AIKnowledgeChunkModel } from '../models/chunk.model.js';
import { LessonStatus, MaterialStatus } from '@eta/types';

export interface AIIndexHealthReport {
  totalPublishedLessons: number;
  totalPublishedMaterials: number;
  totalChunks: number;
  pendingSyncJobs: number;
  failedSyncJobs: number;
}

export class AIIndexSyncService {
  /**
   * Records an asynchronous indexing or purge failure with structured logging
   * and persists a durable sync job for subsequent retry.
   * Purge operations receive high priority (10) over Ingest operations (1).
   */
  public static async recordFailure(
    sourceType: 'LESSON' | 'MATERIAL' | 'COURSE',
    sourceId: string,
    operation: AIIndexSyncOperation,
    error: any,
  ): Promise<void> {
    const errorCategory = error?.name || 'IndexSyncError';
    const errorMessage = error?.message || String(error);

    // Structured JSON log for observability without leaking curriculum or secrets
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'AI_INDEX_SYNC_FAILURE',
        sourceType,
        sourceId,
        operation,
        errorCategory,
        errorMessage,
        timestamp: new Date().toISOString(),
      }),
    );

    try {
      const priority = operation === 'PURGE' ? 10 : 1;
      await AIIndexSyncJobModel.findOneAndUpdate(
        { sourceId, sourceType, operation },
        {
          $set: {
            status: 'PENDING',
            priority,
            lastError: errorMessage,
            nextRetryAt: new Date(Date.now() + 5000), // initial 5s backoff
          },
          $inc: { attempts: 1 },
        },
        { upsert: true, new: true },
      );
    } catch (persistErr) {
      console.error('[AIIndexSyncService] Failed to persist sync job:', persistErr);
    }
  }

  /**
   * Clears or marks complete a pending sync job after successful indexing/purge.
   */
  public static async recordSuccess(
    sourceType: 'LESSON' | 'MATERIAL' | 'COURSE',
    sourceId: string,
    operation: AIIndexSyncOperation,
  ): Promise<void> {
    try {
      await AIIndexSyncJobModel.deleteMany({
        sourceId,
        sourceType,
        operation,
      });
    } catch {
      // Non-blocking cleanup
    }
  }

  /**
   * Processes pending synchronization jobs, strictly prioritizing PURGE over INGEST.
   */
  public static async processPendingJobs(limit = 20): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const jobs = await AIIndexSyncJobModel.find({
      status: 'PENDING',
      $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: new Date() } }],
    })
      .sort({ priority: -1, createdAt: 1 })
      .limit(limit);

    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        job.status = 'PROCESSING';
        await job.save();

        if (job.operation === 'PURGE') {
          await RAGIngestionService.purgeSource(job.sourceId, job.sourceType);
        } else if (job.operation === 'INGEST') {
          if (job.sourceType === 'LESSON') {
            await RAGIngestionService.ingestLesson(job.sourceId);
          } else if (job.sourceType === 'MATERIAL') {
            await RAGIngestionService.ingestMaterial(job.sourceId);
          } else if (job.sourceType === 'COURSE') {
            await RAGIngestionService.ingestCourse(job.sourceId);
          }
        }

        await AIIndexSyncJobModel.findByIdAndDelete(job._id);
        succeeded++;
      } catch (err: any) {
        failed++;
        const maxAttempts = 5;
        const attempts = (job.attempts || 1) + 1;
        const isExhausted = attempts >= maxAttempts;

        job.status = isExhausted ? 'FAILED' : 'PENDING';
        job.attempts = attempts;
        job.lastError = err?.message || String(err);
        // Exponential backoff up to 10 minutes
        const backoffMs = Math.min(1000 * Math.pow(2, attempts), 600000);
        job.nextRetryAt = new Date(Date.now() + backoffMs);
        await job.save();
      }
    }

    return { processed: jobs.length, succeeded, failed };
  }

  /**
   * Aggregates index coverage and synchronization health metrics.
   */
  public static async getIndexHealth(): Promise<AIIndexHealthReport> {
    const [
      totalPublishedLessons,
      totalPublishedMaterials,
      totalChunks,
      pendingSyncJobs,
      failedSyncJobs,
    ] = await Promise.all([
      Lesson.countDocuments({ status: LessonStatus.PUBLISHED }).catch(() => 0),
      LearningMaterial.countDocuments({ status: MaterialStatus.PUBLISHED }).catch(() => 0),
      AIKnowledgeChunkModel.countDocuments().catch(() => 0),
      AIIndexSyncJobModel.countDocuments({ status: 'PENDING' }).catch(() => 0),
      AIIndexSyncJobModel.countDocuments({ status: 'FAILED' }).catch(() => 0),
    ]);

    return {
      totalPublishedLessons,
      totalPublishedMaterials,
      totalChunks,
      pendingSyncJobs,
      failedSyncJobs,
    };
  }
}
