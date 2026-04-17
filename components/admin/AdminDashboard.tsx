import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { ORDER_STATUS_MAP } from '../../services/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { adminColors, createAdminStyles } from './adminStyles';

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user, allUsers, refreshUsers } = useAuth();
  const { orders, providerRequests } = useApp();
  const { theme, shadows } = useTheme();
  const adminStyles = useMemo(() => createAdminStyles(theme, shadows), [theme, shadows]);

  useEffect(() => {
    refreshUsers().catch(() => {});
  }, [refreshUsers]);

  const allOrders = useMemo(() => {
    const list = [...orders, ...providerRequests];
    return list.filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i);
  }, [orders, providerRequests]);

  const customerCount = allUsers.filter((u) => u.role === 'customer').length;
  const providerCount = allUsers.filter((u) => u.role === 'provider').length;
  const totalOrders = allOrders.length;
  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allOrders.forEach((o) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return map;
  }, [allOrders]);

  const serviceStats = useMemo(() => {
    const map: Record<string, number> = {};
    allOrders.forEach((o) => {
      map[o.serviceName] = (map[o.serviceName] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [allOrders]);

  return (
    <SafeAreaView edges={['top']} style={adminStyles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={adminStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={adminStyles.headerTitle}>مرحباً، {user?.name || 'مدير النظام'}</Text>
            <Text style={adminStyles.headerSubtitle}>لوحة تحكم الإدارة</Text>
          </View>
          <View style={adminStyles.headerBadge}>
            <MaterialIcons name="admin-panel-settings" size={20} color={adminColors.admin} />
            <Text style={adminStyles.headerBadgeText}>أدمن</Text>
          </View>
        </View>

        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=300&fit=crop' }}
          style={adminStyles.banner}
          contentFit="cover"
        />

        <View style={adminStyles.statsGrid}>
          <View style={[adminStyles.statCard, { backgroundColor: theme.primaryFaded }]}>
            <MaterialIcons name="people" size={28} color={theme.primary} />
            <Text style={[adminStyles.statValue, { color: theme.primary }]}>{customerCount}</Text>
            <Text style={adminStyles.statLabel}>عملاء</Text>
          </View>

          <View style={[adminStyles.statCard, { backgroundColor: 'rgba(13,148,136,0.1)' }]}>
            <MaterialIcons name="engineering" size={28} color={theme.secondary} />
            <Text style={[adminStyles.statValue, { color: theme.secondary }]}>{providerCount}</Text>
            <Text style={adminStyles.statLabel}>فنيين</Text>
          </View>

          <View style={[adminStyles.statCard, { backgroundColor: '#DBEAFE' }]}>
            <MaterialIcons name="receipt-long" size={28} color="#3B82F6" />
            <Text style={[adminStyles.statValue, { color: '#3B82F6' }]}>{totalOrders}</Text>
            <Text style={adminStyles.statLabel}>طلبات</Text>
          </View>

          <View style={[adminStyles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <MaterialIcons name="payments" size={28} color={theme.success} />
            <Text style={[adminStyles.statValue, { color: theme.success }]}>{totalRevenue.toLocaleString()}</Text>
            <Text style={adminStyles.statLabel}>ج.م إيرادات</Text>
          </View>
        </View>

        <View style={adminStyles.card}>
          <Text style={adminStyles.cardTitle}>ملخص الحالات</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {(['pending', 'accepted', 'in_progress', 'completed'] as const).map((k) => {
              const st = ORDER_STATUS_MAP[k] || { label: k, color: '#6B7280' };
              return (
                <View key={k} style={{ alignItems: 'center', flex: 1, gap: 4 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: st.color }} />
                  <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '700' }}>{st.label}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: theme.textPrimary }}>
                    {statusCounts[k] || 0}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {serviceStats.length > 0 ? (
          <View style={adminStyles.card}>
            <Text style={adminStyles.cardTitle}>أكثر الخدمات طلباً</Text>
            {serviceStats.map(([name, count], i) => {
              const max = serviceStats[0]?.[1] || 1;
              return (
                <View
                  key={name}
                  style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderLight }}
                >
                  <Text
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: theme.primaryFaded,
                      textAlign: 'center',
                      lineHeight: 24,
                      fontSize: 12,
                      fontWeight: '900',
                      color: theme.primary,
                      overflow: 'hidden',
                    }}
                  >
                    {i + 1}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: theme.textPrimary, textAlign: 'right' }}>
                    {name}
                  </Text>
                  <View style={{ width: 90, height: 7, borderRadius: 4, backgroundColor: theme.surfaceSecondary }}>
                    <View
                      style={{
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: theme.primary,
                        width: `${Math.max(10, (count / max) * 100)}%`,
                      }}
                    />
                  </View>
                  <Text style={{ width: 28, textAlign: 'center', fontWeight: '900', color: theme.primary }}>{count}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={adminStyles.card}>
          <Text style={adminStyles.cardTitle}>آخر الطلبات</Text>
          {allOrders.length === 0 ? (
            <Text style={adminStyles.emptyText}>لا توجد طلبات حتى الآن</Text>
          ) : (
            allOrders.slice(0, 10).map((o) => {
              const st = ORDER_STATUS_MAP[o.status] || { label: o.status, color: '#6B7280' };
              return (
                <View key={o.id} style={adminStyles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={adminStyles.rowTitle}>{o.orderNumber}</Text>
                    <Text style={adminStyles.rowSubtitle}>{o.serviceName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: theme.primary }}>{o.totalPrice} ج.م</Text>
                    <View style={[adminStyles.chip, { backgroundColor: st.color + '20' }]}>
                      <Text style={[adminStyles.chipText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
