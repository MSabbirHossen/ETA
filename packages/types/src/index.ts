export { UserRole, UserStatus } from './roles';
export { Permission } from './permissions';
export { SupportedLocale } from './common';
export type {
  IUser,
  SupportedLanguage,
  LocaleDirection,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  PaginationMeta,
  PaginationQuery,
} from './common';
export type {
  SyncUserDto,
  UpdateProfileDto,
  SwitchRoleDto,
  AssignRolesDto,
  AuthMeResponseData,
} from './auth';
export {
  ProgramStatus,
  CourseLevel,
  CourseVisibility,
  CourseStatus,
  BatchStatus,
  ModuleStatus,
  EnrollmentStatus,
  EnrollmentSource,
  PaymentStatus,
} from './academic';
export type {
  IProgram,
  ICourse,
  IBatch,
  ISubject,
  IModule,
  IEnrollment,
  CreateProgramDto,
  UpdateProgramDto,
  CreateCourseDto,
  UpdateCourseDto,
  CreateBatchDto,
  UpdateBatchDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  CreateModuleDto,
  UpdateModuleDto,
  CreateEnrollmentDto,
  UpdateEnrollmentStatusDto,
  AssignTeachersDto,
} from './academic';

export {
  LessonType,
  LessonStatus,
  LessonVisibility,
  MaterialType,
  MaterialVisibility,
  MaterialStatus,
  ClassPlatform,
  ClassStatus,
} from './learning';
export type {
  ILesson,
  CreateLessonDto,
  UpdateLessonDto,
  ILearningMaterial,
  CreateMaterialDto,
  UpdateMaterialDto,
  IClassSession,
  CreateClassSessionDto,
  UpdateClassSessionDto,
} from './learning';

export {
  AssignmentStatus,
  SubmissionType,
  SubmissionStatus,
  AssignmentVisibility,
} from './assignment';
export type {
  IAssignment,
  IAssignmentSubmission,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  SubmitAssignmentDto,
  ReviewSubmissionDto,
} from './assignment';

export type {
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
  IQuestionOption,
  IQuestion,
  ISafeQuestionOption,
  ISafeQuestion,
  AssessmentType,
  AssessmentStatus,
  ResultReleasePolicy,
  IAssessmentQuestionConfig,
  IAssessment,
  AttemptStatus,
  GradingStatus,
  IAttemptAnswer,
  IAssessmentAttempt,
  ISafeAssessmentAttemptView,
  CreateQuestionDto,
  UpdateQuestionDto,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  SaveAnswersDto,
  ReviewAttemptDto,
} from './assessment';

export {
  AttendanceStatus,
  AttendanceSessionStatus,
} from './attendance';
export type {
  IAttendanceCorrection,
  IAttendanceRecord,
  IAttendanceSession,
  IAttendanceRosterStudent,
  IAttendanceRosterResponse,
  IAttendanceSummary,
  MarkStudentAttendanceDto,
  BulkMarkAttendanceDto,
  FinalizeAttendanceDto,
  CorrectAttendanceDto,
} from './attendance';

export {
  GradeSourceType,
  GradePublicationStatus,
  AttemptSelectionPolicy,
  MissingWorkPolicy,
} from './gradebook';
export type {
  IGradeScaleItem,
  IGradeCategoryConfig,
  IGradebookConfig,
  IGradeItemScore,
  ICategoryGradeContribution,
  IGradeOverride,
  IGradeCorrectionAudit,
  IStudentGradeResult,
  IGradebookOverviewResponse,
  IGuardianLink,
  SaveGradebookConfigDto,
  SubmitForReviewDto,
  ApproveResultsDto,
  PublishResultsDto,
  OverrideGradeDto,
  CorrectGradeDto,
  UpdateFeedbackDto,
} from './gradebook';

export {
  AdmissionStatus,
  AdmissionDocumentType,
  GuardianRelationshipType,
} from './admission';
export type {
  IApplicationAddress,
  IApplicantPersonalInfo,
  IApplicantEducation,
  IApplicantGuardianInfo,
  IApplicationDocument,
  IApplicationReviewHistory,
  IAdmissionApplication,
  ISafeAdmissionApplication,
  CreateApplicationDraftDto,
  UpdateApplicationDraftDto,
  ReviewApplicationDto,
  DecisionApplicationDto,
  ConvertToStudentDto,
  CreateGuardianLinkDto,
  UpdateGuardianLinkDto,
  VerifyGuardianLinkDto,
} from './admission';

export {
  AnnouncementAudience,
  AnnouncementPriority,
  AnnouncementStatus,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  EmailDeliveryStatus,
} from './communication';
export type {
  IAnnouncementAttachment,
  IAnnouncementAudienceConfig,
  IAnnouncement,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  AnnouncementFilterQuery,
  INotification,
  NotificationFilterQuery,
  IDomainEvent,
} from './communication';

