export interface CommonTranslations {
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  create: string;
  back: string;
  next: string;
  previous: string;
  close: string;
  confirm: string;
  search: string;
  filter: string;
  reset: string;
  export: string;
  download: string;
  view: string;
  viewAll: string;
  retry: string;
  loading: string;
  error: string;
  success: string;
  notFound: string;
  empty: string;
  actions: string;
  status: string;
  date: string;
  details: string;
  open: string;
  select: string;
  all: string;
  total: string;
  page: string;
  of: string;
  showing: string;
  yes: string;
  no: string;
  optional: string;
  required: string;
}

export interface NavTranslations {
  brand: string;
  tagline: string;
  version: string;
  home: string;
  programs: string;
  blog: string;
  resources: string;
  announcements: string;
  calendar: string;
  admissions: string;
  verifyCredential: string;
  explore: string;
  searchPlaceholder: string;
  roleWorkspace: string;
  profileSettings: string;
  switchActiveRole: string;
  signOut: string;
  signIn: string;
  register: string;
  notifications: string;
  messages: string;
  search: string;
}

export interface AuthTranslations {
  loginTitle: string;
  loginSubtitle: string;
  email: string;
  password: string;
  signInButton: string;
  forgotPassword: string;
  noAccount: string;
  registerHere: string;
  registerTitle: string;
  registerSubtitle: string;
  fullName: string;
  phone: string;
  createAccountButton: string;
  alreadyHaveAccount: string;
  signInHere: string;
  forgotPasswordTitle: string;
  forgotPasswordSubtitle: string;
  sendResetEmail: string;
  backToLogin: string;
  role: string;
  preferredLanguage: string;
  timezone: string;
  profileSettings: string;
  accountAndIdentity: string;
  saveChanges: string;
  profileUpdatedSuccess: string;
}

export interface RolesTranslations {
  student: string;
  teacher: string;
  guardian: string;
  admin: string;
  superAdmin: string;
  staff: string;
  visitor: string;
}

export interface StatusTranslations {
  active: string;
  inactive: string;
  pending: string;
  approved: string;
  rejected: string;
  suspended: string;
  paid: string;
  partial: string;
  refunded: string;
  overdue: string;
  draft: string;
  published: string;
  archived: string;
  present: string;
  absent: string;
  late: string;
  excused: string;
  verified: string;
  revoked: string;
  completed: string;
  enrolled: string;
}

export interface PortalsTranslations {
  student: {
    title: string;
    welcomeBack: string;
    academicOverview: string;
    myCourses: string;
    activeAssignments: string;
    recentQuizzes: string;
    attendanceRate: string;
    currentGpa: string;
    upcomingClasses: string;
    myGrades: string;
    viewAssignments: string;
    viewGrades: string;
    tuitionStatus: string;
  };
  teacher: {
    title: string;
    instructorPortal: string;
    activeClasses: string;
    gradingQueue: string;
    totalStudents: string;
    todaySchedule: string;
    quickActions: string;
    createAssignment: string;
    startClass: string;
    viewGradebook: string;
    recordAttendance: string;
  };
  guardian: {
    title: string;
    guardianPortal: string;
    wards: string;
    attendanceOverview: string;
    academicPerformance: string;
    feeStatements: string;
    messageTeachers: string;
    recentNotices: string;
  };
  admin: {
    title: string;
    administrationConsole: string;
    totalEnrollments: string;
    activeInstructors: string;
    institutionalRevenue: string;
    pendingApplications: string;
    auditLogEngine: string;
    systemHealth: string;
    manageCourses: string;
    manageAdmissions: string;
    financialOversight: string;
    certificatesManagement: string;
  };
}

export interface AuditTranslations {
  title: string;
  subtitle: string;
  recordsCount: string;
  exportCsv: string;
  filters: string;
  categoryFilter: string;
  actionFilter: string;
  severityFilter: string;
  resultFilter: string;
  fromDate: string;
  toDate: string;
  applyFilters: string;
  resetFilters: string;
  tableHeaders: {
    timestamp: string;
    actor: string;
    category: string;
    action: string;
    targetResource: string;
    result: string;
    severity: string;
    inspect: string;
  };
  timestamp: string;
  actor: string;
  category: string;
  action: string;
  targetResource: string;
  result: string;
  severity: string;
  inspect: string;
  loadingRecords: string;
  noRecords: string;
  drawerTitle: string;
  drawerSubtitle: string;
  actorDetails: string;
  actorId: string;
  ipAddress: string;
  userAgent: string;
  changesDiff: string;
  fieldName: string;
  beforeValue: string;
  afterValue: string;
  noChangesRecorded: string;
  closeDrawer: string;
}

export interface FinanceTranslations {
  title: string;
  invoices: string;
  feeStructures: string;
  payments: string;
  refunds: string;
  receipts: string;
  invoiceNumber: string;
  amountDue: string;
  dueDate: string;
  status: string;
  payNow: string;
  viewReceipt: string;
  paymentHistory: string;
  scholarshipApplied: string;
  totalInvoiced: string;
  totalPaid: string;
  outstandingBalance: string;
  balanceDue: string;
  totalAmount: string;
  method: string;
  reference: string;
  noInvoices: string;
  noInvoicesDesc?: string;
  noPayments: string;
  noPaymentsDesc?: string;
  receiptNumber: string;
  paymentNumber: string;
  financialClearanceActive: string;
  outstandingBalanceWarning: string;
  invoiceBreakdown: string;
  lineItems: string;
  subtotal: string;
  discountsApplied: string;
  scholarshipGrant: string;
  balanceRemaining: string;
  closeBreakdown: string;
}

