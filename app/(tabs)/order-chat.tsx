import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { listOrderMessages, sendOrderMessage, markMessageDelivered, type OrderMessageRow } from '../../services/orderMessagesService';
import { supabase } from '../../services/supabaseClient';
import { useMessages } from '../../contexts/MessagesContext';
import { getProfileById } from '../../services/profilesService';

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '';
  }
}

export default function OrderChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, shadows } = useTheme();
  const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);
  const { user } = useAuth();
  const { markOrderMessagesRead } = useMessages();

  const { orderId, otherUserId, otherUserName } = useLocalSearchParams<{ orderId: string; otherUserId: string; otherUserName?: string }>();

  const [messages, setMessages] = useState<OrderMessageRow[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState<boolean | null>(null);
  const [otherLastSeenAt, setOtherLastSeenAt] = useState<string | null>(null);
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(user?.avatar || null);
  const scrollRef = useRef<ScrollView>(null);
  const channelRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);

  const presenceLabel = () => {
    if (typing) return 'يكتب الآن...';
    if (otherOnline) return 'متصل الآن';
    if (otherLastSeenAt) return `آخر ظهور ${formatTime(otherLastSeenAt)}`;
    return '';
  };

  const goBackSafe = () => {
    router.replace('/(tabs)/inbox');
  };

  const onAttach = () => {
    Haptics.selectionAsync();
    Alert.alert('قريباً', 'إرسال الملفات/الصور/الفيديو قيد التجهيز');
  };

  const onCamera = () => {
    Haptics.selectionAsync();
    Alert.alert('قريباً', 'الكاميرا قيد التجهيز');
  };

  const onVoice = () => {
    Haptics.selectionAsync();
    Alert.alert('قريباً', 'الرسائل الصوتية قيد التجهيز');
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!orderId) return;
      const res = await listOrderMessages({ orderId });
      if (cancelled) return;
      if (res.ok) setMessages(res.messages);
    };

    load().catch(() => {});

    // mark all as read on open
    if (orderId) markOrderMessagesRead(orderId).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [markOrderMessagesRead, orderId]);

  useEffect(() => {
    let cancelled = false;
    const loadAvatars = async () => {
      if (!otherUserId) return;
      const res = await getProfileById(otherUserId);
      if (cancelled) return;
      if (res.ok && res.profile) {
        setOtherAvatar(res.profile.avatar || null);
      }
      setMyAvatar(user?.avatar || null);
    };
    loadAvatars().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [otherUserId, user?.avatar]);

  useEffect(() => {
    let cancelled = false;
    const loadPresence = async () => {
      if (!otherUserId) return;
      const { data } = await supabase
        .from('user_presence')
        .select('is_online,last_seen_at')
        .eq('user_id', otherUserId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setOtherOnline(!!(data as any).is_online);
        setOtherLastSeenAt((data as any).last_seen_at || null);
      }
    };
    loadPresence().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [otherUserId]);

  useEffect(() => {
    if (!orderId || !user?.id) return;

    const channel = supabase
      .channel(`order-messages-${orderId}`)
      .on('broadcast', { event: 'typing' } as any, (payload: any) => {
        const p = payload?.payload;
        if (!p) return;
        if (String(p.userId) !== String(otherUserId)) return;
        setTyping(!!p.isTyping);
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` } as any,
        async (payload) => {
          const row = (payload as any)?.new as OrderMessageRow | undefined;
          if (!row?.id) return;

          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === row.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = row;
              return next;
            }
            return [...prev, row].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });

          // receiver marks delivered/read
          if (row.receiver_id === user.id && !row.delivered_at) {
            markMessageDelivered({ messageId: row.id }).catch(() => {});
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence', filter: `user_id=eq.${otherUserId}` } as any,
        (payload: any) => {
          const row = payload?.new;
          if (!row) return;
          setOtherOnline(!!row.is_online);
          setOtherLastSeenAt(row.last_seen_at || null);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      try {
        channelRef.current = null;
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [orderId, user?.id]);

  const setTypingState = (isTyping: boolean) => {
    try {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user?.id, isTyping },
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // update my presence while screen is open
    if (!user?.id) return;
    const upsert = async (isOnline: boolean) => {
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        is_online: isOnline,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    };
    upsert(true).catch(() => {});
    const interval = setInterval(() => upsert(true).catch(() => {}), 20000);
    return () => {
      clearInterval(interval);
      upsert(false).catch(() => {});
    };
  }, [user?.id]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const myId = user?.id;
  const otherId = otherUserId;

  const onSend = async () => {
    if (!myId || !otherId || !orderId) return;
    const text = input.trim();
    if (!text) return;

    Haptics.selectionAsync();
    setInput('');

    const res = await sendOrderMessage({ orderId, senderId: myId, receiverId: otherId, text });
    if (res.ok && res.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message!.id)) return prev;
        return [...prev, res.message!];
      });
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goBackSafe} style={styles.headerBackBtn}>
          <MaterialIcons name="arrow-forward" size={24} color={theme.textPrimary} />
        </Pressable>
        {otherAvatar ? (
          <Image source={{ uri: otherAvatar }} style={styles.headerAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
            <MaterialIcons name="person" size={16} color={theme.textSecondary} />
          </View>
        )}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.headerTitle}>{otherUserName || 'محادثة الطلب'}</Text>
          <Text style={styles.headerSubtitle}>{presenceLabel() || `#${String(orderId).slice(0, 6)}`}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={tabBarHeight}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 12, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) => {
            const mine = m.sender_id === myId;
            const bubbleStyle = mine ? styles.bubbleMine : styles.bubbleOther;
            const textStyle = mine ? styles.bubbleTextMine : styles.bubbleTextOther;

            const ticks = mine
              ? m.read_at
                ? 'done-all'
                : m.delivered_at
                  ? 'done-all'
                  : 'done'
              : null;
            const tickColor = mine && m.read_at ? '#3B82F6' : theme.textTertiary;

            return (
              <View key={m.id} style={[styles.msgRow, mine ? { justifyContent: 'flex-start' } : { justifyContent: 'flex-end' }]}>
                <View style={[styles.bubble, bubbleStyle]}>
                  <Text style={[styles.bubbleText, textStyle]}>{m.text}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.timeText}>{formatTime(m.created_at)}</Text>
                    {ticks ? <MaterialIcons name={ticks as any} size={16} color={tickColor} /> : null}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: 10 }]}
        >
          <Pressable onPress={onAttach} style={styles.iconBtn}>
            <MaterialIcons name="attach-file" size={22} color={theme.textSecondary} />
          </Pressable>
          <Pressable onPress={onCamera} style={styles.iconBtn}>
            <MaterialIcons name="photo-camera" size={20} color={theme.textSecondary} />
          </Pressable>
          <Pressable onPress={onVoice} style={styles.iconBtn}>
            <MaterialIcons name="keyboard-voice" size={22} color={theme.textSecondary} />
          </Pressable>

          <TextInput
            value={input}
            onChangeText={(v) => {
              setInput(v);
              setTypingState(true);
              if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
              typingTimerRef.current = setTimeout(() => setTypingState(false), 1500);
            }}
            placeholder="اكتب رسالة..."
            placeholderTextColor={theme.textTertiary}
            style={styles.input}
            multiline
            textAlign="right"
            onFocus={() => setTypingState(input.trim().length > 0)}
            onBlur={() => setTypingState(false)}
          />

          <Pressable onPress={onSend} style={styles.sendBtn}>
            <MaterialIcons name="send" size={20} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.backgroundSecondary },
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
    headerAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.surfaceSecondary },
    headerAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: theme.textPrimary, textAlign: 'right' },
    headerSubtitle: { fontSize: 12, color: theme.textSecondary, textAlign: 'right', marginTop: 2 },
    msgRow: { flexDirection: 'row', marginBottom: 10 },
    bubble: {
      maxWidth: '82%',
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    bubbleMine: { backgroundColor: '#DCF8C6' },
    bubbleOther: { backgroundColor: '#FFFFFF' },
    bubbleText: { fontSize: 14, lineHeight: 20 },
    bubbleTextMine: { color: theme.textPrimary, textAlign: 'right' },
    bubbleTextOther: { color: theme.textPrimary, textAlign: 'right' },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 6 },
    timeText: { fontSize: 11, color: theme.textTertiary },

    composer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 12,
      paddingTop: 10,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      alignItems: 'flex-end',
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 110,
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: theme.textPrimary,
      fontSize: 14,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
  });
