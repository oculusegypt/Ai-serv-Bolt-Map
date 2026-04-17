import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead, clearAll, refreshNotifications } = useNotifications();
  const { theme, shadows } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme, shadows);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            try {
              if ((router as any).canGoBack?.()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            } catch {
              router.replace('/(tabs)');
            }
          }}
          style={styles.headerBackBtn}
        >
          <MaterialIcons name="arrow-forward" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionBtn} onPress={() => markAllRead()}>
          <MaterialIcons name="done-all" size={18} color={theme.primary} />
          <Text style={styles.actionText}>{t('notifications.mark_all_read')}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => clearAll()}>
          <MaterialIcons name="delete" size={18} color={theme.error} />
          <Text style={[styles.actionText, { color: theme.error }]}>{t('notifications.clear_all')}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}
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
        {notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialIcons name="notifications-none" size={38} color={theme.textTertiary} />
            <Text style={styles.emptyTitle}>{t('notifications.empty_title')}</Text>
            <Text style={styles.emptyHint}>{t('notifications.empty_hint')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {unreadCount > 0 ? (
              <Text style={styles.unreadText}>
                {unreadCount} {t('notifications.unread')}
              </Text>
            ) : null}
            {notifications.map((n) => (
              <Pressable
                key={n.id}
                style={[styles.card, !n.read && styles.cardUnread]}
                onPress={() => {
                  markRead(n.id).catch(() => {});
                  const orderId = String((n as any)?.orderId || '');
                  if (!orderId) return;
                  router.push({ pathname: '/order-detail' as any, params: { orderId } } as any);
                }}
              >
                <View style={styles.cardIcon}>
                  <MaterialIcons name={n.read ? 'notifications' : 'notifications-active'} size={18} color={n.read ? theme.textSecondary : theme.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{n.title}</Text>
                  <Text style={styles.cardText}>{n.body}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerBackBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
      ...shadows.card,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    actionsRow: {
      flexDirection: 'row-reverse',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    actionBtn: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    unreadText: {
      textAlign: 'right',
      color: theme.textSecondary,
      fontWeight: '700',
    },
    emptyWrap: {
      marginTop: 40,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    emptyTitle: {
      marginTop: 8,
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    emptyHint: {
      marginTop: 6,
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    card: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      borderRadius: 18,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      ...shadows.card,
    },
    cardUnread: {
      borderColor: theme.primary + '60',
    },
    cardIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceSecondary,
    },
    cardBody: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.textPrimary,
      textAlign: 'right',
    },
    cardText: {
      marginTop: 4,
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'right',
    },
  });
