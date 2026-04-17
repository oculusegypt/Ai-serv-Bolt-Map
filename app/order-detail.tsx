import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { ORDER_STATUS_MAP } from '../services/mockData';
import { SERVICES } from '../constants/config';
import { cancelOrder, getOrderById, rateOrder, updateOrderStatus } from '../services/ordersService';
import { sendOrderPush } from '../services/pushNotificationsService';
import { getProfileById } from '../services/profilesService';
import { useAuth } from '../contexts/AuthContext';
import { settleProviderEarningForOrder } from '../services/walletService';

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { role, orders, providerRequests, refreshOrders } = useApp();
  const { user } = useAuth();
  const { theme, shadows } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);
  const [userRating, setUserRating] = useState(0);
  const isProvider = role === 'provider';

  const [loadedOrder, setLoadedOrder] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [otherPhone, setOtherPhone] = useState<string | null>(null);
  const [otherName, setOtherName] = useState<string | null>(null);

  const goBackSafe = () => {
    router.replace('/(tabs)/orders' as any);
  };

  const order =
    (orders.find((o) => o.id === orderId) ||
      providerRequests.find((o) => o.id === orderId) ||
      loadedOrder) as any;

  const [orderState, setOrderState] = useState<any>(null);

  const changeStatus = async (nextStatus: any) => {
    const oldStatus = orderState?.status ?? null;
    await updateOrderStatus({ orderId: orderState.id, status: nextStatus });
    setOrderState((prev: any) => ({ ...prev, status: nextStatus }));

    if (nextStatus === 'paid' || nextStatus === 'completed') {
      try {
        await settleProviderEarningForOrder({
          orderId: orderState.id,
          providerId: orderState.providerId,
          totalPrice: orderState.totalPrice,
        });
      } catch {
        // ignore
      }
    }

    sendOrderPush({
      orderId: orderState.id,
      newStatus: nextStatus,
      oldStatus,
    }).catch(() => {});
    refreshOrders();
  };

  useEffect(() => {
    if (order) setOrderState(order);
  }, [order]);

  useEffect(() => {
    let cancelled = false;
    const loadOther = async () => {
      if (!orderState) return;
      const otherId = isProvider ? orderState.customerId : orderState.providerId;
      const res = await getProfileById(otherId);
      if (cancelled) return;
      if (res.ok && res.profile) {
        setOtherPhone(res.profile.phone || null);
        setOtherName(res.profile.name || null);
      }
    };
    loadOther().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isProvider, orderState]);

  const handleCall = async () => {
    Haptics.selectionAsync();
    const phone = otherPhone || '';
    if (!phone.trim()) {
      Alert.alert('تنبيه', 'رقم الهاتف غير متاح');
      return;
    }
    const url = `tel:${phone}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Alert.alert('تنبيه', 'لا يمكن فتح الاتصال على هذا الجهاز');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('تنبيه', 'فشل فتح الاتصال');
    }
  };

  const handleOpenOrderChat = () => {
    Haptics.selectionAsync();
    if (!orderState) return;
    const myId = user?.id;
    if (!myId) return;

    const otherId = isProvider ? orderState.customerId : orderState.providerId;
    router.push({
      pathname: '/(tabs)/order-chat' as any,
      params: {
        orderId: orderState.id,
        otherUserId: otherId,
        otherUserName: otherName || (isProvider ? orderState.customerName : orderState.providerName) || 'محادثة',
      },
    } as any);
  };

  const handleCancelOrder = () => {
    if (!orderState) return;

    const canCancel = ['pending', 'accepted', 'on_way', 'arrived', 'in_progress', 'completed', 'customer_paid', 'paid'].includes(orderState.status);
    if (!canCancel || orderState.status === 'cancelled') return;

    Alert.alert('إلغاء الطلب', 'اختار سبب الإلغاء', [
      {
        text: 'غيّرت رأيي',
        style: 'destructive',
        onPress: () => doCancel('غيّرت رأيي'),
      },
      {
        text: 'تأخر المزود',
        style: 'destructive',
        onPress: () => doCancel('تأخر المزود'),
      },
      {
        text: 'سبب آخر',
        style: 'destructive',
        onPress: () => doCancel('سبب آخر'),
      },
      { text: 'رجوع', style: 'cancel' },
    ]);
  };

  const doCancel = async (reason: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const cancelledBy = isProvider ? 'provider' : 'customer';
      // Customer-first: if cancellation happens in_progress we request refund review.
      const refundStatus = !isProvider && orderState?.status === 'in_progress' ? 'requested' : undefined;

      const res = await cancelOrder({
        orderId: orderState.id,
        cancelledBy: cancelledBy as any,
        reason,
        refundStatus: refundStatus as any,
      });

      if (!res.ok) {
        Alert.alert('خطأ', res.error || 'فشل إلغاء الطلب');
        return;
      }

      setOrderState((prev: any) => ({
        ...prev,
        status: 'cancelled',
        cancelledBy,
        cancelReason: reason,
        cancelledAt: new Date().toISOString(),
        refundStatus: refundStatus || prev?.refundStatus,
      }));

      refreshOrders().catch(() => {});
    } catch {
      Alert.alert('خطأ', 'فشل إلغاء الطلب');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!orderId) return;
      if (orders.find((o) => o.id === orderId) || providerRequests.find((o) => o.id === orderId)) return;
      setLoadingOrder(true);
      const res = await getOrderById(orderId);
      if (!cancelled) {
        if (res.ok && res.order) setLoadedOrder(res.order);
        setLoadingOrder(false);
      }
    };
    load().catch(() => {
      if (!cancelled) setLoadingOrder(false);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, orders, providerRequests]);

  if (!orderState) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {loadingOrder ? t('order_detail.loading') : t('order_detail.not_found')}
          </Text>
          <Pressable onPress={goBackSafe} style={styles.backButton}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const service = SERVICES.find((s) => s.id === orderState.serviceId);
  const status = ORDER_STATUS_MAP[orderState.status] || { label: orderState.status, color: '#6B7280' };

  const isActive = ['accepted', 'on_way', 'arrived', 'in_progress'].includes(orderState.status);

  const isCustomerPayable = !isProvider && orderState.status === 'completed';
  const isProviderConfirmable = isProvider && orderState.status === 'customer_paid';
  const isPaid = orderState.status === 'paid';

  const trackingSteps = [
    { key: 'accepted', label: 'تم قبول الطلب', icon: 'check-circle' },
    { key: 'on_way', label: 'في الطريق', icon: 'directions-car' },
    { key: 'arrived', label: 'تم الوصول', icon: 'location-on' },
    { key: 'in_progress', label: 'جاري العمل', icon: 'build' },
    { key: 'completed', label: 'تم بنجاح', icon: 'done-all' },
    { key: 'customer_paid', label: 'الدفع قيد المراجعة', icon: 'payments' },
    { key: 'paid', label: 'تم الدفع', icon: 'payments' },
    ...(isProvider ? [{ key: 'rated', label: 'تم التقييم', icon: 'star' }] : []),
  ];

  const derivedStatus: string =
    isProvider
      ? orderState.status === 'paid'
        ? orderState.rating
          ? 'rated'
          : 'paid'
        : orderState.status
      : orderState.status;

  const currentStepIndex = trackingSteps.findIndex((s) => s.key === derivedStatus);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBackSafe} style={styles.headerBackBtn}>
          <MaterialIcons name="arrow-forward" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('order_detail.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Number + Status */}
        <View style={styles.orderStatusCard}>
          <Text style={styles.orderNumber}>{orderState.orderNumber}</Text>
          <View style={[styles.statusBadgeLarge, { backgroundColor: status.color + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusTextLarge, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Tracking Map Image */}
        {isActive && (
          <View style={styles.mapContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&h=400&fit=crop' }}
              style={styles.mapImage}
              contentFit="cover"
            />
            <View style={styles.mapOverlay}>
              <View style={styles.mapETACard}>
                <MaterialIcons name="access-time" size={18} color={theme.primary} />
                <Text style={styles.mapETAText}>
                  {orderState.status === 'on_way'
                    ? 'في الطريق للعميل'
                    : orderState.status === 'arrived'
                      ? 'تم الوصول للعميل'
                      : orderState.status === 'in_progress'
                        ? 'جاري تنفيذ العمل'
                        : 'تم قبول الطلب'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Tracking Steps */}
        <View style={styles.trackingCard}>
          <Text style={styles.trackingTitle}>حالة الطلب</Text>
          {trackingSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <View key={step.key} style={styles.trackingStep}>
                <View style={styles.trackingStepIndicator}>
                  <View
                    style={[
                      styles.stepCircle,
                      isCompleted && { backgroundColor: theme.success },
                      isCurrent && { backgroundColor: theme.primary, transform: [{ scale: 1.1 }] },
                    ]}
                  >
                    <MaterialIcons
                      name={step.icon as any}
                      size={16}
                      color={isCompleted || isCurrent ? '#FFF' : theme.textTertiary}
                    />
                  </View>
                  {index < trackingSteps.length - 1 && (
                    <View
                      style={[
                        styles.stepLine,
                        isCompleted && { backgroundColor: theme.success },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.trackingStepContent}>
                  <Text
                    style={[
                      styles.stepLabel,
                      (isCompleted || isCurrent) && { color: theme.textPrimary, fontWeight: '700' },
                    ]}
                  >
                    {step.label}
                  </Text>
                  {isCurrent && (
                    <Text style={styles.stepTime}>الآن</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Service Details */}
        <View style={styles.detailCard}>
          <Text style={styles.detailCardTitle}>تفاصيل الخدمة</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>الخدمة</Text>
            <Text style={styles.detailValue}>{orderState.serviceName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>العنوان</Text>
            <Text style={styles.detailValue}>{orderState.address}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>الموعد</Text>
            <Text style={styles.detailValue}>{orderState.scheduledDate} - {orderState.scheduledTime}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>الإجمالي</Text>
            <Text style={styles.priceValue}>{orderState.totalPrice} ج.م</Text>
          </View>
        </View>

        {/* Provider/Customer Card */}
        {isProvider ? (
          <View style={styles.providerCard}>
            <Text style={styles.detailCardTitle}>بيانات العميل</Text>
            <View style={styles.providerInfo}>
              <View style={[styles.providerAvatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceSecondary }]}
              >
                <MaterialIcons name="person" size={26} color={theme.textSecondary} />
              </View>
              <View style={styles.providerDetails}>
                <Text style={styles.providerName}>{orderState.customerName || 'عميل'}</Text>
              </View>
              <Pressable
                style={styles.callBtn}
                onPress={handleCall}
              >
                <MaterialIcons name="phone" size={20} color={theme.success} />
              </Pressable>
              <Pressable
                style={styles.chatBtn}
                onPress={handleOpenOrderChat}
              >
                <MaterialIcons name="chat" size={20} color={theme.primary} />
              </Pressable>
            </View>
          </View>
        ) : orderState.providerName ? (
          <View style={styles.providerCard}>
            <Text style={styles.detailCardTitle}>الفني المسؤول</Text>
            <View style={styles.providerInfo}>
              <View style={[styles.providerAvatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceSecondary }]}
              >
                <MaterialIcons name="person" size={26} color={theme.textSecondary} />
              </View>
              <View style={styles.providerDetails}>
                <Text style={styles.providerName}>{orderState.providerName}</Text>
              </View>
              <Pressable
                style={styles.callBtn}
                onPress={handleCall}
              >
                <MaterialIcons name="phone" size={20} color={theme.success} />
              </Pressable>
              <Pressable
                style={styles.chatBtn}
                onPress={handleOpenOrderChat}
              >
                <MaterialIcons name="chat" size={20} color={theme.primary} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Rating */}
        {!isProvider && orderState.status === 'paid' && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>قيّم الخدمة</Text>
            <Text style={styles.ratingSubtitle}>رأيك يساعدنا نحسن الخدمة</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  disabled={!!orderState.rating}
                  onPress={() => {
                    if (orderState.rating) return;
                    Haptics.selectionAsync();
                    setUserRating(star);
                    rateOrder({ orderId: orderState.id, rating: star })
                      .then((res) => {
                        if (!res.ok) {
                          Alert.alert('خطأ', res.error || 'فشل حفظ التقييم');
                          return;
                        }
                        setOrderState((prev: any) => ({ ...prev, rating: star }));
                        refreshOrders().catch(() => {});
                      })
                      .catch(() => {
                        Alert.alert('خطأ', 'فشل حفظ التقييم');
                      });
                  }}
                >
                  <MaterialIcons
                    name={star <= (userRating || orderState.rating || 0) ? 'star' : 'star-border'}
                    size={40}
                    color="#F59E0B"
                  />
                </Pressable>
              ))}
            </View>
            {(userRating > 0 || orderState.rating) && (
              <Text style={styles.ratingMessage}>
                {(userRating || orderState.rating || 0) >= 4
                  ? 'شكراً يا باشا! رأيك مهم لينا 🙏'
                  : 'شكراً على رأيك، هنحاول نحسن الخدمة'}
              </Text>
            )}
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.paymentCard}>
          <Text style={styles.detailCardTitle}>طريقة الدفع</Text>
          <View style={styles.paymentOption}>
            <View style={[styles.paymentRadio, { borderColor: theme.primary, borderWidth: 2 }]}>
              <View style={styles.paymentRadioInner} />
            </View>
            <MaterialIcons name="payments" size={24} color={theme.success} />
            <Text style={styles.paymentLabel}>كاش عند الفني</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      {(isActive || isCustomerPayable || isProviderConfirmable || isPaid) && (
        <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {isProvider ? (
            <>
              {orderState.status === 'accepted' ? (
                <Pressable
                  style={styles.contactProviderBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    changeStatus('on_way').catch(() => {});
                  }}
                >
                  <MaterialIcons name="directions-car" size={20} color="#FFF" />
                  <Text style={styles.contactProviderText}>في الطريق</Text>
                </Pressable>
              ) : null}

              {orderState.status === 'on_way' ? (
                <Pressable
                  style={styles.contactProviderBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    changeStatus('arrived').catch(() => {});
                  }}
                >
                  <MaterialIcons name="location-on" size={20} color="#FFF" />
                  <Text style={styles.contactProviderText}>وصلت للعميل</Text>
                </Pressable>
              ) : null}

              {orderState.status === 'arrived' ? (
                <Pressable
                  style={styles.contactProviderBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    changeStatus('in_progress').catch(() => {});
                  }}
                >
                  <MaterialIcons name="build" size={20} color="#FFF" />
                  <Text style={styles.contactProviderText}>بدء العمل</Text>
                </Pressable>
              ) : null}

              {orderState.status === 'in_progress' ? (
                <Pressable
                  style={styles.contactProviderBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    changeStatus('completed').catch(() => {});
                  }}
                >
                  <MaterialIcons name="done-all" size={20} color="#FFF" />
                  <Text style={styles.contactProviderText}>إنهاء العمل</Text>
                </Pressable>
              ) : null}

              {orderState.status === 'completed' ? (
                <View />
              ) : null}

              {orderState.status === 'customer_paid' ? (
                <Pressable
                  style={styles.contactProviderBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    changeStatus('paid').catch(() => {});
                  }}
                >
                  <MaterialIcons name="payments" size={20} color="#FFF" />
                  <Text style={styles.contactProviderText}>تأكيد الدفع</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              {orderState.status === 'completed' ? (
                <Pressable
                  style={styles.contactProviderBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    changeStatus('customer_paid').catch(() => {});
                  }}
                >
                  <MaterialIcons name="payments" size={20} color="#FFF" />
                  <Text style={styles.contactProviderText}>تم الدفع</Text>
                </Pressable>
              ) : null}

              {orderState?.id ? (
                <Pressable
                  style={styles.cancelOrderBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push({ pathname: '/(tabs)/refund' as any, params: { orderId: orderState.id } } as any);
                  }}
                >
                  <Text style={styles.cancelOrderText}>طلب استرداد</Text>
                </Pressable>
              ) : null}

              <Pressable
                style={styles.cancelOrderBtn}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  handleCancelOrder();
                }}
              >
                <Text style={styles.cancelOrderText}>إلغاء الطلب</Text>
              </Pressable>
              <Pressable
                style={styles.contactProviderBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  handleOpenOrderChat();
                }}
              >
                <MaterialIcons name="chat" size={20} color="#FFF" />
                <Text style={styles.contactProviderText}>تواصل مع الفني</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  orderStatusCard: {
    backgroundColor: theme.surface,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...shadows.card,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 10,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '700',
  },
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 12,
  },
  mapETACard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-end',
    ...shadows.cardElevated,
  },
  mapETAText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  trackingCard: {
    backgroundColor: theme.surface,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    ...shadows.card,
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 16,
    textAlign: 'right',
  },
  trackingStep: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  trackingStepIndicator: {
    alignItems: 'center',
    width: 32,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: theme.border,
  },
  trackingStepContent: {
    flex: 1,
    paddingBottom: 20,
    alignItems: 'flex-end',
  },
  stepLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'right',
  },
  stepTime: {
    fontSize: 11,
    color: theme.primary,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
  },
  detailCard: {
    backgroundColor: theme.surface,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    ...shadows.card,
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 16,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.primary,
  },
  providerCard: {
    backgroundColor: theme.surface,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    ...shadows.card,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
    textAlign: 'right',
  },
  providerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    justifyContent: 'flex-end',
  },
  providerRating: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  providerReviews: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  providerJobs: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingCard: {
    backgroundColor: theme.surface,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...shadows.card,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  ratingSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  ratingMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.success,
    marginTop: 12,
    textAlign: 'center',
  },
  paymentCard: {
    backgroundColor: theme.surface,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    ...shadows.card,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.primary,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    ...shadows.modal,
  },
  cancelOrderBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.errorLight,
    alignItems: 'center',
  },
  cancelOrderText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.error,
  },
  contactProviderBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contactProviderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
