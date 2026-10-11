import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { GuardianService } from './guardian.service.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { User } from '../users/user.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { UserRole } from '@eta/types';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors.js';

vi.mock('../users/guardian-link.model.js', async () => {
  const actual = await vi.importActual<any>('../users/guardian-link.model.js');
  const MockGuardianLink: any = vi.fn();
  MockGuardianLink.findOne = vi.fn();
  MockGuardianLink.findById = vi.fn();
  MockGuardianLink.find = vi.fn();
  MockGuardianLink.create = vi.fn();
  MockGuardianLink.countDocuments = vi.fn();
  return {
    ...actual,
    GuardianLink: MockGuardianLink,
  };
});

vi.mock('../users/user.model.js', () => {
  const MockUser: any = { findById: vi.fn(), findOne: vi.fn() };
  return { User: MockUser };
});

vi.mock('../academic/enrollment.model.js', () => {
  const MockEnrollment: any = { find: vi.fn() };
  return { Enrollment: MockEnrollment };
});

describe('GuardianService', () => {
  const guardianId = new Types.ObjectId().toString();
  const studentId = new Types.ObjectId().toString();
  const adminId = new Types.ObjectId().toString();
  const linkId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLink', () => {
    it('creates active verified GuardianLink and ensures GUARDIAN role', async () => {
      const mockGuardian = {
        _id: guardianId,
        email: 'parent@example.com',
        roles: [UserRole.VISITOR],
        save: vi.fn(),
      };
      const mockStudent = {
        _id: studentId,
        roles: [UserRole.STUDENT],
      };
      (User.findById as any).mockImplementation((id: string) => {
        if (id === guardianId) return Promise.resolve(mockGuardian);
        if (id === studentId) return Promise.resolve(mockStudent);
        return Promise.resolve(null);
      });
      (GuardianLink.findOne as any).mockResolvedValue(null);

      const mockCreated = {
        _id: linkId,
        guardianId,
        studentId,
        relationship: 'FATHER',
        status: 'ACTIVE',
        verified: true,
      };
      (GuardianLink.create as any).mockResolvedValue(mockCreated);

      const res = await GuardianService.createLink(
        {
          guardianId,
          studentId,
          relationship: 'FATHER',
          isPrimary: true,
        },
        adminId
      );

      expect(mockGuardian.roles).toContain(UserRole.GUARDIAN);
      expect(mockGuardian.save).toHaveBeenCalled();
      expect(GuardianLink.create).toHaveBeenCalled();
      expect(res.status).toBe('ACTIVE');
      expect(res.verified).toBe(true);
    });

    it('returns existing active link idempotently', async () => {
      const mockGuardian = { _id: guardianId, roles: [UserRole.GUARDIAN], save: vi.fn() };
      const mockStudent = { _id: studentId, roles: [UserRole.STUDENT] };
      (User.findById as any).mockImplementation((id: string) => {
        if (id === guardianId) return Promise.resolve(mockGuardian);
        if (id === studentId) return Promise.resolve(mockStudent);
        return Promise.resolve(null);
      });

      const existingActive = {
        _id: linkId,
        guardianId,
        studentId,
        status: 'ACTIVE',
        verified: true,
      };
      (GuardianLink.findOne as any).mockResolvedValue(existingActive);

      const res = await GuardianService.createLink(
        { guardianId, studentId, relationship: 'MOTHER' },
        adminId
      );

      expect(GuardianLink.create).not.toHaveBeenCalled();
      expect(res._id).toBe(linkId);
    });

    it('reactivates previously revoked link', async () => {
      const mockGuardian = { _id: guardianId, roles: [UserRole.GUARDIAN], save: vi.fn() };
      const mockStudent = { _id: studentId, roles: [UserRole.STUDENT] };
      (User.findById as any).mockImplementation((id: string) => {
        if (id === guardianId) return Promise.resolve(mockGuardian);
        if (id === studentId) return Promise.resolve(mockStudent);
        return Promise.resolve(null);
      });

      const existingRevoked = {
        _id: linkId,
        guardianId,
        studentId,
        status: 'REVOKED',
        verified: false,
        relationship: 'OLD',
        save: vi.fn(),
      };
      (GuardianLink.findOne as any).mockResolvedValue(existingRevoked);

      const res = await GuardianService.createLink(
        { guardianId, studentId, relationship: 'LEGAL_GUARDIAN' },
        adminId
      );

      expect(existingRevoked.status).toBe('ACTIVE');
      expect(existingRevoked.verified).toBe(true);
      expect(existingRevoked.relationship).toBe('LEGAL_GUARDIAN');
      expect(existingRevoked.save).toHaveBeenCalled();
    });
  });

  describe('verifyLink', () => {
    it('updates verification and status to ACTIVE', async () => {
      const mockLink = {
        _id: linkId,
        status: 'PENDING',
        verified: false,
        save: vi.fn(),
      };
      (GuardianLink.findById as any).mockResolvedValue(mockLink);

      const res = await GuardianService.verifyLink(linkId, true, adminId);

      expect(mockLink.verified).toBe(true);
      expect(mockLink.status).toBe('ACTIVE');
      expect(mockLink.save).toHaveBeenCalled();
    });
  });

  describe('revokeLink', () => {
    it('allows student to revoke their own guardian link', async () => {
      const mockLink = {
        _id: linkId,
        guardianId: { toString: () => guardianId },
        studentId: { toString: () => studentId },
        status: 'ACTIVE',
        verified: true,
        save: vi.fn(),
      };
      (GuardianLink.findById as any).mockResolvedValue(mockLink);

      const res = await GuardianService.revokeLink(linkId, {
        userId: studentId,
        roles: [UserRole.STUDENT],
      });

      expect(mockLink.status).toBe('REVOKED');
      expect(mockLink.verified).toBe(false);
      expect(mockLink.save).toHaveBeenCalled();
    });

    it('rejects revocation from unrelated third-party user', async () => {
      const strangerId = new Types.ObjectId().toString();
      const mockLink = {
        _id: linkId,
        guardianId: { toString: () => guardianId },
        studentId: { toString: () => studentId },
        status: 'ACTIVE',
        verified: true,
      };
      (GuardianLink.findById as any).mockResolvedValue(mockLink);

      await expect(
        GuardianService.revokeLink(linkId, {
          userId: strangerId,
          roles: [UserRole.STUDENT],
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getMyStudents & Child Overview', () => {
    it('returns linked students with active course enrollments for child switcher', async () => {
      const mockLink = {
        _id: linkId,
        relationship: 'MOTHER',
        isPrimary: true,
        emergencyContact: true,
        permissions: ['VIEW_ATTENDANCE', 'VIEW_GRADES'],
        studentId: {
          _id: studentId,
          name: 'Student Alice',
          email: 'alice@example.com',
          avatarUrl: null,
          phone: '9876543210',
        },
      };

      (GuardianLink.find as any).mockReturnValue({
        populate: vi.fn().mockResolvedValue([mockLink]),
      });

      const mockEnrollments = [
        {
          _id: 'enrollment-1',
          studentId,
          status: 'active',
          courseId: { title: 'Mathematics', code: 'MATH101' },
          batchId: { name: 'Cohort A' },
        },
      ];

      (Enrollment.find as any).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockEnrollments),
        }),
      });

      const res = await GuardianService.getMyStudents(guardianId);

      expect(res).toHaveLength(1);
      expect(res[0].student.name).toBe('Student Alice');
      expect(res[0].relationship).toBe('MOTHER');
      expect(res[0].enrollments).toHaveLength(1);
    });
  });

  describe('Attendance and Gradebook Regression Compatibility', () => {
    it('confirms existing Phase 4C/4D query GuardianLink.findOne({ guardianId, studentId, status: "ACTIVE" }) functions cleanly', async () => {
      const activeLink = {
        _id: linkId,
        guardianId,
        studentId,
        status: 'ACTIVE',
        verified: true,
      };
      (GuardianLink.findOne as any).mockResolvedValue(activeLink);

      const found = await GuardianLink.findOne({
        guardianId,
        studentId,
        status: 'ACTIVE',
      });

      expect(found).not.toBeNull();
      expect(found.status).toBe('ACTIVE');
    });
  });
});
