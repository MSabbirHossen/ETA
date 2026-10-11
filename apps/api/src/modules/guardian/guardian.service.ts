import { UserRole, UserStatus, type CreateGuardianLinkDto, type UpdateGuardianLinkDto, type IGuardianLink } from '@eta/types';
import { GuardianLink, type GuardianLinkDocument } from '../users/guardian-link.model.js';
import { User } from '../users/user.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { NotificationDispatcher } from '../communication/notification-dispatcher.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction, AuditCategory, AuditSeverity, AuditResult, AuditActorType } from '@eta/types';

export interface GuardianLinkFilter {
  guardianId?: string;
  studentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class GuardianService {
  /**
   * Lists guardian links according to strict role constraints
   */
  public static async listLinks(
    filter: GuardianLinkFilter,
    requestingUser: { userId: string; roles: string[] }
  ) {
    const isAdmin = requestingUser.roles.some((r) =>
      [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(r as UserRole)
    );
    const isStaff = requestingUser.roles.includes(UserRole.STAFF);
    const isGuardian = requestingUser.roles.includes(UserRole.GUARDIAN);
    const isStudent = requestingUser.roles.includes(UserRole.STUDENT);

    const query: Record<string, any> = {};

    if (isAdmin || isStaff) {
      if (filter.guardianId) query.guardianId = filter.guardianId;
      if (filter.studentId) query.studentId = filter.studentId;
      if (filter.status) query.status = filter.status;
    } else if (isGuardian) {
      query.guardianId = requestingUser.userId;
      if (filter.status) query.status = filter.status;
    } else if (isStudent) {
      query.studentId = requestingUser.userId;
      if (filter.status) query.status = filter.status;
    } else {
      throw new ForbiddenError('You are not authorized to view guardian links');
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      GuardianLink.countDocuments(query),
      GuardianLink.find(query)
        .populate('guardianId', 'name email avatarUrl phone')
        .populate('studentId', 'name email avatarUrl phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single link with authorization guard
   */
  public static async getLinkById(
    linkId: string,
    requestingUser: { userId: string; roles: string[] }
  ): Promise<GuardianLinkDocument> {
    const link = await GuardianLink.findById(linkId)
      .populate('guardianId', 'name email avatarUrl phone')
      .populate('studentId', 'name email avatarUrl phone');

    if (!link) {
      throw new NotFoundError('Guardian Link');
    }

    const isAdminOrStaff = requestingUser.roles.some((r) =>
      [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF].includes(r as UserRole)
    );

    const gId = (link.guardianId as any)?._id?.toString() || link.guardianId?.toString();
    const sId = (link.studentId as any)?._id?.toString() || link.studentId?.toString();

    if (!isAdminOrStaff && gId !== requestingUser.userId && sId !== requestingUser.userId) {
      throw new ForbiddenError('You are not authorized to view this guardian link');
    }

    return link;
  }

  /**
   * Creates or reactivates a GuardianLink
   */
  public static async createLink(
    dto: CreateGuardianLinkDto,
    creatorId: string
  ): Promise<GuardianLinkDocument> {
    // 1. Identify guardian user
    let guardianUser;
    if (dto.guardianId) {
      guardianUser = await User.findById(dto.guardianId);
    } else if (dto.guardianEmail) {
      guardianUser = await User.findOne({ email: dto.guardianEmail.trim().toLowerCase() });
      if (!guardianUser) {
        const emailLower = dto.guardianEmail.trim().toLowerCase();
        const fallbackName = emailLower.split('@')[0] || 'Guardian';
        guardianUser = await User.create({
          firebaseUid: `invited_guardian_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: fallbackName,
          email: emailLower,
          roles: [UserRole.GUARDIAN],
          activeRole: UserRole.GUARDIAN,
          status: UserStatus.ACTIVE,
        });
      }
    }

    if (!guardianUser) {
      throw new NotFoundError('Guardian user account');
    }

    // 2. Identify student user
    const studentUser = await User.findById(dto.studentId);
    if (!studentUser) {
      throw new NotFoundError('Student user account');
    }

    // Ensure guardian user has the GUARDIAN role
    if (!guardianUser.roles.includes(UserRole.GUARDIAN)) {
      guardianUser.roles.push(UserRole.GUARDIAN);
      await guardianUser.save();
    }

    // 3. Idempotent check for existing relationship
    const existing = await GuardianLink.findOne({
      guardianId: guardianUser._id,
      studentId: studentUser._id,
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        return existing;
      }
      // Reactivate revoked link
      existing.status = 'ACTIVE';
      existing.verified = true;
      existing.relationship = dto.relationship;
      existing.verifiedBy = creatorId as any;
      existing.verifiedAt = new Date();
      existing.linkedBy = creatorId as any;
      if (dto.permissions) existing.permissions = dto.permissions;
      if (dto.isPrimary !== undefined) existing.isPrimary = dto.isPrimary;
      if (dto.emergencyContact !== undefined) existing.emergencyContact = dto.emergencyContact;
      await existing.save();
      return existing;
    }

    // 4. Create new link
    const newLink = await GuardianLink.create({
      guardianId: guardianUser._id,
      studentId: studentUser._id,
      relationship: dto.relationship,
      status: 'ACTIVE',
      verified: true,
      verifiedBy: creatorId,
      verifiedAt: new Date(),
      linkedBy: creatorId,
      permissions: dto.permissions || [
        'VIEW_ATTENDANCE',
        'VIEW_GRADES',
        'VIEW_SCHEDULE',
        'VIEW_MATERIALS',
      ],
      isPrimary: dto.isPrimary ?? false,
      emergencyContact: dto.emergencyContact ?? false,
    });

    return newLink;
  }

  /**
   * Verifies or un-verifies a link
   */
  public static async verifyLink(
    linkId: string,
    verified: boolean,
    adminId: string
  ): Promise<GuardianLinkDocument> {
    const link = await GuardianLink.findById(linkId);
    if (!link) {
      throw new NotFoundError('Guardian Link');
    }

    link.verified = verified;
    link.status = verified ? 'ACTIVE' : 'PENDING';
    link.verifiedBy = adminId as any;
    link.verifiedAt = new Date();

    await link.save();

    if (verified) {
      const linkObj = (link.toObject ? link.toObject() : link) as unknown as IGuardianLink;
      NotificationDispatcher.dispatchGuardianLinkVerified(linkObj).catch((err) => {
        console.error('[GuardianService] Notification dispatch failed:', err?.message || err);
      });
    }

    await AuditService.record({
      actor: {
        id: adminId,
        type: AuditActorType.USER,
      },
      action: verified ? AuditAction.GUARDIAN_LINK_VERIFIED : AuditAction.GUARDIAN_LINK_REVOKED,
      category: AuditCategory.GUARDIAN,
      resourceType: 'GuardianLink',
      resourceId: link._id.toString(),
      scope: {
        studentId: (link.studentId as any)?._id?.toString() || link.studentId?.toString(),
      },
      newValue: {
        verified,
        status: link.status,
      },
      severity: AuditSeverity.MEDIUM,
      result: AuditResult.SUCCESS,
    });

    return link;
  }

  /**
   * Updates an existing link
   */
  public static async updateLink(
    linkId: string,
    dto: UpdateGuardianLinkDto,
    requestingUser: { userId: string; roles: string[] }
  ): Promise<GuardianLinkDocument> {
    const link = await GuardianLink.findById(linkId);
    if (!link) {
      throw new NotFoundError('Guardian Link');
    }

    const isAdmin = requestingUser.roles.some((r) =>
      [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(r as UserRole)
    );
    const gId = link.guardianId.toString();
    const sId = link.studentId.toString();

    if (!isAdmin && gId !== requestingUser.userId && sId !== requestingUser.userId) {
      throw new ForbiddenError('You are not authorized to update this guardian link');
    }

    if (dto.relationship) link.relationship = dto.relationship;
    if (dto.isPrimary !== undefined) link.isPrimary = dto.isPrimary;
    if (dto.emergencyContact !== undefined) link.emergencyContact = dto.emergencyContact;
    if (dto.permissions && isAdmin) link.permissions = dto.permissions;
    if (dto.status) {
      // Non-admins can only set REVOKED
      if (!isAdmin && dto.status !== 'REVOKED') {
        throw new ForbiddenError('Only administrators can reactivate or modify link status');
      }
      link.status = dto.status;
      if (dto.status === 'REVOKED') {
        link.verified = false;
      }
    }

    await link.save();
    return link;
  }

  /**
   * Revokes a guardian link
   */
  public static async revokeLink(
    linkId: string,
    requestingUser: { userId: string; roles: string[] }
  ): Promise<GuardianLinkDocument> {
    const link = await GuardianLink.findById(linkId);
    if (!link) {
      throw new NotFoundError('Guardian Link');
    }

    const isAdmin = requestingUser.roles.some((r) =>
      [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(r as UserRole)
    );
    const gId = link.guardianId.toString();
    const sId = link.studentId.toString();

    if (!isAdmin && gId !== requestingUser.userId && sId !== requestingUser.userId) {
      throw new ForbiddenError('You are not authorized to revoke this guardian link');
    }

    link.status = 'REVOKED';
    link.verified = false;
    await link.save();

    await AuditService.record({
      actor: {
        id: requestingUser.userId,
        role: requestingUser.roles[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.GUARDIAN_LINK_REVOKED,
      category: AuditCategory.GUARDIAN,
      resourceType: 'GuardianLink',
      resourceId: link._id.toString(),
      scope: {
        studentId: (link.studentId as any)?._id?.toString() || link.studentId?.toString(),
      },
      newValue: {
        status: 'REVOKED',
        verified: false,
      },
      severity: AuditSeverity.MEDIUM,
      result: AuditResult.SUCCESS,
    });

    return link;
  }

  /**
   * Returns list of authorized linked students for a guardian
   * along with their active enrollments for child selector & portal overview
   */
  public static async getMyStudents(guardianId: string) {
    const links = await GuardianLink.find({
      guardianId,
      status: 'ACTIVE',
      verified: true,
    }).populate('studentId', 'name email avatarUrl phone');

    const result = [];
    for (const link of links) {
      const student = link.studentId as any;
      if (!student) continue;

      const enrollments = await Enrollment.find({
        studentId: student._id,
        status: 'active',
      })
        .populate('courseId', 'title code level')
        .populate('batchId', 'name code startDate endDate');

      result.push({
        linkId: link._id,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
        emergencyContact: link.emergencyContact,
        permissions: link.permissions,
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          avatarUrl: student.avatarUrl,
          phone: student.phone,
        },
        enrollments,
      });
    }

    return result;
  }
}
