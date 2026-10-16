export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BN_aQgkRN-BUuOhTA3ip10FBE72jnab57Ao6oa55pIzg4cfmefNmvAjWDup-dEMx8HYVZfFQyFvLrpCdLaQQaso';

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  } catch {
    return false;
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  try {
    if (!('Notification' in window) || !window.Notification) {
      return 'unsupported';
    }
    return window.Notification.permission;
  } catch {
    return 'unsupported';
  }
}

export function isPushUserDisabled(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('push_user_disabled') === 'true';
    }
  } catch {}
  return false;
}

export function setPushUserDisabled(disabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (disabled) {
        localStorage.setItem('push_user_disabled', 'true');
        localStorage.removeItem('push_prompt_setup_done');
      } else {
        localStorage.removeItem('push_user_disabled');
        localStorage.setItem('push_prompt_setup_done', 'true');
      }
    }
  } catch {}
}

export function getEffectivePushStatus(): 'ENABLED' | 'DISABLED' | 'BLOCKED' | 'UNSUPPORTED' {
  if (typeof window === 'undefined') return 'DISABLED';
  if (!isPushNotificationSupported()) return 'UNSUPPORTED';
  const perm = getNotificationPermission();
  if (perm === 'unsupported') return 'UNSUPPORTED';
  if (perm === 'denied') return 'BLOCKED';
  if (isPushUserDisabled()) return 'DISABLED';
  if (perm === 'granted') return 'ENABLED';
  return 'DISABLED';
}

export async function getServiceWorkerRegistrationWithTimeout(
  timeoutMs = 4000
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  } catch {}

  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing?.active) {
      return existing;
    }
  } catch {}

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export async function getOrCreatePushSubscription(
  reg: ServiceWorkerRegistration | null
): Promise<PushSubscription | null> {
  if (!reg || !('pushManager' in reg)) return null;
  try {
    let sub = await reg.pushManager.getSubscription();
    if (sub) return sub;

    // If permission is already granted, create or retrieve subscription silently without re-prompting
    if (getNotificationPermission() === 'granted') {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      return sub;
    }
    return null;
  } catch (err) {
    console.warn('[WebPush] getOrCreatePushSubscription error:', err);
    return null;
  }
}

export async function syncPushSubscriptionToBackend(
  userId: string
): Promise<boolean> {
  if (!userId || typeof window === 'undefined') return false;
  if (!isPushNotificationSupported() || getNotificationPermission() !== 'granted' || isPushUserDisabled()) {
    return false;
  }

  try {
    const reg = await getServiceWorkerRegistrationWithTimeout(4000);
    if (!reg) return false;

    const sub = await getOrCreatePushSubscription(reg);
    if (!sub) return false;

    const res = await fetch('/api/notifications/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: sub.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });

    if (res.ok) {
      setPushUserDisabled(false);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[WebPush] syncPushSubscriptionToBackend error:', err);
    return false;
  }
}


