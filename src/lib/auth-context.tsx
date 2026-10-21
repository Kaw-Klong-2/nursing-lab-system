'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'ADMIN' | 'OFFICER' | 'APPROVER' | 'TEACHER' | 'EXECUTIVE' | 'USER';

export interface User {
  id: string;
  prefix?: string | null;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  studentId?: string | null;
  phone?: string | null;
  approvalScopes?: string | null;
  isExecutive?: boolean | null;
  executiveRole?: string | null;
  status?: string | null;
  lastActiveAt?: string | null;
  lastActiveDevice?: string | null;
}

// Session timeout constants
export const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours (120 minutes)
export const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutes warning countdown
export const SESSION_LIFETIME_NORMAL_MS = 8 * 60 * 60 * 1000; // 8 hours
export const SESSION_LIFETIME_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface AuthContextType {
  currentUser: User | null;
  availableUsers: User[];

  login: (email: string, password?: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (credential: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: (reason?: string | React.MouseEvent | unknown) => void;
  extendSession: () => void;
  updateUser: (updatedData: Partial<User>) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  isApprover: boolean;
  isTeacher: boolean;
  isExecutive: boolean;
}

export function isDefaultAdminUser(user: Partial<User> | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const studentId = (user.studentId || '').toLowerCase().trim();
  // Strictly target only the default shared demo root admin account
  return email === 'admin@lab.nurse.ac.th' || (email === 'admin' && studentId === 'admin');
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function checkSessionActive(): boolean {
  if (typeof window === 'undefined') return true;
  const expiresAtStr = localStorage.getItem('session_expires_at');
  const lastActiveStr = localStorage.getItem('session_last_active');

  const now = Date.now();

  // 1. Check absolute session expiration
  if (expiresAtStr) {
    const expiresAt = parseInt(expiresAtStr, 10);
    if (!isNaN(expiresAt) && now > expiresAt) {
      return false;
    }
  }

  // 2. Check idle inactivity expiration (2 hours)
  if (lastActiveStr) {
    const lastActive = parseInt(lastActiveStr, 10);
    if (!isNaN(lastActive) && now - lastActive > IDLE_TIMEOUT_MS) {
      return false;
    }
  }

  return true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const clearSessionStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('active_user_id');
      localStorage.removeItem('cached_current_user');
      localStorage.removeItem('session_expires_at');
      localStorage.removeItem('session_last_active');
      localStorage.removeItem('session_remember_me');
      try {
        sessionStorage.removeItem('active_admin_session');
      } catch (e) {}
    }
  };

  const logout = (reason?: string | React.MouseEvent | unknown) => {
    if (currentUser?.id) {
      try {
        fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, isLogout: true }),
        }).catch(() => {});
      } catch (e) {}
    }
    setCurrentUser(null);
    clearSessionStorage();
    if (typeof reason === 'string' && reason === 'timeout') {
      router.push('/login?reason=timeout');
    } else if (typeof reason === 'string' && reason.includes('ถูกสั่งให้ออกจากระบบ')) {
      alert(reason);
      router.push('/login?reason=forced');
    } else {
      router.push('/login');
    }
  };

  // Heartbeat pulse while active to maintain presence and detect force logout
  // Enhanced with Page Visibility API, Focus, and User Activity detection
  useEffect(() => {
    if (!currentUser?.id) return;

    let lastPulseSentAt = 0;

    const sendPulse = async (force: boolean = false) => {
      const now = Date.now();
      // Throttle: avoid sending pulses more frequently than once every 15 seconds unless forced
      if (!force && now - lastPulseSentAt < 15 * 1000) {
        return;
      }
      lastPulseSentAt = now;

      try {
        const lastLoginTimeStr = localStorage.getItem('session_last_active');
        const res = await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({
            userId: currentUser.id,
            loginTime: lastLoginTimeStr ? parseInt(lastLoginTimeStr, 10) : undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.forceLogout) {
            logout('เซสชันของคุณถูกสั่งให้ออกจากระบบโดยผู้ดูแลระบบ เพื่อความปลอดภัย');
          }
        }
      } catch (e) {
        // silent fail
      }
    };

    // Initial pulse on mount
    sendPulse(true);

    // Regular interval every 60 seconds (1 minute)
    const interval = setInterval(() => sendPulse(false), 60 * 1000);

    // 1. Visibility change: When switching back to tab, immediately re-awaken online status
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sendPulse(true);
      }
    };

    // 2. Window focus
    const handleFocus = () => {
      sendPulse(false);
    };

    // 3. Network online reconnection
    const handleOnline = () => {
      sendPulse(true);
    };

    // 4. User activity throttled trigger
    let lastActivityPulseAt = 0;
    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastActivityPulseAt > 60 * 1000) {
        lastActivityPulseAt = now;
        sendPulse(false);
      }
    };

    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('online', handleOnline);
      window.addEventListener('click', handleUserInteraction, { passive: true });
      window.addEventListener('keydown', handleUserInteraction, { passive: true });
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined' && typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('click', handleUserInteraction);
        window.removeEventListener('keydown', handleUserInteraction);
      }
    };
  }, [currentUser?.id]);

  const extendSession = () => {
    if (typeof window !== 'undefined' && currentUser) {
      localStorage.setItem('session_last_active', Date.now().toString());
    }
  };

  useEffect(() => {
    async function initializeAuth() {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const rawPortalToken = urlParams.get('portal_token');
        const portalToken = rawPortalToken ? rawPortalToken.replace(/ /g, '+') : null;
        const portalEmail = urlParams.get('email') || urlParams.get('login_hint');

        // 0. Handle seamless SSO Hand-off from external portal (portal_token or email param)
        if (portalEmail || portalToken) {
          try {
            console.log('[AUTH SSO] Attempting seamless handoff for:', portalEmail);
            const res = await fetch('/api/auth/portal-handoff', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: portalToken, email: portalEmail }),
            });
            const data = await res.json();
            if (res.ok && data.success && data.user) {
              const u: User = data.user;
              localStorage.setItem('active_user_id', u.id);
              localStorage.setItem('cached_current_user', JSON.stringify(u));
              localStorage.setItem('session_last_active', Date.now().toString());
              localStorage.setItem('session_expires_at', (Date.now() + SESSION_LIFETIME_REMEMBER_MS).toString());
              localStorage.setItem('session_remember_me', 'true');
              setCurrentUser(u);
              console.log('[AUTH SSO] Successfully authenticated via portal handoff for:', u.email);

              // Clean portal_token & email params from URL cleanly without full page refresh
              if (rawPortalToken) urlParams.delete('portal_token');
              const newSearch = urlParams.toString();
              const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
              window.history.replaceState({}, '', newUrl);

              setIsLoading(false);
              refreshUsers();
              return;
            } else {
              console.warn('[AUTH SSO] Portal handoff failed:', data.error, data.message);
            }
          } catch (e) {
            console.error('[AUTH SSO] Network error during portal handoff', e);
          }
        }

        // 1. Instant local cache hydration for authenticated session with expiration check
        const cachedStr = localStorage.getItem('cached_users');
        const savedUserId = localStorage.getItem('active_user_id');
        const cachedCurrentUserStr = localStorage.getItem('cached_current_user');

        const sessionValid = checkSessionActive();

        if (!sessionValid) {
          console.log('[AUTH SESSION] Session expired, clearing credentials.');
          clearSessionStorage();
          setCurrentUser(null);
        } else {
          // Parse cached user safely
          let cachedParsedUser: User | null = null;
          if (cachedCurrentUserStr) {
            try {
              cachedParsedUser = JSON.parse(cachedCurrentUserStr);
            } catch (e) {}
          }

          // Detect external referral or deep-link parameter (excluding legitimate Google OAuth returns)
          const isGoogleOAuthReferrer =
            Boolean(document.referrer) &&
            (document.referrer.includes('accounts.google.com') ||
              document.referrer.includes('google.com'));

          const isExternalReferrer =
            Boolean(document.referrer) &&
            !document.referrer.includes(window.location.host) &&
            !isGoogleOAuthReferrer;

          const hasExternalDeepLink =
            urlParams.has('bookingNumber') ||
            urlParams.has('booking_code') ||
            urlParams.has('from') ||
            urlParams.has('ref') ||
            urlParams.get('source') === 'external';

          const isCachedDefaultAdmin = isDefaultAdminUser(cachedParsedUser);
          const hasActiveAdminSession = sessionStorage.getItem('active_admin_session') === 'true';

          // SECURITY RULE 1: Prevent Default Admin Auto-Inheritance
          // Root admin (admin@lab.nurse.ac.th) must NEVER be auto-restored across browser restarts
          // or external links without an explicit in-tab active_admin_session flag.
          if (isCachedDefaultAdmin && !hasActiveAdminSession) {
            console.warn('[AUTH SECURITY] Stale default admin session purged from localStorage.');
            clearSessionStorage();
            setCurrentUser(null);
          } else if ((isExternalReferrer || hasExternalDeepLink) && isCachedDefaultAdmin) {
            // SECURITY RULE 2: Deep Link / External System Isolation
            // Only purge generic root admin, not real institutional users
            console.warn('[AUTH SECURITY] Purged default root admin credentials upon external deep-link visit.');
            clearSessionStorage();
            setCurrentUser(null);
          } else if (cachedParsedUser) {
            setCurrentUser(cachedParsedUser);
            // Touch last active on hydration
            localStorage.setItem('session_last_active', Date.now().toString());
          }

          if (cachedStr) {
            const cachedUsers: User[] = JSON.parse(cachedStr);
            if (Array.isArray(cachedUsers) && cachedUsers.length > 0) {
              setAvailableUsers(cachedUsers);
              if (savedUserId && !cachedParsedUser) {
                const found = cachedUsers.find((u) => u.id === savedUserId);
                if (found) {
                  if (isDefaultAdminUser(found) && !hasActiveAdminSession) {
                    clearSessionStorage();
                    setCurrentUser(null);
                  } else {
                    setCurrentUser(found);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Error reading cached users', e);
      } finally {
        setIsLoading(false);
      }

      // Fetch fresh data in background
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const users: User[] = await res.json();
          setAvailableUsers(users);
          if (typeof window !== 'undefined') {
            localStorage.setItem('cached_users', JSON.stringify(users));
            const currentActiveId = localStorage.getItem('active_user_id');
            if (currentActiveId && checkSessionActive()) {
              const freshUser = users.find((u) => u.id === currentActiveId);
              if (freshUser) {
                const isRoot = isDefaultAdminUser(freshUser);
                const hasAdminTab = sessionStorage.getItem('active_admin_session') === 'true';
                if (!isRoot || hasAdminTab) {
                  setCurrentUser(freshUser);
                  localStorage.setItem('cached_current_user', JSON.stringify(freshUser));
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load users in background', err);
      }
    }

    initializeAuth();
  }, []);

  const login = async (
    email: string,
    password?: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'เข้าสู่ระบบไม่สำเร็จ' };
      }

      const user: User = data.user;

      if (typeof window !== 'undefined') {
        const now = Date.now();
        const isRootAdmin = isDefaultAdminUser(user);

        // SECURITY: Root admin sessions are session-only and never given 30-day persistence
        if (isRootAdmin) {
          try {
            sessionStorage.setItem('active_admin_session', 'true');
          } catch (e) {}
        }

        const effectiveRememberMe = isRootAdmin ? false : rememberMe;
        const lifetime = effectiveRememberMe ? SESSION_LIFETIME_REMEMBER_MS : SESSION_LIFETIME_NORMAL_MS;
        const expiresAt = now + lifetime;

        localStorage.setItem('active_user_id', user.id);
        localStorage.setItem('cached_current_user', JSON.stringify(user));
        localStorage.setItem('session_expires_at', expiresAt.toString());
        localStorage.setItem('session_last_active', now.toString());
        localStorage.setItem('session_remember_me', effectiveRememberMe ? 'true' : 'false');
      }

      setCurrentUser(user);

      return { success: true };
    } catch (err: any) {
      console.error('Login request failed', err);
      return { success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
  };

  const loginWithGoogle = async (credential: string, rememberMe = true): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ' };
      }

      const user: User = data.user;

      if (typeof window !== 'undefined') {
        const now = Date.now();
        const isRootAdmin = isDefaultAdminUser(user);

        if (isRootAdmin) {
          try {
            sessionStorage.setItem('active_admin_session', 'true');
          } catch (e) {}
        }

        const effectiveRememberMe = isRootAdmin ? false : rememberMe;
        const lifetime = effectiveRememberMe ? SESSION_LIFETIME_REMEMBER_MS : SESSION_LIFETIME_NORMAL_MS;
        const expiresAt = now + lifetime;

        localStorage.setItem('active_user_id', user.id);
        localStorage.setItem('cached_current_user', JSON.stringify(user));
        localStorage.setItem('session_expires_at', expiresAt.toString());
        localStorage.setItem('session_last_active', now.toString());
        localStorage.setItem('session_remember_me', effectiveRememberMe ? 'true' : 'false');
      }

      setCurrentUser(user);

      return { success: true };
    } catch (err: any) {
      console.error('Google login request failed', err);
      return { success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ Google' };
    }
  };

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const users: User[] = await res.json();
        setAvailableUsers(users);
        if (currentUser) {
          const updated = users.find((u) => u.id === currentUser.id);
          if (updated) {
            setCurrentUser(updated);
            if (typeof window !== 'undefined') {
              localStorage.setItem('cached_current_user', JSON.stringify(updated));
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to refresh users', err);
    }
  };

  const updateUser = async (updatedData: Partial<User>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (res.ok) {
        const updated: User = await res.json();
        setCurrentUser(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('cached_current_user', JSON.stringify(updated));
        }
        setAvailableUsers((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u))
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update user', err);
      return false;
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const isOfficer = currentUser?.role === 'OFFICER' || isAdmin;
  const isExecutive = currentUser?.isExecutive === true || currentUser?.role === 'EXECUTIVE' || isAdmin;
  const isApprover =
    currentUser?.role !== 'USER' && (
      currentUser?.role === 'APPROVER' ||
      (Boolean(currentUser?.approvalScopes) && currentUser?.approvalScopes !== 'NONE' && currentUser?.approvalScopes !== '') ||
      isAdmin
    );
  const isTeacher =
    currentUser?.role === 'TEACHER' ||
    currentUser?.role === 'APPROVER' ||
    isAdmin ||
    Boolean(currentUser?.email?.includes('teacher')) ||
    Boolean(currentUser?.prefix && ['อ.', 'ผศ.', 'ผศ.ดร.', 'รศ.', 'รศ.ดร.', 'ศ.', 'ศ.ดร.', 'ดร.', 'อาจารย์'].includes(currentUser.prefix.trim())) ||
    Boolean(currentUser?.name?.startsWith('อ.')) ||
    Boolean(currentUser?.name?.startsWith('ผศ.')) ||
    Boolean(currentUser?.name?.startsWith('รศ.')) ||
    Boolean(currentUser?.name?.startsWith('ดร.')) ||
    Boolean(currentUser?.name?.startsWith('ศ.')) ||
    Boolean(currentUser?.department?.includes('อาจารย์'));

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        availableUsers,
        login,
        loginWithGoogle,
        logout,
        extendSession,
        updateUser,
        refreshUsers,
        setCurrentUser,
        isLoading,
        isAdmin,
        isOfficer,
        isApprover,
        isTeacher,
        isExecutive,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
