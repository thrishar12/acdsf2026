/**
 * ACDSF — Desktop & Browser Notification Service
 * Manages HTML5 Notifications API and permissions
 */

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getDesktopNotificationState(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch (e) {
    console.warn('Failed to request notification permission:', e);
    return false;
  }
}

export function sendDesktopNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    onClick?: () => void;
  }
): Notification | null {
  if (getDesktopNotificationState() !== 'granted') {
    return null;
  }

  try {
    const notif = new Notification(title, {
      body: options?.body || 'ACDSF Telemetry Alert',
      icon: options?.icon || '/favicon.ico',
      tag: options?.tag || 'acdsf-alert',
      requireInteraction: options?.requireInteraction ?? false,
    });

    if (options?.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }

    return notif;
  } catch (e) {
    console.warn('Desktop notification error:', e);
    return null;
  }
}

export function testDesktopNotification(): boolean {
  if (getDesktopNotificationState() !== 'granted') return false;
  return !!sendDesktopNotification('🚨 ACDSF Security Alert Test', {
    body: 'Notification subsystem verified and fully operational on sovereign fabric.',
    tag: 'test-alert',
  });
}
