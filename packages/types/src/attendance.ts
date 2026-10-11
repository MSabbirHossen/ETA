/**
 * Attendance domain types — PRD §39, §40, §70
 */

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
  LEAVE = 'LEAVE',
}

export enum AttendanceSessionStatus {
  NOT_STARTED = 'NOT_STARTED',
  OPEN = 'OPEN',
  FINALIZED = 'FINALIZED',
}

export interface IAttendanceCorrection {
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  changedBy: string;
  changedAt: string;
  reason: string;
}

export interface IAttendanceRecord {
  _id: string;
  classSessionId: string;
  attendanceSessionId?: string | null;
  courseId: string;
  batchId: string;
  studentId: string;
  status: AttendanceStatus;
  markedBy: string;
  markedAt: string;
  note?: string | null;
  corrections?: IAttendanceCorrection[];
  createdAt: string;
  updatedAt: string;

  // Populated display helpers
  studentName?: string;
  studentEmail?: string;
  studentAvatar?: string | null;
  classTitle?: string;
  batchName?: string;
  courseTitle?: string;
}

export interface IAttendanceSession {
  _id: string;
  classSessionId: string;
  courseId: string;
  batchId: string;
  status: AttendanceSessionStatus;
  openedBy: string;
  openedAt: string;
  finalizedBy?: string | null;
  finalizedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAttendanceRosterStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  avatarUrl?: string | null;
  status?: AttendanceStatus | null;
  markedAt?: string | null;
  markedBy?: string | null;
  note?: string | null;
  recordId?: string | null;
}

export interface IAttendanceRosterResponse {
  classSession: {
    _id: string;
    title: string;
    batchId: string;
    batchName?: string;
    courseId: string;
    courseTitle?: string;
    teacherId: string;
    teacherName?: string;
    scheduledStart: string;
    scheduledEnd: string;
    status: string;
  };
  attendanceSession?: IAttendanceSession | null;
  isFinalized: boolean;
  roster: IAttendanceRosterStudent[];
  stats: {
    totalEligible: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    leave: number;
    unmarked: number;
  };
}

export interface IAttendanceSummary {
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  leaveCount: number;
  attendancePercentage: number;
}

export interface MarkStudentAttendanceDto {
  studentId: string;
  status: AttendanceStatus;
  note?: string | null;
}

export interface BulkMarkAttendanceDto {
  records: MarkStudentAttendanceDto[];
}

export interface FinalizeAttendanceDto {
  autoMarkAbsentForUnmarked?: boolean;
  notes?: string | null;
}

export interface CorrectAttendanceDto {
  status: AttendanceStatus;
  reason: string;
}
