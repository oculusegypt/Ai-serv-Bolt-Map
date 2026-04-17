import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { createWithdrawRequest, listWithdrawRequestsForProvider, WithdrawRequest } from '../../services/withdrawService';
import { listWalletTransactions } from '../../services/walletService';

export default function WithdrawScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, shadows } = useTheme();
  const { user } = useAuth();

  const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [reqRes, txRes] = await Promise.all([
        listWithdrawRequestsForProvider(user.id),
        listWalletTransactions(user.id, 300),
      ]);
      if (reqRes.ok) setRequests(reqRes.requests);

      const nextTxs = txRes.ok ? txRes.transactions : [];
      const derivedBalance = nextTxs
        .filter(
          (t) =>
            t.type === 'order_earning' ||
            t.type === 'admin_deposit' ||
            t.type === 'withdraw_paid' ||
            t.type === 'refund_from_provider'
        )
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);
      if (txRes.ok) setBalance(derivedBalance);
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

  if (user.role !== 'provider') {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>السحب متاح للمزوّد فقط</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onSubmit = async () => {
    Haptics.selectionAsync();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert('تنبيه', 'اكتب مبلغ صحيح');
      return;
    }
    if (amt > balance) {
      Alert.alert('تنبيه', 'المبلغ أكبر من الرصيد');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createWithdrawRequest({ providerId: user.id, amount: amt, providerNote: note.trim() || undefined });
      if (!res.ok) {
        Alert.alert('خطأ', res.error || 'فشل إرسال طلب السحب');
        return;
      }
      setAmount('');
      setNote('');
      Alert.alert('تم', 'تم إرسال طلب السحب');
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.selectionAsync(); goBackSafe(); }} style={styles.headerBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>سحب الأموال</Text>
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
        <View style={styles.card}>
          <View style={styles.balanceRow}>
            <MaterialIcons name="account-balance-wallet" size={22} color={theme.primary} />
            <Text style={styles.balanceText}>الرصيد المتاح: {Math.round(balance).toLocaleString('ar-EG')} ج.م</Text>
          </View>

          <Text style={styles.label}>المبلغ</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
            keyboardType="numeric"
            placeholder="مثال: 500"
            placeholderTextColor={theme.textTertiary}
            textAlign="right"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>ملاحظة (اختياري)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            style={styles.input}
            placeholder="مثال: تحويل فودافون كاش"
            placeholderTextColor={theme.textTertiary}
            textAlign="right"
          />

          <Pressable style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={onSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFF" /> : <MaterialIcons name="send" size={18} color="#FFF" />}
            <Text style={styles.submitText}>إرسال طلب سحب</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>طلبات السحب السابقة</Text>
          {loading ? <ActivityIndicator color={theme.primary} /> : null}
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>لا توجد طلبات سحب بعد</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {requests.map((r) => (
              <View key={r.id} style={styles.reqCard}>
                <View style={styles.reqTopRow}>
                  <Text style={styles.reqStatus}>{r.status}</Text>
                  <Text style={styles.reqAmount}>{Math.round(r.amount).toLocaleString('ar-EG')} ج.م</Text>
                </View>
                <Text style={styles.reqTime}>{new Date(r.createdAt).toLocaleString('ar-EG')}</Text>
                {r.providerNote ? <Text style={styles.reqNote}>{r.providerNote}</Text> : null}
                {r.adminNote ? <Text style={styles.reqAdminNote}>{r.adminNote}</Text> : null}
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
    card: { backgroundColor: theme.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.border, ...shadows.card },
    balanceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    balanceText: { flex: 1, textAlign: 'right', fontWeight: '900', color: theme.textPrimary },
    label: { marginTop: 10, fontSize: 12, fontWeight: '900', color: theme.textSecondary, textAlign: 'right' },
    input: { marginTop: 8, height: 46, borderRadius: 14, backgroundColor: theme.surfaceSecondary, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border, color: theme.textPrimary, fontWeight: '800' },
    submitBtn: { marginTop: 12, height: 48, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 10 },
    submitText: { color: '#FFF', fontWeight: '900' },
    sectionHeader: { marginTop: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 14, fontWeight: '900', color: theme.textPrimary, textAlign: 'right' },
    emptyCard: { marginTop: 10, backgroundColor: theme.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
    emptyText: { color: theme.textSecondary, fontWeight: '800', textAlign: 'center' },
    reqCard: { backgroundColor: theme.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.border },
    reqTopRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    reqAmount: { fontSize: 13, fontWeight: '900', color: theme.textPrimary },
    reqStatus: { fontSize: 12, fontWeight: '900', color: theme.textSecondary },
    reqTime: { marginTop: 6, fontSize: 11, fontWeight: '700', color: theme.textTertiary, textAlign: 'right' },
    reqNote: { marginTop: 6, fontSize: 12, fontWeight: '800', color: theme.textSecondary, textAlign: 'right' },
    reqAdminNote: { marginTop: 6, fontSize: 12, fontWeight: '900', color: theme.primary, textAlign: 'right' },
  });
