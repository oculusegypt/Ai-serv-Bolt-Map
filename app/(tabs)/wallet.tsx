import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getWalletAccount, listWalletTransactions, WalletTransaction } from '../../services/walletService';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, shadows } = useTheme();
  const { user } = useAuth();

  const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const getTxTypeLabel = (type: string) => {
    switch (type) {
      case 'order_earning':
        return 'أرباح طلب';
      case 'admin_deposit':
        return 'إضافة من الأدمن';
      case 'withdraw_paid':
        return 'سحب مصروف';
      case 'refund_to_customer':
        return 'استرداد للعميل';
      case 'refund_from_provider':
        return 'خصم استرداد من المزوّد';
      default:
        return type;
    }
  };

  const load = async () => {
    if (!user?.id) return;
    setError(null);
    setLoading(true);
    try {
      const [accRes, txRes] = await Promise.all([
        getWalletAccount(user.id),
        listWalletTransactions(user.id, 100),
      ]);
      const nextTxs = txRes.ok ? txRes.transactions : [];
      if (txRes.ok) setTxs(nextTxs);

      const allowedTypes =
        user.role === 'provider'
          ? (['order_earning', 'admin_deposit', 'withdraw_paid', 'refund_from_provider'] as const)
          : (['refund_to_customer', 'admin_deposit'] as const);

      const derivedBalance = nextTxs
        .filter((t) => allowedTypes.includes(t.type as any))
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      if (txRes.ok) setBalance(derivedBalance);
      else if (accRes.ok) setBalance(accRes.account?.balance || 0);
      if (!accRes.ok) setError(accRes.error || 'فشل تحميل الرصيد');
      if (!txRes.ok) setError(txRes.error || 'فشل تحميل المعاملات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
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

  const goBackSafe = () => {
    router.replace('/(tabs)/profile');
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

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.selectionAsync(); goBackSafe(); }} style={styles.headerBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>المحفظة</Text>
        <Pressable onPress={() => { Haptics.selectionAsync(); load().catch(() => {}); }} style={styles.headerBtn}>
          <MaterialIcons name="refresh" size={20} color={theme.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
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
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <MaterialIcons name="account-balance-wallet" size={26} color={theme.primary} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.balanceLabel}>الرصيد الحالي</Text>
              <Text style={styles.balanceValue}>{Math.round(balance).toLocaleString('ar-EG')} ج.م</Text>
            </View>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>سجل المعاملات</Text>
          {loading ? <ActivityIndicator color={theme.primary} /> : null}
        </View>

        {txs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>لا توجد معاملات بعد</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {txs.map((t) => (
              <View key={t.id} style={styles.txCard}>
                <View style={styles.txTopRow}>
                  <Text style={[styles.txAmount, { color: t.amount >= 0 ? theme.success : theme.error }]}>
                    {t.amount >= 0 ? '+' : ''}{Math.round(t.amount).toLocaleString('ar-EG')} ج.م
                  </Text>
                  <Text style={styles.txType}>{getTxTypeLabel(t.type)}</Text>
                </View>
                {t.note ? <Text style={styles.txNote}>{t.note}</Text> : null}
                <Text style={styles.txTime}>{new Date(t.createdAt).toLocaleString('ar-EG')}</Text>
              </View>
            ))}
          </View>
        )}
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
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '900', color: theme.textPrimary },
    balanceCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      ...shadows.card,
    },
    balanceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    balanceLabel: { fontSize: 12, fontWeight: '900', color: theme.textSecondary, textAlign: 'right' },
    balanceValue: { marginTop: 4, fontSize: 20, fontWeight: '900', color: theme.textPrimary, textAlign: 'right' },
    errorText: { marginTop: 8, color: theme.error, fontWeight: '800', textAlign: 'right' },
    sectionHeader: { marginTop: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 14, fontWeight: '900', color: theme.textPrimary, textAlign: 'right' },
    emptyCard: { marginTop: 10, backgroundColor: theme.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
    emptyText: { color: theme.textSecondary, fontWeight: '800', textAlign: 'center' },
    txCard: { backgroundColor: theme.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.border },
    txTopRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    txAmount: { fontSize: 14, fontWeight: '900' },
    txType: { fontSize: 12, fontWeight: '900', color: theme.textSecondary },
    txNote: { marginTop: 6, fontSize: 12, fontWeight: '700', color: theme.textSecondary, textAlign: 'right' },
    txTime: { marginTop: 6, fontSize: 11, fontWeight: '700', color: theme.textTertiary, textAlign: 'right' },
  });
