import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ORDER_STATUS_MAP } from '../../services/mockData';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role, orders, providerRequests, refreshOrders } = useApp();
  const { theme, shadows } = useTheme();
  const styles = createStyles(theme, shadows);

  const isAdmin = role === 'admin';
  const isProvider = role === 'provider';

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'>(
    'all'
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshOrders();
    } finally {
      setRefreshing(false);
    }
  };

  const displayOrders = useMemo(() => {
    const list = isProvider || isAdmin ? [...providerRequests, ...orders] : orders;
    return list.filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i);
  }, [isAdmin, isProvider, orders, providerRequests]);

  const normalizeBucket = (s: string): 'pending' | 'in_progress' | 'completed' | 'cancelled' => {
    if (s === 'cancelled') return 'cancelled';
    if (s === 'completed' || s === 'paid') return 'completed';
    if (s === 'pending') return 'pending';
    // accepted / on_way / arrived / in_progress / customer_paid
    return 'in_progress';
  };

  const counts = useMemo(() => {
    const out = { all: displayOrders.length, pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
    displayOrders.forEach((o) => {
      const b = normalizeBucket(String(o.status));
      (out as any)[b] += 1;
    });
    return out;
  }, [displayOrders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return displayOrders;
    return displayOrders.filter((o) => normalizeBucket(String(o.status)) === statusFilter);
  }, [displayOrders, statusFilter]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.pageTitle}>
          {isAdmin ? 'جميع الطلبات' : isProvider ? 'طلبات العملاء' : 'طلباتي'}
        </Text>
        {filteredOrders.length > 0 ? (
          <View style={styles.orderCountBadge}>
            <Text style={styles.orderCountText}>{filteredOrders.length}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
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
        {/* Status Filter Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 12, gap: 10 }}
          style={{ marginBottom: 4 }}
        >
          {(
            [
              { key: 'all', label: 'الكل', count: counts.all, color: theme.primary, icon: 'assignment' },
              { key: 'pending', label: 'معلّق', count: counts.pending, color: '#F59E0B', icon: 'hourglass-empty' },
              { key: 'in_progress', label: 'قيد التنفيذ', count: counts.in_progress, color: '#3B82F6', icon: 'autorenew' },
              { key: 'completed', label: 'مكتمل', count: counts.completed, color: '#10B981', icon: 'check-circle' },
              { key: 'cancelled', label: 'ملغي', count: counts.cancelled, color: '#EF4444', icon: 'cancel' },
            ] as const
          ).map((c) => {
            const active = statusFilter === (c.key as any);
            return (
              <Pressable
                key={c.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter(c.key as any);
                }}
                style={({ pressed }) => [
                  styles.statusCard,
                  { borderColor: active ? c.color : theme.border, backgroundColor: active ? c.color + '10' : theme.surface },
                  pressed ? { opacity: 0.9 } : null,
                ]}
              >
                <View style={styles.statusCardTop}>
                  <View style={[styles.statusIconWrap, { backgroundColor: c.color + '18' }]}>
                    <MaterialIcons name={c.icon as any} size={18} color={c.color} />
                  </View>
                  <Text style={[styles.statusCount, { color: c.color }]}>{c.count}</Text>
                </View>
                <Text style={styles.statusLabel}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&h=400&fit=crop' }}
              style={styles.emptyImage}
              contentFit="contain"
            />
            <Text style={styles.emptyTitle}>مفيش طلبات</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'all'
                ? isProvider
                  ? 'لما حد يطلب خدمة هتلاقي الطلب هنا'
                  : 'ابدأ بطلب خدمة من الصفحة الرئيسية'
                : 'جرّب فلتر مختلف أو ارجع للكل'}
            </Text>
            {role === 'customer' ? (
              <Pressable style={styles.emptyBtn} onPress={() => router.push('/')}> 
                <MaterialIcons name="home" size={20} color="#FFF" />
                <Text style={styles.emptyBtnText}>الصفحة الرئيسية</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          filteredOrders.map((order) => {
            const status = ORDER_STATUS_MAP[order.status] || { label: order.status, color: '#6B7280' };

            return (
              <Pressable
                key={order.id}
                style={styles.orderCard}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push({ pathname: '/(tabs)/order-detail' as any, params: { orderId: order.id } } as any);
                }}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name="arrow-back-ios"
                    size={16}
                    color={theme.textTertiary}
                    style={{ transform: [{ scaleX: -1 }] }}
                  />
                </View>

                <View style={styles.orderBody}>
                  <View style={styles.orderServiceRow}>
                    <MaterialIcons name="build" size={18} color={theme.primary} />
                    <Text style={styles.orderServiceName}>{order.serviceName}</Text>
                  </View>
                  <View style={styles.orderServiceRow}>
                    <MaterialIcons name="location-on" size={18} color={theme.textSecondary} />
                    <Text style={styles.orderAddress} numberOfLines={1}>{order.address}</Text>
                  </View>
                  {order.providerName ? (
                    <View style={styles.orderServiceRow}>
                      <MaterialIcons name="person" size={18} color={theme.textSecondary} />
                      <Text style={styles.orderProviderName}>{order.providerName}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.orderDate}>{order.scheduledDate} - {order.scheduledTime}</Text>
                  <Text style={styles.orderPrice}>{order.totalPrice} ج.م</Text>
                </View>

                {order.status === 'completed' && order.rating ? (
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <MaterialIcons key={star} name={star <= order.rating! ? 'star' : 'star-border'} size={18} color="#F59E0B" />
                    ))}
                    <Text style={styles.ratingLabel}>تقييمك</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.backgroundSecondary },
    headerBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: theme.background, borderBottomWidth: 1, borderBottomColor: theme.border },
    pageTitle: { fontSize: 22, fontWeight: '700', color: theme.textPrimary, textAlign: 'right' },
    orderCountBadge: { backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, minWidth: 24, alignItems: 'center' },
    orderCountText: { color: theme.textOnPrimary, fontSize: 13, fontWeight: '700' },

    statusCard: {
      width: 132,
      borderRadius: 16,
      borderWidth: 1,
      padding: 12,
      backgroundColor: theme.surface,
      ...shadows.card,
    },
    statusCardTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    statusIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusCount: { fontSize: 18, fontWeight: '900' },
    statusLabel: { marginTop: 10, fontSize: 13, fontWeight: '800', color: theme.textPrimary, textAlign: 'right' },

    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyImage: { width: 200, height: 200, marginBottom: 20 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 },
    emptyBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 20 },
    emptyBtnText: { fontSize: 15, fontWeight: '700', color: theme.textOnPrimary },
    orderCard: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginTop: 12, ...shadows.card },
    orderHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    orderHeaderLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 },
    orderNumber: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
    statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 6 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: '600' },
    orderBody: { gap: 8, borderTopWidth: 1, borderTopColor: theme.borderLight, paddingTop: 12 },
    orderServiceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    orderServiceName: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, textAlign: 'right' },
    orderAddress: { fontSize: 13, color: theme.textSecondary, flex: 1, textAlign: 'right' },
    orderProviderAvatar: { width: 24, height: 24, borderRadius: 12 },
    orderProviderName: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, flex: 1, textAlign: 'right' },
    orderProviderRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    ratingText: { fontSize: 12, fontWeight: '700', color: theme.textPrimary },
    orderFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.borderLight },
    orderDate: { fontSize: 12, color: theme.textSecondary },
    orderPrice: { fontSize: 18, fontWeight: '800', color: theme.primary },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 2, justifyContent: 'flex-end' },
    ratingLabel: { fontSize: 12, color: theme.textSecondary, marginRight: 8 },
  });
