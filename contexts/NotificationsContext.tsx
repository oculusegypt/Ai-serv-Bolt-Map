import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import { upsertPushToken } from '../services/pushTokensService';
import { supabase } from '../services/supabaseClient';

export type InAppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  orderId?: string;
};

type NotificationsContextValue = {
  notifications: InAppNotification[];
  unreadCount: number;
  ensurePermissions: () => Promise<boolean>;
  registerPushToken: () => Promise<void>;
  pushInApp: (n: Omit<InAppNotification, 'id' | 'createdAt'> & { createdAt?: string }) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function uuid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const notificationsRef = useRef<InAppNotification[]>([]);
  const didInitChannel = useRef(false);
  const lastRegisteredTokenRef = useRef<string | null>(null);

  const isExpoGo =
    (Constants as any)?.appOwnership === 'expo' ||
    (Constants as any)?.executionEnvironment === 'storeClient';

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    // Reset in-memory state on account switch to avoid showing previous user's notifications.
    setNotifications([]);
    lastRegisteredTokenRef.current = null;
  }, [user?.id]);

  const fetchFromDb = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id,title,body,order_id,created_at,read_at')
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) return;

    const list: InAppNotification[] = ((data as any[]) || []).map((r) => ({
      id: String(r.id),
      title: String(r.title || ''),
      body: String(r.body || ''),
      orderId: r.order_id ? String(r.order_id) : undefined,
      createdAt: String(r.created_at || new Date().toISOString()),
      read: Boolean(r.read_at),
    }));

    setNotifications(list);
  }, [user?.id]);

  useEffect(() => {
    fetchFromDb().catch(() => {});
  }, [fetchFromDb]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` } as any,
        () => {
          fetchFromDb().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [fetchFromDb, user?.id]);

  const ensurePermissions = useCallback(async () => {
    if (Platform.OS === 'web') return false;

    try {
      if (Platform.OS === 'android' && !didInitChannel.current) {
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'تحديثات الطلبات',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B5CF6',
          sound: 'default',
        });
        didInitChannel.current = true;
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === 'granted') return true;
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }, []);

  const registerPushToken = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (!user?.id) return;
    if (!Device.isDevice) return;

    // Expo Go (SDK 53+) does not support remote push tokens.
    // Avoid calling token APIs entirely to prevent dev-only warnings and side effects.
    if (isExpoGo) return;

    const ok = await ensurePermissions();
    if (!ok) return;

    const projectId =
      (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId ||
      (Constants as any)?.expoConfig?.projectId;

    let tokenRes: Notifications.ExpoPushToken | null = null;
    try {
      tokenRes = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    } catch {
      return;
    }

    const token = tokenRes?.data;
    if (!token) return;
    if (lastRegisteredTokenRef.current === token) return;

    const res = await upsertPushToken({
      userId: user.id,
      expoPushToken: token,
      platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web',
      deviceId: (Constants as any)?.deviceId || null,
    });

    if (res.ok) lastRegisteredTokenRef.current = token;
  }, [ensurePermissions, isExpoGo, user?.id]);

  const pushInApp = useCallback(
    async (n: Omit<InAppNotification, 'id' | 'createdAt'> & { createdAt?: string }) => {
      if (user?.id) {
        try {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: n.title,
            body: n.body,
            order_id: n.orderId || null,
          });
        } catch {
          // ignore
        }
      }

      const ok = await ensurePermissions();
      if (!ok) return;

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: n.title,
            body: n.body,
            sound: 'default',
            data: n.orderId ? { orderId: n.orderId } : {},
          },
          trigger: null,
        });
      } catch {}
    },
    [ensurePermissions, user?.id]
  );

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null);
    fetchFromDb().catch(() => {});
  }, [fetchFromDb, user?.id]);

  const markRead = useCallback(
    async (notificationId: string) => {
      if (!user?.id) return;
      const id = String(notificationId || '');
      if (!id) return;

      // Optimistic UI
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

      try {
        await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
      } catch {
        // ignore
      }
    },
    [user?.id]
  );

  const clearAll = useCallback(async () => {
    if (!user?.id) return;
    await supabase.from('notifications').delete();
    setNotifications([]);
  }, [user?.id]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      ensurePermissions,
      registerPushToken,
      pushInApp,
      refreshNotifications: fetchFromDb,
      markRead,
      markAllRead,
      clearAll,
    }),
    [clearAll, ensurePermissions, fetchFromDb, markAllRead, markRead, notifications, pushInApp, registerPushToken, unreadCount]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
