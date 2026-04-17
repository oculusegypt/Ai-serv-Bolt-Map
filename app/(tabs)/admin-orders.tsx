import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { ORDER_STATUS_MAP } from '../../services/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { adminColors, createAdminStyles } from '../../components/admin/adminStyles';

export default function AdminOrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders, providerRequests, refreshOrders } = useApp();
  const [q, setQ] = useState('');
  const { theme, shadows } = useTheme();
  const adminStyles = useMemo(() => createAdminStyles(theme, shadows), [theme, shadows]);

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

  const allOrders = useMemo(() => {
    const list = [...orders, ...providerRequests];
    const unique = list.filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i);
    const s = q.trim();
    if (!s) return unique;
    return unique.filter((o) => o.orderNumber.includes(s) || o.serviceName.includes(s) || (o.address || '').includes(s));
  }, [orders, providerRequests, q]);

  return (
    <SafeAreaView edges={['top']} style={adminStyles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
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
        <View style={adminStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={adminStyles.headerTitle}>الطلبات</Text>
            <Text style={adminStyles.headerSubtitle}>{allOrders.length} طلب</Text>
          </View>
          <View style={adminStyles.headerBadge}>
            <MaterialIcons name="assignment" size={20} color={adminColors.admin} />
            <Text style={adminStyles.headerBadgeText}>إدارة</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
          <View
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              backgroundColor: theme.surfaceSecondary,
              borderRadius: 16,
              paddingHorizontal: 14,
              height: 50,
              gap: 10,
            }}
          >
            <MaterialIcons name="search" size={22} color={theme.textTertiary} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: theme.textPrimary, textAlign: 'right' }}
              placeholder="ابحث برقم الطلب أو الخدمة أو العنوان"
              placeholderTextColor={theme.textTertiary}
              value={q}
              onChangeText={setQ}
              textAlign="right"
            />
          </View>
        </View>

        <View style={adminStyles.card}>
          <Text style={adminStyles.cardTitle}>القائمة</Text>

          {allOrders.length === 0 ? (
            <Text style={adminStyles.emptyText}>لا توجد طلبات</Text>
          ) : (
            allOrders.map((o) => {
              const st = ORDER_STATUS_MAP[o.status] || { label: o.status, color: '#6B7280' };
              return (
                <Pressable
                  key={o.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push({ pathname: '/(tabs)/order-detail' as any, params: { orderId: o.id } } as any);
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.borderLight,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[adminStyles.rowTitle, { marginBottom: 2 }]}>{o.orderNumber}</Text>
                    <Text style={adminStyles.rowSubtitle}>{o.serviceName}</Text>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <MaterialIcons name="location-on" size={16} color={theme.textSecondary} />
                      <Text style={[adminStyles.rowSubtitle, { flex: 1 }]} numberOfLines={1}>
                        {o.address}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: theme.primary }}>{o.totalPrice} ج.م</Text>
                    <View style={[adminStyles.chip, { backgroundColor: st.color + '20' }]}>
                      <Text style={[adminStyles.chipText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