export interface AnalyticsTranslations {
  title: string;
  kpis: string;
  attendanceRate: string;
  passingRate: string;
  enrollmentGrowth: string;
  revenue: string;
  reports: string;
  exportReport: string;
  dateRange: string;
}

export interface CalendarTranslations {
  title: string;
  upcomingEvents: string;
  eventTypes: string;
  filterBy: string;
  today: string;
  month: string;
  week: string;
  day: string;
  allEvents: string;
  agenda: string;
  subtitle: string;
}

export interface SearchTranslations {
  title: string;
  placeholder: string;
  allResults: string;
  courses: string;
  lessons: string;
  materials: string;
  resources: string;
  announcements: string;
  noResultsFound: string;
  pressToSearch: string;
  resultsCount: string;
}

export interface CertificatesTranslations {
  title: string;
  verifyTitle: string;
  verifySubtitle: string;
  enterCode: string;
  verifyButton: string;
  validCredential: string;
  invalidCredential: string;
  recipient: string;
  course: string;
  issueDate: string;
  verificationSuccess: string;
  verificationFailed: string;
}

export interface AdmissionsTranslations {
  title: string;
  apply: string;
  myApplications: string;
  personalDetails: string;
  academicHistory: string;
  submitApplication: string;
  applicationStatus: string;
}

export interface MessagesTranslations {
  title: string;
  inbox: string;
  newChat: string;
  typeMessage: string;
  send: string;
  conversations: string;
  selectToChat: string;
  emptyInbox: string;
  noConversations: string;
  active: string;
  archived: string;
  refresh: string;
  newConversation: string;
  searchPlaceholder: string;
  noMatchingThreads: string;
  startConversationPrompt: string;
  reply: string;
  edit: string;
  delete: string;
  attachFile: string;
  unread: string;
}

export interface NotificationsTranslations {
  title: string;
  unread: string;
  markAllRead: string;
  markRead: string;
  empty: string;
  viewAll: string;
  newAlerts: string;
  subtitle: string;
  refresh: string;
  all: string;
  read: string;
}

export interface CoursesTranslations {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  allLevels: string;
  beginner: string;
  intermediate: string;
  advanced: string;
  noMatchingCourses: string;
  noMatchingCoursesDesc: string;
  applyNow: string;
  curriculaBadge: string;
}

export interface AnnouncementsTranslations {
  title: string;
  subtitle: string;
  allPriorities: string;
  urgent: string;
  important: string;
  standard: string;
  manageBroadcasts: string;
  searchPlaceholder: string;
  noAnnouncements: string;
  noAnnouncementsDesc: string;
}

export interface CMSTranslations {
  title: string;
  hero: string;
  site: string;
  statistics: string;
  leadership: string;
  testimonials: string;
  faq: string;
  saveConfig: string;
  previewPortal: string;
  addItem: string;
}

export interface OfflineTranslations {
  title: string;
  description: string;
  retry: string;
  cachedContent: string;
  requiresConnection: string;
  connectionRestored: string;
  offlineBadge: string;
  availableOffline: string;
  saveOffline: string;
  savedOffline: string;
  removeOffline: string;
  noSavedMaterials: string;
}

export interface PWATranslations {
  installPrompt: string;
  installButton: string;
  dismiss: string;
  updateAvailable: string;
  refreshToUpdate: string;
  offlineReady: string;
}

export interface AITranslations {
  askEta: string;
  askEtaSubtitle: string;
  inputPlaceholder: string;
  sendButton: string;
  newChat: string;
  recentConversations: string;
  selectCourse: string;
  allEnrolledCourses: string;
  suggestedPrompts: string;
  prompt1: string;
  prompt2: string;
  prompt3: string;
  sourcesTitle: string;
  noSourcesFound: string;
  insufficientContextNotice: string;
  studyPlan: string;
  studyPlanSubtitle: string;
  weakTopics: string;
  recommendedLessons: string;
  generatePlan: string;
  generateQuestions: string;
  generateQuestionsSubtitle: string;
  questionDraftNotice: string;
  rubricFeedback: string;
  rubricFeedbackSubtitle: string;
  rubricFeedbackAdvisory: string;
  copyAnswer: string;
  copied: string;
}

/**
 * Complete canonical translation dictionary shape.
 * Every supported language must implement this contract.
 */
export interface TranslationDictionary {
  common: CommonTranslations;
  nav: NavTranslations;
  auth: AuthTranslations;
  roles: RolesTranslations;
  status: StatusTranslations;
  portals: PortalsTranslations;
  audit: AuditTranslations;
  finance: FinanceTranslations;
  analytics: AnalyticsTranslations;
  calendar: CalendarTranslations;
  search: SearchTranslations;
  certificates: CertificatesTranslations;
  admissions: AdmissionsTranslations;
  messages: MessagesTranslations;
  notifications: NotificationsTranslations;
  courses: CoursesTranslations;
  announcements: AnnouncementsTranslations;
  cms: CMSTranslations;
  offline: OfflineTranslations;
  pwa: PWATranslations;
  ai: AITranslations;
}
