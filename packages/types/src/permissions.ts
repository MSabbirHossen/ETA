/**
 * Granular permissions — matches PRD §8.
 *
 * Format: resource:action
 * Permissions are evaluated on the backend (PRD §8).
 */
export enum Permission {
  // User management
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_SUSPEND = 'user:suspend',
  USER_DELETE = 'user:delete',

  // Student
  STUDENT_VIEW = 'student:view',
  STUDENT_UPDATE = 'student:update',
  STUDENT_ENROLL = 'student:enroll',

  // Teacher
  TEACHER_VIEW = 'teacher:view',
  TEACHER_ASSIGN = 'teacher:assign',

  // Program
  PROGRAM_CREATE = 'program:create',
  PROGRAM_UPDATE = 'program:update',
  PROGRAM_DELETE = 'program:delete',

  // Course
  COURSE_CREATE = 'course:create',
  COURSE_UPDATE = 'course:update',
  COURSE_DELETE = 'course:delete',

  // Batch
  BATCH_CREATE = 'batch:create',
  BATCH_UPDATE = 'batch:update',
  BATCH_DELETE = 'batch:delete',

  // Subject
  SUBJECT_CREATE = 'subject:create',
  SUBJECT_UPDATE = 'subject:update',
  SUBJECT_DELETE = 'subject:delete',

  // Module
  MODULE_CREATE = 'module:create',
  MODULE_UPDATE = 'module:update',
  MODULE_DELETE = 'module:delete',

  // Enrollment
  ENROLLMENT_MANAGE = 'enrollment:manage',

  // Lesson
  LESSON_CREATE = 'lesson:create',
  LESSON_UPDATE = 'lesson:update',
  LESSON_DELETE = 'lesson:delete',

  // Material
  MATERIAL_CREATE = 'material:create',
  MATERIAL_UPDATE = 'material:update',
  MATERIAL_DELETE = 'material:delete',

  // Class
  CLASS_CREATE = 'class:create',
  CLASS_UPDATE = 'class:update',
  CLASS_CANCEL = 'class:cancel',
  CLASS_DELETE = 'class:delete',

  // Attendance
  ATTENDANCE_TAKE = 'attendance:take',
  ATTENDANCE_UPDATE = 'attendance:update',
  ATTENDANCE_VIEW_SELF = 'attendance:view:self',
  ATTENDANCE_VIEW_ANY = 'attendance:view:any',
  ATTENDANCE_FINALIZE = 'attendance:finalize',
  ATTENDANCE_CORRECT = 'attendance:correct',

  // Assignment & Submissions
  ASSIGNMENT_VIEW = 'assignment:view',
  ASSIGNMENT_CREATE = 'assignment:create',
  ASSIGNMENT_UPDATE = 'assignment:update',
  ASSIGNMENT_PUBLISH = 'assignment:publish',
  ASSIGNMENT_DELETE = 'assignment:delete',
  ASSIGNMENT_GRADE = 'assignment:grade',
  SUBMISSION_CREATE = 'submission:create',
  SUBMISSION_VIEW_SELF = 'submission:view:self',
  SUBMISSION_VIEW_ANY = 'submission:view:any',
  SUBMISSION_UPDATE = 'submission:update',
  SUBMISSION_REVIEW = 'submission:review',


  // Question Bank
  QUESTION_VIEW = 'question:view',
  QUESTION_CREATE = 'question:create',
  QUESTION_UPDATE = 'question:update',
  QUESTION_DELETE = 'question:delete',

  // Assessment / Quiz / Exam
  ASSESSMENT_VIEW = 'assessment:view',
  ASSESSMENT_CREATE = 'assessment:create',
  ASSESSMENT_UPDATE = 'assessment:update',
  ASSESSMENT_PUBLISH = 'assessment:publish',
  ASSESSMENT_DELETE = 'assessment:delete',
  ASSESSMENT_GRADE = 'assessment:grade',
  ASSESSMENT_REVIEW = 'assessment:review',

  // Attempt
  ATTEMPT_CREATE = 'attempt:create',
  ATTEMPT_VIEW_SELF = 'attempt:view:self',
  ATTEMPT_VIEW_ANY = 'attempt:view:any',
  ATTEMPT_SUBMIT = 'attempt:submit',

  // Quiz legacy aliases
  QUIZ_CREATE = 'quiz:create',
  QUIZ_PUBLISH = 'quiz:publish',
  QUIZ_GRADE = 'quiz:grade',

  // Exam legacy aliases
  EXAM_CREATE = 'exam:create',
  EXAM_PUBLISH = 'exam:publish',
  EXAM_GRADE = 'exam:grade',

  // Grade & Gradebook (PRD §8, §37, §38)
  GRADE_VIEW = 'grade:view',
  GRADE_UPDATE = 'grade:update',
  GRADE_VIEW_SELF = 'grade:view:self',
  GRADE_VIEW_ANY = 'grade:view:any',
  GRADE_MANAGE = 'grade:manage',
  GRADE_FINALIZE = 'grade:finalize',
  GRADE_PUBLISH = 'grade:publish',
  GRADE_OVERRIDE = 'grade:override',
  GRADE_CORRECT = 'grade:correct',

