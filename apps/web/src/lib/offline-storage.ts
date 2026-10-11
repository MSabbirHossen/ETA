/**
 * Offline Learning Materials Storage — PRD §19, §22, §58
 *
 * Provides student-driven offline storage for lesson outlines, notes, and curriculum summaries.
 * Ensures zero cross-user leakage by tying records to active userId and clearing on logout.
 * Implements storage quota detection and educational material versioning.
 */

export interface OfflineLessonItem {
  id: string;
  courseId: string;
  title: string;
  courseTitle: string;
  summary: string;
  content: string;
  version: number;
  savedAt: string;
  userId: string;
}

export interface MaterialVersionStatus {
  isSaved: boolean;
  isStale: boolean;
  savedVersion?: number;
}

export interface OfflineStorageStats {
  itemCount: number;
  estimatedBytes: number;
}

const STORAGE_KEY_PREFIX = 'eta_offline_materials_';

function getUserStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export const offlineStorage = {
  /**
   * Save a lesson for offline study with quota protection
   */
  saveLesson: (item: Omit<OfflineLessonItem, 'savedAt'>): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const key = getUserStorageKey(item.userId);
      const existing = offlineStorage.getSavedLessons(item.userId);
      const updated = existing.filter((l) => l.id !== item.id);
      updated.push({
        ...item,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(updated));
      return true;
    } catch (err: unknown) {
      const isQuotaExceeded =
        err instanceof DOMException &&
        (err.code === 22 ||
          err.code === 1014 ||
          err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      console.warn(
        '[OfflineStorage] Failed to save offline lesson:',
        isQuotaExceeded ? 'Storage quota exceeded' : err
      );
      return false;
    }
  },

  /**
   * Retrieve all offline lessons for the current student with strict user isolation
   */
  getSavedLessons: (userId: string): OfflineLessonItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const key = getUserStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Verify item.userId matches requested userId to guarantee zero cross-user leakage
      return parsed.filter(
        (item): item is OfflineLessonItem =>
          Boolean(item) &&
          typeof item === 'object' &&
          item.userId === userId &&
          typeof item.id === 'string'
      );
    } catch {
      return [];
    }
  },

  /**
   * Check if a specific lesson is saved offline
   */
  isLessonSaved: (userId: string, lessonId: string): boolean => {
    const items = offlineStorage.getSavedLessons(userId);
    return items.some((item) => item.id === lessonId);
  },

  /**
   * Check if an offline material snapshot is stale compared to latest online version
   */
  checkVersion: (
    userId: string,
    lessonId: string,
    currentVersion: number
  ): MaterialVersionStatus => {
    const items = offlineStorage.getSavedLessons(userId);
    const match = items.find((item) => item.id === lessonId);
    if (!match) {
      return { isSaved: false, isStale: false };
    }
    return {
      isSaved: true,
      isStale: match.version < currentVersion,
      savedVersion: match.version,
    };
  },

  /**
   * Get storage statistics for quota management
   */
  getStorageStats: (userId: string): OfflineStorageStats => {
    if (typeof window === 'undefined') return { itemCount: 0, estimatedBytes: 0 };
    try {
      const raw = localStorage.getItem(getUserStorageKey(userId)) || '';
      const items = offlineStorage.getSavedLessons(userId);
      return {
        itemCount: items.length,
        estimatedBytes: raw.length * 2, // UTF-16 approximate byte count
      };
    } catch {
      return { itemCount: 0, estimatedBytes: 0 };
    }
  },

  /**
   * Remove a single offline lesson
   */
  removeLesson: (userId: string, lessonId: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const key = getUserStorageKey(userId);
      const existing = offlineStorage.getSavedLessons(userId);
      const filtered = existing.filter((l) => l.id !== lessonId);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (err) {
      console.warn('Failed to remove offline lesson:', err);
    }
  },

  /**
   * Purge all offline data for a user (called on logout) — PRD Security Principle
   */
  clearUserData: (userId?: string): void => {
    if (typeof window === 'undefined') return;
    try {
      if (userId) {
        localStorage.removeItem(getUserStorageKey(userId));
      } else {
        // Clear all keys matching prefix
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch (err) {
      console.warn('Failed to purge offline user data:', err);
    }
  },
};
