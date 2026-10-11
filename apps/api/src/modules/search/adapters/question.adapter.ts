import {
  SearchResultType,
  UserRole,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { QuestionModel } from '../../assessment/question.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class QuestionSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.QUESTION;

  isAuthorized(scope: ActorSearchScope): boolean {
    // Only teachers and admins are authorized to search questions (PRD §53)
    if (scope.isPublic) return false;
    if (scope.isAdmin || scope.isStaff) return true;
    return scope.roles.includes(UserRole.TEACHER);
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    if (!this.isAuthorized(scope)) return [];

    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ prompt: regex }, { topic: regex }],
    };

    if (options.courseId) filter.courseId = options.courseId;

    if (!scope.isAdmin && !scope.isStaff) {
      filter.$or = [
        { createdBy: scope.userId, prompt: regex },
        { createdBy: scope.userId, topic: regex },
        ...(scope.teacherCourseIds.length > 0
          ? [
              { courseId: { $in: scope.teacherCourseIds }, prompt: regex },
              { courseId: { $in: scope.teacherCourseIds }, topic: regex },
            ]
          : []),
      ];
    }

    const docs = await QuestionModel.find(filter)
      .select('_id prompt type difficulty marks topic courseId updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc) => {
      const id = doc._id.toString();
      const courseId = doc.courseId ? doc.courseId.toString() : '';

      const actionUrl = scope.isAdmin || scope.isStaff
        ? `/admin/academic`
        : `/teacher/question-bank`;

      const score = calculateRelevanceScore(query, {
        title: doc.prompt,
        subtitle: `Question Bank (${doc.type}) • Topic: ${doc.topic || 'General'}`,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `question_${id}`,
        type: SearchResultType.QUESTION,
        sourceId: id,
        title: doc.prompt,
        subtitle: `Question (${doc.type}) • ${doc.difficulty} • ${doc.marks} Mark${doc.marks > 1 ? 's' : ''}`,
        snippet: doc.topic ? `Topic: ${doc.topic}` : undefined,
        actionUrl,
        score,
        courseId,
        matchedFields: ['prompt', 'topic'],
        metadata: {
          questionType: doc.type,
          difficulty: doc.difficulty,
          marks: doc.marks,
          topic: doc.topic,
        },
      };
    });
  }
}
