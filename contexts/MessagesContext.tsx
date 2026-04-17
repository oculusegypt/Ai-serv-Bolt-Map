import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationsContext';

type MessagesContextValue = {
  unreadMessagesCount: number;
  refreshUnreadMessagesCount: () => Promise<void>;
  markOrderMessagesRead: (orderId: string) => Promise<void>;
};

const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { ensurePermissions } = useNotifications();

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const lastNotifRef = useRef<Record<string, number>>({});
  const refreshTimerRef = useRef<any>(null);
  const presenceIntervalRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);

  const refreshUnreadMessagesCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadMessagesCount(0);
      return;
    }

    const { count, error } = await supabase
      .from('order_messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .is('read_at', null);

    if (!error) setUnreadMessagesCount(count || 0);
  }, [user?.id]);

  const refreshSoon = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshUnreadMessagesCount().catch(() => {});
    }, 250);
  }, [refreshUnreadMessagesCount]);

  const markOrderMessagesRead = useCallback(
    async (orderId: string) => {
      if (!user?.id) return;
      await supabase
        .from('order_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('receiver_id', user.id)
        .is('read_at', null);
      refreshSoon();
    },
    [refreshSoon, user?.id]
  );

  useEffect(() => {
    refreshUnreadMessagesCount().catch(() => {});
  }, [refreshUnreadMessagesCount]);

  useEffect(() => {
    if (!user?.id) return;

    const upsertPresence = async (isOnline: boolean) => {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    };

    const setOnline = (on: boolean) => {
      upsertPresence(on).catch(() => {});
    };

    // initial online
    setOnline(true);
    if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
    presenceIntervalRef.current = setInterval(() => setOnline(true), 25000);

    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if ((prev === 'active') && nextState !== 'active') {
        setOnline(false);
      }
      if (nextState === 'active') {
        setOnline(true);
      }
    });

    return () => {
      try {
        sub.remove();
      } catch {
        // ignore
      }
      try {
        if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      } catch {
        // ignore
      }
      setOnline(false);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `receiver_id=eq.${user.id}` } as any,
        async (payload) => {
          const row: any = (payload as any)?.new;
          const msgId = String(row?.id || '');
          const orderId = String(row?.order_id || '');
          const text = String(row?.text || '');

          // mark delivered immediately for receiver (even if chat screen is closed)
          try {
            if (msgId && !row?.delivered_at) {
              await supabase.from('order_messages').update({ delivered_at: new Date().toISOString() }).eq('id', msgId);
            }
          } catch {
            // ignore
          }

          refreshSoon();

          const now = Date.now();
          const last = lastNotifRef.current[msgId];
          if (last && now - last < 5000) return;
          lastNotifRef.current[msgId] = now;

          // WhatsApp-like: show banner/local notification ONLY (do not add to notifications list)
          try {
            const ok = await ensurePermissions();
            if (!ok) return;
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'رسالة جديدة',
                body: text.length > 60 ? `${text.slice(0, 60)}...` : text,
                sound: 'default',
                data: orderId ? { orderId } : {},
              },
              trigger: null,
            });
          } catch {
            // ignore
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_messages', filter: `receiver_id=eq.${user.id}` } as any,
        () => {
          refreshSoon();
        }
      )
      .subscribe();

    return () => {
      try {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [ensurePermissions, refreshSoon, user?.id]);

  const value = useMemo(
    () => ({
      unreadMessagesCount,
      refreshUnreadMessagesCount,
      markOrderMessagesRead,
    }),
    [unreadMessagesCount, refreshUnreadMessagesCount, markOrderMessagesRead]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider');
  return ctx;
}
