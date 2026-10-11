import {
  SearchResultType,
  AnnouncementAudience,
  AnnouncementStatus,
  UserRole,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { Announcement } from '../../communication/announcement.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class AnnouncementSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.ANNOUNCEMENT;

  isAuthorized(_scope: ActorSearchScope): boolean {
    return true; // Searchable by students, teachers, guardians, admins, and public (for public notices)
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ title: regex }, { body: regex }, { summary: regex }],
    };

    if (options.courseId) filter['audience.targetCourseId'] = options.courseId;
    if (options.batchId) filter['audience.targetBatchId'] = options.batchId;

    if (!scope.isAdmin && !scope.isStaff) {
      filter.status = AnnouncementStatus.PUBLISHED;

      const audienceConditions: any[] = [
        { 'audience.audienceType': AnnouncementAudience.ALL },
      ];

      if (scope.roles.includes(UserRole.STUDENT)) {
        audienceConditions.push({ 'audience.audienceType': AnnouncementAudience.STUDENTS });
      }
      if (scope.roles.includes(UserRole.TEACHER)) {
        audienceConditions.push({ 'audience.audienceType': AnnouncementAudience.TEACHERS });
      }
      if (scope.roles.includes(UserRole.GUARDIAN)) {
        audienceConditions.push({ 'audience.audienceType': AnnouncementAudience.GUARDIANS });
      }
      if (scope.enrolledCourseIds.length > 0) {
        audienceConditions.push({ 'audience.targetCourseId': { $in: scope.enrolledCourseIds } });
      }
      if (scope.enrolledBatchIds.length > 0) {
        audienceConditions.push({ 'audience.targetBatchId': { $in: scope.enrolledBatchIds } });
      }
      if (scope.teacherCourseIds.length > 0) {
        audienceConditions.push({ 'audience.targetCourseId': { $in: scope.teacherCourseIds } });
      }
      if (scope.teacherBatchIds.length > 0) {
        audienceConditions.push({ 'audience.targetBatchId': { $in: scope.teacherBatchIds } });
      }
      if (scope.userId) {
        audienceConditions.push({ 'audience.targetUserIds': scope.userId });
      }

      filter.$and = [{ $or: audienceConditions }];
    }

    const docs = await Announcement.find(filter)
      .select('_id title summary body priority status publishedAt updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc) => {
      const id = doc._id.toString();
      const actionUrl = scope.isAdmin || scope.isStaff ? `/admin/announcements` : `/announcements`;

      const score = calculateRelevanceScore(query, {
        title: doc.title,
        subtitle: `Priority: ${doc.priority}`,
        snippet: doc.summary || doc.body,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `announcement_${id}`,
        type: SearchResultType.ANNOUNCEMENT,
        sourceId: id,
        title: doc.title,
        subtitle: `Academy Notice • Priority: ${doc.priority}`,
        snippet: doc.summary || doc.body ? (doc.summary || doc.body).slice(0, 160) : undefined,
        actionUrl,
        score,
        matchedFields: ['title', 'summary', 'body'],
        metadata: {
          priority: doc.priority,
          status: doc.status,
          publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : undefined,
        },
      };
    });
  }
}
