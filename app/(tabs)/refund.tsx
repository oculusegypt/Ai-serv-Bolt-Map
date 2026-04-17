import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getOrderById } from '../../services/ordersService';
import { createRefundRequest, getRefundRequestByOrder, RefundRequest } from '../../services/refundService';

export default function RefundScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { theme, shadows } = useTheme();
  const { user } = useAuth();

  const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState<RefundRequest | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    if (!orderId) return;
    setLoading(true);
    try {
      const [oRes, rRes] = await Promise.all([
        getOrderById(String(orderId)),
        getRefundRequestByOrder(String(orderId)),
      ]);
      if (oRes.ok) setOrder(oRes.order);
      if (rRes.ok) setRefund(rRes.refund || null);

      const total = Number((oRes as any)?.order?.totalPrice || 0);
      if (Number.isFinite(total) && total > 0 && !amount) setAmount(String(total));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, [user?.id, orderId]);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const refundStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'قيد المراجعة';
      case 'approved':
        return 'تمت الموافقة';
      case 'rejected':
        return 'مرفوض';
      case 'processed':
        return 'تمت المعالجة';
      default:
        return status || '';
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

  if (user.role !== 'customer') {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>الاسترداد متاح للعميل فقط</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onSubmit = async () => {
    Haptics.selectionAsync();
    if (!orderId) {
      Alert.alert('خطأ', 'orderId غير موجود');
      return;
    }
    if (!order) {
      Alert.alert('خطأ', 'الطلب غير متاح');
      return;
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert('تنبيه', 'اكتب مبلغ صحيح');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createRefundRequest({
        orderId: String(orderId),
        customerId: user.id,
        providerId: order.providerId,
        requestedAmount: amt,
        reason: reason.trim() || undefined,
      });
      if (!res.ok) {
        Alert.alert('خطأ', res.error || 'فشل إرسال طلب الاسترداد');
        return;
      }
      Alert.alert('تم', 'تم إرسال طلب الاسترداد');
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            goBackSafe();
          }}
          style={styles.headerBtn}
        >
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>طلب استرداد</Text>
        <View style={{ width: 40 }} />
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
        {refund ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>حالة الطلب</Text>
            <Text style={styles.statusText}>{refundStatusLabel(refund.status)}</Text>
            <Text style={styles.smallText}>المبلغ المطلوب: {Math.round(refund.requestedAmount).toLocaleString('ar-EG')} ج.م</Text>
            {typeof refund.approvedAmount === 'number' ? (
              <Text style={styles.smallText}>المبلغ الموافق عليه: {Math.round(refund.approvedAmount).toLocaleString('ar-EG')} ج.م</Text>
            ) : null}
            {refund.adminNote ? <Text style={styles.adminNote}>{refund.adminNote}</Text> : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>بيانات الاسترداد</Text>

          {!orderId ? <Text style={styles.warnText}>لازم تفتح الصفحة ومعاها orderId</Text> : null}

          <Text style={styles.label}>المبلغ</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
            keyboardType="numeric"
            placeholder="مثال: 300"
            placeholderTextColor={theme.textTertiary}
            textAlign="right"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>سبب الاسترداد</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="اكتب السبب"
            placeholderTextColor={theme.textTertiary}
            textAlign="right"
            multiline
          />

          <Pressable style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={onSubmit} disabled={submitting || loading || !!refund}>
            {submitting ? <ActivityIndicator color="#FFF" /> : <MaterialIcons name="receipt" size={18} color="#FFF" />}
            <Text style={styles.submitText}>{refund ? 'تم إرسال الطلب بالفعل' : 'إرسال طلب استرداد'}</Text>
          </Pressable>

          {loading ? <ActivityIndicator style={{ marginTop: 10 }} color={theme.primary} /> : null}
        </View>
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
    card: { backgroundColor: theme.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.border, ...shadows.card, marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '900', color: theme.textPrimary, textAlign: 'right' },
    statusText: { marginTop: 8, fontSize: 14, fontWeight: '900', color: theme.primary, textAlign: 'right' },
    smallText: { marginTop: 6, fontSize: 12, fontWeight: '800', color: theme.textSecondary, textAlign: 'right' },
    adminNote: { marginTop: 8, fontSize: 12, fontWeight: '900', color: theme.primary, textAlign: 'right' },
    warnText: { marginTop: 8, fontSize: 12, fontWeight: '900', color: theme.error, textAlign: 'right' },
    label: { marginTop: 10, fontSize: 12, fontWeight: '900', color: theme.textSecondary, textAlign: 'right' },
    input: { marginTop: 8, height: 46, borderRadius: 14, backgroundColor: theme.surfaceSecondary, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border, color: theme.textPrimary, fontWeight: '800' },
    submitBtn: { marginTop: 12, height: 48, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 10 },
    submitText: { color: '#FFF', fontWeight: '900' },
  });