  // Certificate
  CERTIFICATE_VIEW_SELF = 'certificate:view:self',
  CERTIFICATE_VIEW_ANY = 'certificate:view:any',
  CERTIFICATE_ISSUE = 'certificate:issue',
  CERTIFICATE_REVOKE = 'certificate:revoke',
  CERTIFICATE_REISSUE = 'certificate:reissue',
  CERTIFICATE_MANAGE = 'certificate:manage',


  // CMS & Public Website Management (PRD §8, §51)
  CMS_VIEW = 'cms:view',
  CMS_CREATE = 'cms:create',
  CMS_UPDATE = 'cms:update',
  CMS_PUBLISH = 'cms:publish',
  CMS_DELETE = 'cms:delete',
  CMS_MANAGE = 'cms:manage',

  // Blog & Resources Module (PRD §8, §52)
  BLOG_VIEW = 'blog:view',
  BLOG_CREATE = 'blog:create',
  BLOG_UPDATE = 'blog:update',
  BLOG_PUBLISH = 'blog:publish',
  BLOG_DELETE = 'blog:delete',

  RESOURCE_VIEW = 'resource:view',
  RESOURCE_CREATE = 'resource:create',
  RESOURCE_UPDATE = 'resource:update',
  RESOURCE_PUBLISH = 'resource:publish',
  RESOURCE_DELETE = 'resource:delete',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',

  // Role management
  ROLE_ASSIGN = 'role:assign',

  // Audit Logging (PRD §8, §56)
  AUDIT_VIEW = 'audit:view',
  AUDIT_EXPORT = 'audit:export',

  // Admissions (PRD §8, §42)
  ADMISSION_VIEW = 'admission:view',
  ADMISSION_CREATE = 'admission:create',
  ADMISSION_UPDATE = 'admission:update',
  ADMISSION_REVIEW = 'admission:review',
  ADMISSION_APPROVE = 'admission:approve',
  ADMISSION_REJECT = 'admission:reject',

  // Guardian Linking (PRD §8, §43)
  GUARDIAN_LINK_VIEW = 'guardian_link:view',
  GUARDIAN_LINK_CREATE = 'guardian_link:create',
  GUARDIAN_LINK_APPROVE = 'guardian_link:approve',
  GUARDIAN_LINK_REVOKE = 'guardian_link:revoke',

  // Announcements (PRD §8, §44)
  ANNOUNCEMENT_VIEW = 'announcement:view',
  ANNOUNCEMENT_CREATE = 'announcement:create',
  ANNOUNCEMENT_UPDATE = 'announcement:update',
  ANNOUNCEMENT_PUBLISH = 'announcement:publish',
  ANNOUNCEMENT_DELETE = 'announcement:delete',

  // Notifications (PRD §8, §45)
  NOTIFICATION_VIEW_SELF = 'notification:view:self',
  NOTIFICATION_MANAGE = 'notification:manage',
  NOTIFICATION_SEND = 'notification:send',

  // Calendar (PRD §8, §46)
  CALENDAR_VIEW_SELF = 'calendar:view:self',
  CALENDAR_VIEW_ANY = 'calendar:view:any',
  CALENDAR_CREATE = 'calendar:create',
  CALENDAR_UPDATE = 'calendar:update',
  CALENDAR_DELETE = 'calendar:delete',
  CALENDAR_MANAGE = 'calendar:manage',

  // Messaging (PRD §8, §47)
  MESSAGE_VIEW_SELF = 'message:view:self',
  MESSAGE_VIEW_ANY = 'message:view:any',
  MESSAGE_SEND = 'message:send',
  MESSAGE_MODERATE = 'message:moderate',
  CONVERSATION_CREATE = 'conversation:create',
  CONVERSATION_MANAGE = 'conversation:manage',

  // Finance & Fee Management (PRD §8, §50)
  FINANCE_VIEW_SELF = 'finance:view:self',
  FINANCE_VIEW_ANY = 'finance:view:any',
  FINANCE_MANAGE = 'finance:manage',
  FEE_MANAGE = 'fee:manage',
  INVOICE_CREATE = 'invoice:create',
  INVOICE_UPDATE = 'invoice:update',
  PAYMENT_RECORD = 'payment:record',
  PAYMENT_VIEW = 'payment:view',
  DISCOUNT_MANAGE = 'discount:manage',
  SCHOLARSHIP_MANAGE = 'scholarship:manage',
  REFUND_CREATE = 'refund:create',
  REFUND_APPROVE = 'refund:approve',
  RECEIPT_VIEW = 'receipt:view',

  // Settings
  SETTINGS_UPDATE = 'settings:update',

  // Search Engine (PRD §53)
  SEARCH_USE = 'search:use',
  SEARCH_ADMIN = 'search:admin',

  // Analytics & Reports (PRD §8, §54, §55)
  ANALYTICS_VIEW_SELF = 'analytics:view:self',
  ANALYTICS_VIEW_TEACHER = 'analytics:view:teacher',
  ANALYTICS_VIEW_ADMIN = 'analytics:view:admin',
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',

  // AI & Educational Engine (PRD §93, §94)
  AI_CHAT = 'ai:chat',
  AI_QUESTION_GENERATE = 'ai:question:generate',
  AI_RUBRIC_ASSIST = 'ai:rubric:assist',
  AI_STUDY_PLAN = 'ai:study_plan',
  AI_ADMIN = 'ai:admin',
}
