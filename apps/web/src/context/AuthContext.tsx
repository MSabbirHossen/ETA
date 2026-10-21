"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { apiClient } from '../lib/api-client';
import {
  UserRole,
  UserStatus,
  Permission,
  type IUser,
  type UpdateProfileDto,
  type AuthMeResponseData,
} from '@eta/types';
import { getPermissionsForRole } from '@eta/config';
import { toValidObjectId } from '@eta/utils';
import { offlineStorage } from '../lib/offline-storage';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'error';

export interface AuthContextType {
  user: IUser | null;
  firebaseUser: FirebaseUser | null;
  activeRole: UserRole;
  permissions: Permission[];
  status: AuthStatus;
  errorMessage: string | null;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  updateProfile: (dto: UpdateProfileDto) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  getIdToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

declare global {
  interface Window {
    __ETA_TEST_AUTH__?: {
      user: IUser;
      permissions: Permission[];
    };
  }
}

/**
 * Security Boundary: E2E auth test harness is strictly forbidden in production.
 * Both NODE_ENV !== 'production' and NEXT_PUBLIC_ENABLE_E2E_AUTH === 'true' are required.
 */
const isE2EAuthAllowed =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_ENABLE_E2E_AUTH === 'true';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<IUser | null>(() => {
    if (
      isE2EAuthAllowed &&
      typeof window !== 'undefined' &&
      window.__ETA_TEST_AUTH__
    ) {
      return window.__ETA_TEST_AUTH__.user;
    }
    return null;
  });
  const [permissions, setPermissions] = useState<Permission[]>(() => {
    if (
      isE2EAuthAllowed &&
      typeof window !== 'undefined' &&
      window.__ETA_TEST_AUTH__
    ) {
      return window.__ETA_TEST_AUTH__.permissions || [];
    }
    return [];
  });
  const [status, setStatus] = useState<AuthStatus>(() => {
    if (
      isE2EAuthAllowed &&
      typeof window !== 'undefined' &&
      window.__ETA_TEST_AUTH__
    ) {
      return 'authenticated';
    }
    return 'loading';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeRole: UserRole = user?.activeRole ?? UserRole.VISITOR;

  /**
   * Syncs the authenticated Firebase user with the MongoDB application record — PRD §9.3
   */
  const syncWithBackend = useCallback(async (fbUser: FirebaseUser, displayName?: string) => {
    try {
      const token = await fbUser.getIdToken();
      const data = await apiClient.post<AuthMeResponseData>(
        '/auth/sync',
        {
          name: displayName || fbUser.displayName || fbUser.email?.split('@')[0],
          avatarUrl: fbUser.photoURL || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUser(data.user);
      setPermissions(data.permissions);
      setStatus('authenticated');
      setErrorMessage(null);
    } catch (err: unknown) {
      console.warn('Backend sync failed:', err);
      const message = err instanceof Error ? err.message : 'Backend user synchronization failed';

      // Resilient fallback in development mode if backend API is unreachable or DB is connecting
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚡ [DEV] Using fallback user profile from Firebase auth session for:', fbUser.email);
        const fallbackUser: IUser = {
          _id: toValidObjectId(fbUser.uid),
          firebaseUid: fbUser.uid,
          email: fbUser.email || '',
          name: displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'ETA User',
          phone: null,
          avatarUrl: fbUser.photoURL || null,
          roles: [UserRole.STUDENT],
          activeRole: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          preferredLanguage: 'en',
          timezone: 'UTC',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(fallbackUser);
        setPermissions([...getPermissionsForRole(UserRole.STUDENT)]);
        setStatus('authenticated');
        setErrorMessage(null);
        return;
      }

      setErrorMessage(message);
      setStatus('error');
    }
  }, []);

  /**
   * Firebase Auth listener
   */
  useEffect(() => {
    // E2E test harness session injection — PRD §104
    // State is synchronously initialized by useState initializers above.
    if (
      isE2EAuthAllowed &&
      typeof window !== 'undefined' &&
      window.__ETA_TEST_AUTH__
    ) {
      return;
    }

    if (!auth) {
      setStatus('unauthenticated');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setPermissions([]);
        setStatus('unauthenticated');
        setErrorMessage(null);
      } else {
        await syncWithBackend(fbUser);
      }
    });

    return () => unsubscribe();
  }, [syncWithBackend]);

  const login = async (email: string, pass: string) => {
    if (!auth) {
      const msg = 'Authentication service is not configured. Missing Firebase credentials.';
      setErrorMessage(msg);
      setStatus('unauthenticated');
      throw new Error(msg);
    }
    setStatus('loading');
    setErrorMessage(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await syncWithBackend(cred.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setErrorMessage(message);
      setStatus('unauthenticated');
      throw err;
    }
  };

  const signup = async (name: string, email: string, pass: string) => {
    if (!auth) {
      const msg = 'Authentication service is not configured. Missing Firebase credentials.';
      setErrorMessage(msg);
      setStatus('unauthenticated');
      throw new Error(msg);
    }
    setStatus('loading');
    setErrorMessage(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name.trim()) {
        await updateFirebaseProfile(cred.user, { displayName: name.trim() });
      }
      await syncWithBackend(cred.user, name.trim());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setErrorMessage(message);
      setStatus('unauthenticated');
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    if (!auth) {
      const msg = 'Authentication service is not configured. Missing Firebase credentials.';
      setErrorMessage(msg);
      setStatus('unauthenticated');
      throw new Error(msg);
    }
    setStatus('loading');
    setErrorMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await syncWithBackend(cred.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google authentication failed';
      setErrorMessage(message);
      setStatus('unauthenticated');
      throw err;
    }
  };

  const logout = async () => {
    setStatus('loading');
    try {
      // Clear offline stored items and post privacy cleanup command to SW
      offlineStorage.clearUserData(user?._id);
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_USER_DATA' });
      }

      if (isE2EAuthAllowed && typeof window !== 'undefined' && window.__ETA_TEST_AUTH__) {
        delete window.__ETA_TEST_AUTH__;
      }

      if (auth) {
        await firebaseSignOut(auth);
      }
      setUser(null);
      setPermissions([]);
      setStatus('unauthenticated');
    } catch (err: unknown) {
      console.error('Logout error:', err);
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (!auth) return;
    await sendPasswordResetEmail(auth, email);
  };

  const switchRole = async (newRole: UserRole) => {
    if (!user) return;
    // Invalidate any role-specific cache on switch
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_USER_DATA' });
    }
    const data = await apiClient.post<AuthMeResponseData>('/auth/switch-role', {
      role: newRole,
    });
    setUser(data.user);
    setPermissions(data.permissions);
  };

  const updateProfile = async (dto: UpdateProfileDto) => {
    if (!user) return;
    const updated = await apiClient.patch<IUser>('/users/profile', dto);
    setUser(updated);
  };

  const refreshProfile = async () => {
    if (!auth?.currentUser) return;
    const data = await apiClient.get<AuthMeResponseData>('/auth/me');
    setUser(data.user);
    setPermissions(data.permissions);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (activeRole === UserRole.SUPER_ADMIN || user?.roles.includes(UserRole.SUPER_ADMIN)) {
      return true;
    }
    return permissions.includes(permission);
  };

  const hasRole = (role: UserRole): boolean => {
    if (!user) return role === UserRole.VISITOR;
    return user.roles.includes(role) || user.activeRole === role;
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!auth?.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        activeRole,
        permissions,
        status,
        errorMessage,
        login,
        signup,
        loginWithGoogle,
        logout,
        sendPasswordReset,
        switchRole,
        updateProfile,
        hasPermission,
        hasRole,
        getIdToken,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
