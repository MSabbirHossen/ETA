import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  SubmissionType,
  SubmissionStatus,
  type IAssignmentSubmission,
} from '@eta/types';

export interface SubmissionDocument extends Document {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  attemptNumber: number;
  submissionType: SubmissionType;
  textContent: string | null;
  attachments: string[];
  url: string | null;
  submittedAt: Date;
  isLate: boolean;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
  privateNotes: string | null;
  feedbackAttachments: string[];
  reviewedBy: mongoose.Types.ObjectId | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<SubmissionDocument>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    attemptNumber: { type: Number, required: true, min: 1, default: 1 },
    submissionType: {
      type: String,
      enum: Object.values(SubmissionType),
      default: SubmissionType.MIXED,
    },
    textContent: { type: String, default: null, maxlength: 50000 },
    attachments: { type: [String], default: [] },
    url: { type: String, default: null, trim: true },
    submittedAt: { type: Date, required: true, default: Date.now },
    isLate: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(SubmissionStatus),
      default: SubmissionStatus.SUBMITTED,
      index: true,
    },
    score: { type: Number, default: null, min: 0 },
    feedback: { type: String, default: null, maxlength: 5000 },
    privateNotes: { type: String, default: null, maxlength: 5000 },
    feedbackAttachments: { type: [String], default: [] },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

submissionSchema.index({ assignmentId: 1, studentId: 1, attemptNumber: 1 }, { unique: true });
submissionSchema.index({ studentId: 1, assignmentId: 1 });
submissionSchema.index({ assignmentId: 1, status: 1 });

export function toIAssignmentSubmission(doc: SubmissionDocument): IAssignmentSubmission {
  return {
    _id: doc._id.toString(),
    assignmentId: doc.assignmentId.toString(),
    studentId: doc.studentId.toString(),
    attemptNumber: doc.attemptNumber,
    submissionType: doc.submissionType,
    textContent: doc.textContent,
    attachments: doc.attachments || [],
    url: doc.url,
    submittedAt: doc.submittedAt.toISOString(),
    isLate: doc.isLate,
    status: doc.status,
    score: doc.score ?? null,
    feedback: doc.feedback ?? null,
    privateNotes: doc.privateNotes ?? null,
    feedbackAttachments: doc.feedbackAttachments || [],
    reviewedBy: doc.reviewedBy ? doc.reviewedBy.toString() : null,
    reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const AssignmentSubmission: Model<SubmissionDocument> =
  mongoose.models.AssignmentSubmission ||
  mongoose.model<SubmissionDocument>('AssignmentSubmission', submissionSchema);