export {
  CalendarSourceType,
  CalendarEventType,
  CalendarEventStatus,
  CalendarView,
} from './calendar';
export type {
  ICalendarEvent,
  CalendarRangeQuery,
  CalendarRangeResponse,
  CreateManualCalendarEventDto,
  UpdateManualCalendarEventDto,
} from './calendar';

export {
  ConversationType,
  ConversationStatus,
  MessageType,
  type IMessageAttachment,
  type IMessageReplyTo,
  type IConversationParticipant,
  type ILastMessageSummary,
  type IConversation,
  type IMessage,
  type CreateConversationDto,
  type SendMessageDto,
  type EditMessageDto,
  type ConversationQuery,
  type MessageQuery,
  type ConversationListResponse,
  type MessageListResponse,
} from './messaging';

export {
  CertificateType,
  CertificateStatus,
  type ICredentialSnapshot,
  type ICertificate,
  type CertificateEligibilityFactor,
  type CertificateEligibilityResult,
  type CertificateVerificationResponse,
  type IssueCertificateDto,
  type BulkIssueCertificatesDto,
  type RevokeCertificateDto,
  type ReissueCertificateDto,
  type CertificateQuery,
  type CertificateListResponse,
} from './certificates';

export {
  FinanceCurrency,
  FeeItemType,
  FeeStructureStatus,
  InvoiceStatus,
  PaymentMethod,
  FinancePaymentStatus,
  ScholarshipType,
  DiscountType,
  RefundStatus,
  type IFeeItem,
  type IFeeStructure,
  type IInvoiceLineItem,
  type IInvoiceDiscount,
  type IInvoice,
  type IPayment,
  type IScholarship,
  type IRefund,
  type IReceipt,
  type IFinanceSummary,
  type CreateFeeStructureDto,
  type UpdateFeeStructureDto,
  type CreateInvoiceDto,
  type BulkCreateInvoicesDto,
  type RecordPaymentDto,
  type CreateScholarshipDto,
  type RequestRefundDto,
  type ApproveRefundDto,
  type InvoiceQuery,
  type PaymentQuery,
} from './finance';

export {
  CMSContentStatus,
  type ISocialLinks,
  type IFooterQuickLink,
  type ISiteSettings,
  type IHeroSection,
  type IStatisticItem,
  type ILeadershipProfile,
  type ITestimonial,
  type IFAQItem,
  type IPublicHomeData,
  type UpdateSiteSettingsDto,
  type UpdateHeroSectionDto,
  type CreateStatisticDto,
  type UpdateStatisticDto,
  type CreateLeadershipDto,
  type UpdateLeadershipDto,
  type CreateTestimonialDto,
  type UpdateTestimonialDto,
  type CreateFAQDto,
  type UpdateFAQDto,
} from './cms';

export {
  ContentPublicationStatus,
  type IBlogCategory,
  type IBlogPost,
  type IBlogPostSummary,
  type CreateBlogPostDto,
  type UpdateBlogPostDto,
  type CreateBlogCategoryDto,
  type UpdateBlogCategoryDto,
  type BlogQueryDto,
} from './blog';

export {
  ResourceType,
  ResourceAccessType,
  type IResource,
  type IResourceSummary,
  type CreateResourceDto,
  type UpdateResourceDto,
  type ResourceQueryDto,
} from './resources';

export {
  SearchResultType,
  type ISearchResult,
  type ISearchResponse,
  type SearchQueryDto,
  type ActorSearchScope,
} from './search';

export {
  ReportType,
  ReportFormat,
  AnalyticsGranularity,
  type ISubjectPerformance,
  type IStudentAnalyticsSummary,
  type IStudentAnalytics,
  type IStrugglingStudent,
  type IUngradedWorkItem,
  type ITeacherAnalyticsSummary,
  type ITeacherBatchBreakdown,
  type ITeacherAnalytics,
  type ITeacherActivityItem,
  type IAdminAnalyticsSummary,
  type IAdminAnalytics,
  type ReportCell,
  type IReportRow,
  type IReportMetadata,
  type IReportResult,
  type ReportFilterDto,
} from './analytics';

export {
  AuditCategory,
  AuditAction,
  AuditResult,
  AuditSeverity,
  AuditActorType,
  type IAuditActor,
  type IAuditChange,
  type IAuditLog,
  type AuditQueryDto,
  type IAuditLogListResponse,
} from './audit';

export type {
  AIProviderType,
  AIResponseMode,
  ICitation,
  IAIConversation,
  IAIMessage,
  IAIKnowledgeChunk,
  IKeyConcept,
  IAISummary,
  IAIGeneratedQuestion,
  IRubricCriterionFeedback,
  IAIRubricFeedback,
  IStudyPlanWeakTopic,
  IStudyPlanAction,
  IStudyPlan,
  ISemanticSearchResult,
  AskEtaQueryDto,
  GenerateQuestionsDto,
  RubricFeedbackDto,
} from './ai';



