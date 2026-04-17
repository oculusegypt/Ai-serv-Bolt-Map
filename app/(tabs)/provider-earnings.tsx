import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabaseClient';
import { getPlatformCommissionPercent, listWalletTransactions } from '../../services/walletService';

type Summary = {
  commissionPercent: number;
  paidOrdersCount: number;
  grossPaidTotal: number;
  commissionValue: number;
  netExpectedFromOrders: number;
  walletBalance: number;
  netCreditedFromOrders: number;
  adminDepositsTotal: number;
};

export default function ProviderEarningsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, shadows } = useTheme();
  const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = async () => {
    if (!user?.id) return;
    if (user.role !== 'provider') return;

    setError(null);
    setLoading(true);

    try {
      const providerId = user.id;

      const [commissionPercent, txRes, ordersRes] = await Promise.all([
        getPlatformCommissionPercent(),
        listWalletTransactions(providerId, 300),
        supabase
          .from('orders')
          .select('id,total_price,status')
          .eq('provider_id', providerId)
          .in('status', ['paid', 'completed']),
      ]);

      const txs = txRes.ok ? txRes.transactions : [];

      const adminDepositsTotal = txs
        .filter((t) => t.type === 'admin_deposit')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      const netCreditedFromOrders = txs
        .filter((t) => t.type === 'order_earning')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      const withdrawPaidTotal = txs
        .filter((t) => t.type === 'withdraw_paid')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      const refundFromProviderTotal = txs
        .filter((t) => t.type === 'refund_from_provider')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      const orders = ((ordersRes as any)?.data as any[]) || [];
      const paidOrdersCount = orders.length;
      const grossPaidTotal = orders.reduce((acc, o) => acc + Number(o.total_price || 0), 0);
      const commissionValue = (grossPaidTotal * commissionPercent) / 100;
      const netExpectedFromOrders = Math.max(0, grossPaidTotal - commissionValue);

      const walletBalance = netCreditedFromOrders + adminDepositsTotal + withdrawPaidTotal + refundFromProviderTotal;

      setSummary({
        commissionPercent,
        paidOrdersCount,
        grossPaidTotal,
        commissionValue,
        netExpectedFromOrders,
        walletBalance,
        netCreditedFromOrders,
        adminDepositsTotal,
      });
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل الأرباح');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>لازم تسجل دخول الأول</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (user.role !== 'provider') {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>هذه الصفحة متاحة للمزوّد فقط</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.replace('/(tabs)/profile');
          }}
          style={styles.headerBtn}
        >
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>الأرباح</Text>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            load().catch(() => {});
          }}
          style={styles.headerBtn}
        >
          <MaterialIcons name="refresh" size={20} color={theme.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              onRefresh().catch(() => {});
            }}
            colors={[theme.secondary]}
            tintColor={theme.secondary}
          />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ملخص</Text>

          <View style={styles.row}>
            <Text style={styles.value}>{loading ? '...' : `${Math.round(summary?.walletBalance || 0).toLocaleString('ar-EG')} ج.م`}</Text>
            <Text style={styles.label}>رصيد المحفظة الحالي</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.value}>{loading ? '...' : `${Math.round(summary?.grossPaidTotal || 0).toLocaleString('ar-EG')} ج.م`}</Text>
            <Text style={styles.label}>إجمالي الطلبات المكتملة (Paid/Completed)</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.value}>{loading ? '...' : `${summary?.paidOrdersCount || 0}`}</Text>
            <Text style={styles.label}>عدد الطلبات المكتملة (Paid/Completed)</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.value}>{loading ? '...' : `${summary?.commissionPercent ?? 15}%`}</Text>
            <Text style={styles.label}>نسبة الموقع</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.value, { color: theme.error }]}>{loading ? '...' : `${Math.round(summary?.commissionValue || 0).toLocaleString('ar-EG')} ج.م`}</Text>
            <Text style={styles.label}>قيمة خصم الموقع (تقديري)</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.value, { color: theme.secondary }]}>{loading ? '...' : `${Math.round(summary?.netExpectedFromOrders || 0).toLocaleString('ar-EG')} ج.م`}</Text>
            <Text style={styles.label}>صافي أرباح الطلبات (تقديري)</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.value, { color: theme.secondary }]}>{loading ? '...' : `${Math.round(summary?.netCreditedFromOrders || 0).toLocaleString('ar-EG')} ج.م`}</Text>
            <Text style={styles.label}>صافي أرباح الطلبات (المسجّل بالمحفظة)</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.value, { color: theme.secondary }]}>{loading ? '...' : `${Math.round(summary?.walletBalance || 0).toLocaleString('ar-EG')} ج.م`}</Text>
            <Text style={styles.label}>صافي رصيد المحفظة (أرباح الطلبات + إضافات الأدمن)</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.value, { color: theme.success }]}>{loading ? '...' : `${Math.round(summary?.adminDepositsTotal || 0).toLocaleString('ar-EG')} ج.م`}</Text>
            <Text style={styles.label}>إضافات الأدمن (Admin deposits)</Text>
          </View>

          <Text style={styles.hint}>
            الرصيد = (صافي أرباح الطلبات) + (إضافات الأدمن) - (السحوبات المصروفة) - (الاستردادات إن وُجدت)
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed ? { opacity: 0.9 } : null]}
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/(tabs)/wallet');
          }}
        >
          <MaterialIcons name="account-balance-wallet" size={20} color={theme.textOnPrimary} />
          <Text style={styles.primaryBtnText}>فتح المحفظة</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.backgroundSecondary },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
    title: { fontSize: 16, fontWeight: '900', color: theme.textPrimary },

    header: {
      height: 56,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: { fontSize: 16, fontWeight: '900', color: theme.textPrimary },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
      ...shadows.card,
    },

    card: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      ...shadows.card,
    },
    cardTitle: { fontSize: 14, fontWeight: '900', color: theme.textPrimary, textAlign: 'right', marginBottom: 10 },

    row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    label: { fontSize: 12, fontWeight: '800', color: theme.textSecondary, textAlign: 'right' },
    value: { fontSize: 14, fontWeight: '900', color: theme.textPrimary },

    hint: { marginTop: 10, fontSize: 12, color: theme.textTertiary, textAlign: 'right', lineHeight: 18 },

    primaryBtn: {
      marginTop: 12,
      backgroundColor: theme.secondary,
      borderRadius: 16,
      paddingVertical: 14,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...shadows.card,
    },
    primaryBtnText: { color: theme.textOnPrimary, fontSize: 14, fontWeight: '900' },

    errorBox: { marginBottom: 10, padding: 12, borderRadius: 14, backgroundColor: theme.error + '14', borderWidth: 1, borderColor: theme.error + '40' },
    errorText: { color: theme.error, fontWeight: '800', textAlign: 'right' },
  });
