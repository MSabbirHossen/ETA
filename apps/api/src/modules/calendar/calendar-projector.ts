import mongoose from 'mongoose';
import {
  CalendarEventType,
  CalendarEventStatus,
  CalendarSourceType,
  type ICalendarEvent,
  ClassStatus,
  AssignmentStatus,
} from '@eta/types';
import { ClassSessionDocument } from '../learning/class-session.model';
import { AssignmentDocument } from '../assignment/assignment.model';
import { AssessmentDocument } from '../assessment/assessment.model';
import { AnnouncementDocument } from '../communication/announcement.model';
import { BatchDocument } from '../academic/batch.model';

export class CalendarProjector {
  /**
   * Project ClassSession -> ICalendarEvent
   */
  static projectClassSession(doc: any): ICalendarEvent {
    let status = CalendarEventStatus.SCHEDULED;
    if (doc.status === ClassStatus.CANCELLED) {
      status = CalendarEventStatus.CANCELLED;
    } else if (doc.status === ClassStatus.COMPLETED) {
      status = CalendarEventStatus.COMPLETED;
    } else if (doc.status === ClassStatus.LIVE) {
      status = CalendarEventStatus.IN_PROGRESS;
    }

    return {
      id: `class-${doc._id}`,
      sourceType: CalendarSourceType.CLASS_SESSION,
      sourceId: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      startAt: new Date(doc.scheduledStart).toISOString(),
      endAt: doc.scheduledEnd ? new Date(doc.scheduledEnd).toISOString() : null,
      allDay: false,
      eventType: CalendarEventType.CLASS,
      status,
      courseId: doc.courseId ? doc.courseId.toString() : null,
      batchId: doc.batchId ? doc.batchId.toString() : null,
      actionUrl: `/student/classes`,
      metadata: {
        platform: doc.platform,
        meetingUrl: doc.meetingUrl,
        teacherId: doc.teacherId ? doc.teacherId.toString() : null,
        attendanceRequirement: doc.attendanceRequirement,
      },
    };
  }

  /**
   * Project Assignment -> ICalendarEvent (Due Date Milestone)
   */
  static projectAssignment(doc: any): ICalendarEvent {
    const dueTime = new Date(doc.dueDate).getTime();
    const isOverdue = dueTime < Date.now();
    return {
      id: `assignment-${doc._id}`,
      sourceType: CalendarSourceType.ASSIGNMENT,
      sourceId: doc._id.toString(),
      title: `Assignment Due: ${doc.title}`,
      description: doc.description,
      startAt: new Date(doc.dueDate).toISOString(),
      endAt: doc.closesAt ? new Date(doc.closesAt).toISOString() : new Date(doc.dueDate).toISOString(),
      allDay: false,
      eventType: CalendarEventType.ASSIGNMENT_DUE,
      status: isOverdue ? CalendarEventStatus.OVERDUE : CalendarEventStatus.SCHEDULED,
      courseId: doc.courseId ? doc.courseId.toString() : null,
      batchId: doc.batchId ? doc.batchId.toString() : null,
      actionUrl: `/student/assignments`,
      metadata: {
        totalMarks: doc.totalMarks,
        publishDate: doc.publishDate ? new Date(doc.publishDate).toISOString() : null,
        allowLateSubmission: doc.allowLateSubmission,
      },
    };
  }

  /**
   * Project Assessment (Quiz or Exam) -> ICalendarEvent
   */
  static projectAssessment(doc: any): ICalendarEvent {
    const isExam = doc.assessmentType === 'EXAM';
    return {
      id: `assessment-${doc._id}`,
      sourceType: CalendarSourceType.ASSESSMENT,
      sourceId: doc._id.toString(),
      title: `${isExam ? 'Exam' : 'Quiz'}: ${doc.title}`,
      description: doc.description,
      startAt: new Date(doc.opensAt).toISOString(),
      endAt: doc.dueAt ? new Date(doc.dueAt).toISOString() : null,
      allDay: false,
      eventType: isExam ? CalendarEventType.EXAM : CalendarEventType.QUIZ,
      status: CalendarEventStatus.SCHEDULED,
      courseId: doc.courseId ? doc.courseId.toString() : null,
      batchId: doc.batchId ? doc.batchId.toString() : null,
      actionUrl: `/student/quizzes`,
      metadata: {
        durationMinutes: doc.durationMinutes,
        totalMarks: doc.totalMarks,
        assessmentType: doc.assessmentType,
      },
    };
  }

  /**
   * Project Announcement -> ICalendarEvent
   */
  static projectAnnouncement(doc: any): ICalendarEvent {
    return {
      id: `announcement-${doc._id}`,
      sourceType: CalendarSourceType.ANNOUNCEMENT,
      sourceId: doc._id.toString(),
      title: `Notice: ${doc.title}`,
      description: doc.summary || doc.body,
      startAt: new Date(doc.publishAt).toISOString(),
      endAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
      allDay: true,
      eventType: CalendarEventType.ANNOUNCEMENT,
      status: CalendarEventStatus.SCHEDULED,
      priority: doc.priority,
      courseId: doc.audience?.targetCourseId ? doc.audience.targetCourseId.toString() : null,
      batchId: doc.audience?.targetBatchId ? doc.audience.targetBatchId.toString() : null,
      actionUrl: `/announcements`,
      metadata: {
        isPublic: doc.isPublic,
        priority: doc.priority,
      },
    };
  }

  /**
   * Project Batch Milestones (Start / End / Enrollment) -> ICalendarEvent
   */
  static projectBatchMilestones(doc: any): ICalendarEvent[] {
    const events: ICalendarEvent[] = [];

    // Cohort Start
    events.push({
      id: `batch-start-${doc._id}`,
      sourceType: CalendarSourceType.BATCH,
      sourceId: doc._id.toString(),
      title: `Cohort Start: ${doc.batchName} (${doc.batchCode})`,
      description: `Official batch commencement date.`,
      startAt: new Date(doc.startDate).toISOString(),
      endAt: new Date(doc.startDate).toISOString(),
      allDay: true,
      eventType: CalendarEventType.ACADEMIC_DEADLINE,
      status: CalendarEventStatus.SCHEDULED,
      courseId: doc.courseId ? doc.courseId.toString() : null,
      batchId: doc._id.toString(),
      batchCode: doc.batchCode,
      actionUrl: `/student/dashboard`,
    });

    // Cohort Completion
    events.push({
      id: `batch-end-${doc._id}`,
      sourceType: CalendarSourceType.BATCH,
      sourceId: doc._id.toString(),
      title: `Cohort Graduation/End: ${doc.batchName} (${doc.batchCode})`,
      description: `Official cohort graduation & conclusion date.`,
      startAt: new Date(doc.endDate).toISOString(),
      endAt: new Date(doc.endDate).toISOString(),
      allDay: true,
      eventType: CalendarEventType.ACADEMIC_DEADLINE,
      status: CalendarEventStatus.SCHEDULED,
      courseId: doc.courseId ? doc.courseId.toString() : null,
      batchId: doc._id.toString(),
      batchCode: doc.batchCode,
      actionUrl: `/student/dashboard`,
    });

    return events;
  }
}
