import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { useMessages } from '../../contexts/MessagesContext';

type ThreadItem = {
  orderId: string;
  otherUserId: string;
  otherUserName: string;
  lastText: string;
  lastAt: string;
  unreadCount: number;
};

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, shadows } = useTheme();
  const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);
  const { user } = useAuth();
  const { refreshUnreadMessagesCount, unreadMessagesCount } = useMessages();

  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([load(), refreshUnreadMessagesCount()]);
    } finally {
      setRefreshing(false);
    }
  };

  const load = async () => {
    if (!user?.id) return;

    // Pull recent messages and aggregate per order (simple MVP).
    const { data } = await supabase
      .from('order_messages')
      .select('order_id,sender_id,receiver_id,text,created_at,read_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(300);

    const rows = (data as any[]) || [];
    const map = new Map<string, ThreadItem>();

    for (const r of rows) {
      const orderId = String(r.order_id);
      if (!orderId) continue;
      if (map.has(orderId)) {
        // accumulate unread counts
        const it = map.get(orderId)!;
        if (String(r.receiver_id) === user.id && !r.read_at) it.unreadCount += 1;
        continue;
      }

      const sender = String(r.sender_id);
      const receiver = String(r.receiver_id);
      const otherUserId = sender === user.id ? receiver : sender;

      map.set(orderId, {
        orderId,
        otherUserId,
        otherUserName: 'محادثة طلب',
        lastText: String(r.text || ''),
        lastAt: String(r.created_at || new Date().toISOString()),
        unreadCount: String(r.receiver_id) === user.id && !r.read_at ? 1 : 0,
      });
    }

    const items = Array.from(map.values()).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

    // Resolve other user names in batch (best-effort)
    const uniqueOtherIds = Array.from(new Set(items.map((t) => t.otherUserId))).filter(Boolean);
    if (uniqueOtherIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id,name').in('id', uniqueOtherIds);
      const nameMap = new Map<string, string>();
      (profs as any[] | null)?.forEach((p) => nameMap.set(String(p.id), String(p.name || 'مستخدم')));
      for (const it of items) {
        it.otherUserName = nameMap.get(it.otherUserId) || it.otherUserName;
      }
    }

    setThreads(items);
  };

  useEffect(() => {
    load().catch(() => {});
    refreshUnreadMessagesCount().catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    // simple refresh when global unread changes
    load().catch(() => {});
  }, [unreadMessagesCount]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            router.replace('/(tabs)/profile');
          }}
          style={styles.headerBackBtn}
        >
          <MaterialIcons name="arrow-forward" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>الرسائل</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 12, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              onRefresh().catch(() => {});
            }}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {threads.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>لا توجد محادثات بعد</Text>
          </View>
        ) : (
          threads.map((t) => (
            <Pressable
              key={t.orderId}
              style={styles.threadRow}
              onPress={() => {
                Haptics.selectionAsync();
                router.push({
                  pathname: '/(tabs)/order-chat' as any,
                  params: { orderId: t.orderId, otherUserId: t.otherUserId, otherUserName: t.otherUserName },
                } as any);
              }}
            >
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.threadTitle}>{t.otherUserName}</Text>
                <Text style={styles.threadSubtitle} numberOfLines={1}>
                  {t.lastText}
                </Text>
              </View>
              {t.unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t.unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerBackBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.textPrimary },

    emptyBox: { padding: 20, borderRadius: 16, backgroundColor: theme.surface, ...shadows.card },
    emptyText: { color: theme.textSecondary, textAlign: 'center' },

    threadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 16,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 10,
      ...shadows.card,
    },
    threadTitle: { fontSize: 15, fontWeight: '800', color: theme.textPrimary, textAlign: 'right' },
    threadSubtitle: { marginTop: 4, fontSize: 13, color: theme.textSecondary, textAlign: 'right' },

    badge: {
      minWidth: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    badgeText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  });
