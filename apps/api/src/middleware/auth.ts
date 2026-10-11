import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { admin } from '../config/firebase.js';
import { User, type UserDocument } from '../modules/users/user.model.js';
import { UnauthorizedError, ForbiddenError } from '../common/errors.js';
import { UserStatus, UserRole } from '@eta/types';
import { toValidObjectId } from '@eta/utils';

/**
 * Authentication middleware — PRD §9.3, §73
 *
 * Extracts and verifies the Firebase ID token from Authorization header.
 * Derives authenticated user context from database and attaches to req.user.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      throw new UnauthorizedError('Bearer token is empty');
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid token';
      throw new UnauthorizedError(`Authentication failed: ${message}`);
    }

    req.auth = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    // Look up application user record in MongoDB if database is connected
    let user: UserDocument | null = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ firebaseUid: decodedToken.uid });
    } else if (process.env.NODE_ENV === 'development') {
      // In development mode with disconnected database, create fallback user session
      const isBootstrapSuperAdmin = Boolean(
        process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL &&
        decodedToken.email &&
        decodedToken.email.toLowerCase() === process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL.toLowerCase()
      );
      const role = isBootstrapSuperAdmin ? UserRole.SUPER_ADMIN : UserRole.STUDENT;
      const validObjectId = toValidObjectId(decodedToken.uid);
      req.user = {
        _id: validObjectId,
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'ETA User',
        phone: null,
        avatarUrl: decodedToken.picture || null,
        roles: isBootstrapSuperAdmin ? [UserRole.SUPER_ADMIN, UserRole.ADMIN] : [role],
        activeRole: role,
        status: UserStatus.ACTIVE,
        preferredLanguage: 'en',
        timezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as UserDocument;
      next();
      return;
    }

    if (!user) {
      // User is verified in Firebase but not yet synced in MongoDB
      // (Used by the /sync provisioning endpoint)
      req.user = undefined;
      next();
      return;
    }

    // Verify account state / status — PRD §11
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError('Your account has been suspended. Please contact an administrator.');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenError('Your account is currently inactive.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Ensures that the authenticated user document exists in MongoDB.
 * Applied on routes that require a provisioned application user record.
 */
export function requireUser(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError('User account not provisioned. Please complete initial sync.'));
    return;
  }
  next();
}

/**
 * Optional authentication middleware for public endpoints with personalized context
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (token) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.auth = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
      };
      if (mongoose.connection.readyState === 1) {
        const user = await User.findOne({ firebaseUid: decodedToken.uid });
        if (user && user.status === UserStatus.ACTIVE) {
          req.user = user;
        }
      }
    }
  } catch {
    // Non-blocking for optional authentication
  }

  next();
}
