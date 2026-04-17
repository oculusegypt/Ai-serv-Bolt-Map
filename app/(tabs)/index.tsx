import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme, shadows } from '../../constants/theme';
import { APP_CONFIG, PRICING, SERVICES, ServiceId } from '../../constants/config';
import { useApp } from '../../contexts/AppContext';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { ORDER_STATUS_MAP } from '../../services/mockData';
import AdminDashboard from '../../components/admin/AdminDashboard';
import { supabase } from '../../services/supabaseClient';

export default function HomeScreen() {
  const { user } = useAuth();
  const role = user?.role || 'customer';

  if (role === 'admin') return <AdminDashboard />;
  if (role === 'provider') return <ProviderDashboard />;
  return <CustomerHome />;
}

// ===================== CUSTOMER HOME =====================
function CustomerHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { startChat, searchQuery, setSearchQuery, setUserAddress, refreshOrders } = useApp();
  const { location, requestLocation, isLoading: locationLoading } = useLocation();
  const { user } = useAuth();

  const [popularServiceIds, setPopularServiceIds] = useState<ServiceId[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (location) setUserAddress(location.address);
  }, [location]);

  const filteredServices = searchQuery
    ? SERVICES.filter((s) => s.name.includes(searchQuery) || s.description.includes(searchQuery))
    : SERVICES;

  const handleServicePress = (serviceId: ServiceId) => {
    Haptics.selectionAsync();
    router.push({ pathname: '/map', params: { serviceId } });
  };

  const handleQuickChat = (serviceId: ServiceId) => {
    Haptics.selectionAsync();
    startChat(serviceId);
    router.push('/(tabs)/chat');
  };

  const loadPopular = async (opts?: { signal?: { cancelled: boolean } }) => {
    const { data, error } = await supabase
      .from('service_popularity')
      .select('service_id,orders_count,updated_at')
      .order('orders_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(10);

    if (opts?.signal?.cancelled) return;
    if (error) {
      setPopularServiceIds([]);
      return;
    }

    const rows = (data as any[]) || [];
    const sorted = rows
      .map((r) => String(r?.service_id || '') as ServiceId)
      .filter((sid) => SERVICES.some((s) => s.id === sid))
      .slice(0, 6);

    setPopularServiceIds(sorted);
  };

  useEffect(() => {
    const signal = { cancelled: false };
    loadPopular({ signal }).catch(() => {
      if (!signal.cancelled) setPopularServiceIds([]);
    });
    return () => {
      signal.cancelled = true;
    };
  }, []);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      // Keep consistent with your rule: guest stays on landing and we avoid user-scoped calls.
      if (user?.id) {
        await refreshOrders();
      }
      await loadPopular();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
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
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>أهلاً {user?.name || 'مستخدم'}! 👋</Text>
            <Pressable style={styles.locationRow} onPress={requestLocation}>
              <MaterialIcons name={locationLoading ? 'sync' : 'location-on'} size={16} color={theme.primary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {location?.address || 'تحديد الموقع...'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.roleBadgeSmall}>
            <MaterialIcons name="person" size={16} color={theme.primary} />
            <Text style={styles.roleBadgeSmallText}>عميل</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={22} color={theme.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن خدمة... (سباكة، كهرباء، تنظيف)"
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
            <Pressable style={styles.micButton} onPress={() => Haptics.selectionAsync()}>
              <MaterialIcons name="mic" size={22} color={theme.primary} />
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.heroBanner}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=400&fit=crop' }} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTag}>خدماتي</Text>
            <Text style={styles.heroTitle}>كل خدمات بيتك{'\n'}في مكان واحد</Text>
            <Text style={styles.heroSubtitle}>فنيين محترفين • أسعار ثابتة • ضمان الشغل</Text>
          </View>
        </Pressable>

        {popularServiceIds.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>الأكثر طلباً</Text>
              <Text style={styles.sectionSubtitle}>الأشهر هذا الأسبوع</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularScroll}
            >
              {popularServiceIds
                .map((id) => SERVICES.find((s) => s.id === id))
                .filter(Boolean)
                .map((service: any) => (
                  <Pressable
                    key={service.id}
                    style={[styles.popularCard, { backgroundColor: service.colorLight, borderColor: service.color + '22' }]}
                    onPress={() => handleQuickChat(service.id)}
                  >
                    <View style={[styles.popularIconWrap, { backgroundColor: service.color + '18' }]}>
                      <MaterialIcons name={service.icon as any} size={34} color={service.color} />
                    </View>
                    <Text style={styles.popularName} numberOfLines={2}>
                      {service.name}
                    </Text>
                    <Text style={styles.popularHint}>ابدأ الآن</Text>
                  </Pressable>
                ))}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>جميع الخدمات</Text>
          <Text style={styles.sectionSubtitle}>{filteredServices.length} خدمة</Text>
        </View>

        <View style={styles.servicesGrid}>
          {filteredServices.map((service) => (
            <Pressable key={service.id} style={styles.serviceCardLarge} onPress={() => handleServicePress(service.id)}>
              <View style={[styles.serviceCardLargeMedia, { backgroundColor: service.colorLight }]}>
                <Image source={service.image} style={styles.serviceCardLargeImage} contentFit="cover" />
                <View style={styles.serviceCardLargeOverlay} />

                <View style={[styles.priceBadge, { backgroundColor: 'rgba(6, 247, 46, 0.68)' }]}>
                  <Text style={styles.priceBadgeText}>
                    من {PRICING[service.id]?.baseFee ?? 0} {APP_CONFIG.currency}
                  </Text>
                </View>

                <View style={[styles.serviceIconChip, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
                  <MaterialIcons name={service.icon as any} size={18} color={service.color} />
                </View>

                <View style={styles.serviceCardLargeTopText}>
                  <Text style={styles.serviceCardLargeName} numberOfLines={1}>
                    {service.name}
                  </Text>
                  <Text style={styles.serviceCardLargeDesc} numberOfLines={1}>
                    {service.description}
                  </Text>
                </View>
              </View>

              <View style={styles.serviceCardLargeActionsRow}>
                <Pressable style={styles.mapBtnLarge} onPress={() => handleServicePress(service.id)}>
                  <MaterialIcons name="map" size={16} color={theme.secondary} />
                  <Text style={styles.mapBtnText}>خريطة</Text>
                </Pressable>
                <Pressable style={styles.chatBtnLarge} onPress={() => handleQuickChat(service.id)}>
                  <MaterialIcons name="chat" size={16} color="#FFF" />
                  <Text style={styles.chatBtnLargeText}>شات</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ===================== PROVIDER DASHBOARD =====================
function ProviderDashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { location } = useLocation();
  const { isProviderAvailable, toggleProviderAvailability, providerRequests, acceptRequest, rejectRequest } = useApp();
  const pendingRequests = providerRequests.filter((r) => r.status === 'pending');
  const acceptedRequests = providerRequests.filter((r) => r.status === 'accepted');

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayOrders = providerRequests.filter((r) => (r.createdAt || '').slice(0, 10) === todayKey);
  const paidToday = providerRequests.filter(
    (r) => r.status === 'paid' && (r.createdAt || '').slice(0, 10) === todayKey
  );
  const ratedOrders = providerRequests.filter((r) => typeof r.rating === 'number');
  const avgRating = ratedOrders.length
    ? ratedOrders.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedOrders.length
    : 0;
  const incomeToday = paidToday.reduce((sum, r) => sum + (r.totalPrice || 0), 0);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.providerHeader}>
          <View>
            <Text style={styles.providerGreeting}>أهلاً يا معلم! 🔧</Text>
            <Text style={styles.providerSubGreeting}>{user?.name || 'محمد عبد الرحمن'}</Text>
            <View style={styles.providerLocationRow}>
              <MaterialIcons name="location-on" size={14} color={theme.textSecondary} />
              <Text style={styles.providerLocationText} numberOfLines={1}>{location?.address || 'القاهرة'}</Text>
            </View>
          </View>
          <View style={[styles.roleBadgeSmall, { backgroundColor: 'rgba(13,148,136,0.1)' }]}>
            <MaterialIcons name="engineering" size={16} color={theme.secondary} />
            <Text style={[styles.roleBadgeSmallText, { color: theme.secondary }]}>فني</Text>
          </View>
        </View>

        <Pressable
          style={[styles.availabilityCard, { backgroundColor: isProviderAvailable ? '#D1FAE5' : '#FEE2E2' }]}
          onPress={() => { Haptics.selectionAsync(); toggleProviderAvailability(); }}
        >
          <View style={styles.availabilityContent}>
            <MaterialIcons name={isProviderAvailable ? 'check-circle' : 'cancel'} size={32} color={isProviderAvailable ? theme.success : theme.error} />
            <View style={styles.availabilityText}>
              <Text style={styles.availabilityTitle}>{isProviderAvailable ? 'متاح للطلبات' : 'غير متاح'}</Text>
              <Text style={styles.availabilitySubtitle}>{isProviderAvailable ? 'اضغط لإيقاف استقبال الطلبات' : 'اضغط لبدء استقبال الطلبات'}</Text>
            </View>
          </View>
          <View style={[styles.toggleTrack, { backgroundColor: isProviderAvailable ? theme.success : '#D1D5DB' }]}>
            <View style={[styles.toggleThumb, { transform: [{ translateX: isProviderAvailable ? 20 : 0 }] }]} />
          </View>
        </Pressable>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.primaryFaded }]}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{todayOrders.length}</Text>
            <Text style={styles.statLabel}>طلبات اليوم</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{avgRating ? avgRating.toFixed(1) : '-'}</Text>
            <Text style={styles.statLabel}>التقييم</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {incomeToday.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>ج.م اليوم</Text>
          </View>
        </View>

        {pendingRequests.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>طلبات جديدة</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{pendingRequests.length}</Text></View>
            </View>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestService}>{request.serviceName}</Text>
                  <Text style={styles.requestPrice}>{request.totalPrice} ج.م</Text>
                </View>
                <View style={styles.requestDetail}>
                  <MaterialIcons name="location-on" size={16} color={theme.textSecondary} />
                  <Text style={styles.requestDetailText}>{request.address}</Text>
                </View>
                <View style={styles.requestDetail}>
                  <MaterialIcons name="access-time" size={16} color={theme.textSecondary} />
                  <Text style={styles.requestDetailText}>{request.scheduledDate} - {request.scheduledTime}</Text>
                </View>
                <View style={styles.requestActions}>
                  <Pressable style={styles.rejectBtn} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); rejectRequest(request.id); }}>
                    <Text style={styles.rejectBtnText}>رفض</Text>
                  </Pressable>
                  <Pressable style={styles.acceptBtn} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); acceptRequest(request.id); }}>
                    <Text style={styles.acceptBtnText}>قبول الطلب</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyRequests}>
            <MaterialIcons name="inbox" size={48} color={theme.textTertiary} />
            <Text style={styles.emptyRequestsText}>مفيش طلبات جديدة حالياً</Text>
            <Text style={styles.emptyRequestsSub}>لما حد يطلب خدمة هتلاقي الطلب هنا</Text>
          </View>
        )}

        {acceptedRequests.length > 0 ? (
          <>
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>طلبات مقبولة</Text>
            </View>
            {acceptedRequests.map((request) => (
              <View key={request.id} style={[styles.requestCard, { borderLeftColor: theme.success, borderLeftWidth: 4 }]}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestService}>{request.serviceName}</Text>
                  <View style={styles.acceptedBadge}><Text style={styles.acceptedBadgeText}>تم القبول ✓</Text></View>
                </View>
                <View style={styles.requestDetail}>
                  <MaterialIcons name="location-on" size={16} color={theme.textSecondary} />
                  <Text style={styles.requestDetailText}>{request.address}</Text>
                </View>
                <Text style={styles.requestPrice}>{request.totalPrice} ج.م</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: '700', color: theme.textPrimary, textAlign: 'right' },
  locationRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 4, justifyContent: 'flex-end' },
  locationText: { fontSize: 13, color: theme.textSecondary, marginHorizontal: 4, maxWidth: 200, textAlign: 'right' },
  roleBadgeSmall: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: theme.primaryFaded, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  roleBadgeSmallText: { fontSize: 13, fontWeight: '600', color: theme.primary },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBar: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: theme.surfaceSecondary, borderRadius: 16, paddingHorizontal: 14, height: 50, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: theme.textPrimary, textAlign: 'right' },
  micButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primaryFaded, alignItems: 'center', justifyContent: 'center' },
  heroBanner: { marginHorizontal: 16, marginTop: 8, borderRadius: 20, overflow: 'hidden', height: 180 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', padding: 20, justifyContent: 'center', alignItems: 'flex-end' },
  heroTag: { fontSize: 12, fontWeight: '700', color: theme.primary, backgroundColor: 'rgba(249,115,22,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', textAlign: 'right' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginTop: 8, lineHeight: 36, textAlign: 'right' },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'right' },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, textAlign: 'right' },
  sectionSubtitle: { fontSize: 13, color: theme.textSecondary },
  seeAll: { fontSize: 14, fontWeight: '600', color: theme.primary },
  popularScroll: { paddingHorizontal: 16, gap: 12 },
  popularCard: {
    width: 160,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    ...shadows.card,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 140,
  },
  popularIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularName: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '900',
    color: theme.textPrimary,
    textAlign: 'right',
    lineHeight: 20,
  },
  popularHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
    color: theme.primary,
    textAlign: 'right',
  },
  quickServicesScroll: { paddingHorizontal: 16, gap: 16 },
  quickServiceItem: { alignItems: 'center', width: 72 },
  quickServiceIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  quickServiceImage: { width: 64, height: 64 },
  quickServiceName: { fontSize: 11, fontWeight: '600', color: theme.textPrimary, marginTop: 6, textAlign: 'center' },
  servicesGrid: { paddingHorizontal: 16, gap: 12 },
  serviceCard: { flexDirection: 'row-reverse', backgroundColor: theme.surface, borderRadius: 16, padding: 12, ...shadows.card, alignItems: 'center' },
  serviceCardImageWrap: { width: 72, height: 72, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  serviceCardImage: { width: 72, height: 72 },
  serviceCardInfo: { flex: 1, marginHorizontal: 12 },
  serviceCardName: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, textAlign: 'right' },
  serviceCardDesc: { fontSize: 12, color: theme.textSecondary, marginTop: 2, textAlign: 'right' },
  serviceCardActions: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  serviceCardPrice: { fontSize: 13, fontWeight: '700', color: theme.primary },
  serviceCardButtons: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  mapBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(13,148,136,0.08)' },
  mapBtnText: { fontSize: 12, fontWeight: '600', color: theme.secondary },
  chatSmallBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },

  serviceCardLarge: { backgroundColor: theme.surface, borderRadius: 20, overflow: 'hidden', ...shadows.card },
  serviceCardLargeMedia: { height: 150, position: 'relative', justifyContent: 'flex-end' },
  serviceCardLargeImage: { width: '100%', height: '100%' },
  serviceCardLargeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  priceBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  priceBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  serviceIconChip: { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceCardLargeTopText: { position: 'absolute', bottom: 12, right: 12, left: 12 },
  serviceCardLargeName: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', textAlign: 'right' },
  serviceCardLargeDesc: { marginTop: 4, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textAlign: 'right' },
  serviceCardLargeActionsRow: { flexDirection: 'row-reverse', gap: 10, padding: 12 },
  mapBtnLarge: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(13,148,136,0.10)', borderWidth: 1, borderColor: 'rgba(13,148,136,0.18)' },
  chatBtnLarge: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: theme.primary },
  chatBtnLargeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  providersScroll: { paddingHorizontal: 16, gap: 12 },
  providerCard: { backgroundColor: theme.surface, borderRadius: 16, padding: 14, width: 140, alignItems: 'center', ...shadows.card },
  providerAvatar: { width: 56, height: 56, borderRadius: 28 },
  providerName: { fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginTop: 8, textAlign: 'center' },
  providerRatingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 },
  providerRating: { fontSize: 12, fontWeight: '700', color: theme.textPrimary },
  providerReviews: { fontSize: 11, color: theme.textSecondary },
  providerJobs: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
  // Provider Dashboard
  providerHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  providerGreeting: { fontSize: 22, fontWeight: '700', color: theme.textPrimary, textAlign: 'right' },
  providerSubGreeting: { fontSize: 14, color: theme.textSecondary, marginTop: 2, textAlign: 'right' },
  providerLocationRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  providerLocationText: { fontSize: 12, color: theme.textTertiary, maxWidth: 180 },
  availabilityCard: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 16 },
  availabilityContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
  availabilityText: { flex: 1 },
  availabilityTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, textAlign: 'right' },
  availabilitySubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 2, textAlign: 'right' },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, padding: 2 },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: { flex: 1, padding: 14, borderRadius: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', color: theme.textSecondary, marginTop: 4, textAlign: 'center' },
  badge: { backgroundColor: theme.error, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  requestCard: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 12, ...shadows.card },
  requestHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  requestService: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  requestPrice: { fontSize: 18, fontWeight: '800', color: theme.primary, textAlign: 'right' },
  requestDetail: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 6 },
  requestDetailText: { fontSize: 13, color: theme.textSecondary, flex: 1, textAlign: 'right' },
  requestActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 12 },
  rejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.errorLight, alignItems: 'center' },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: theme.error },
  acceptBtn: { flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.success, alignItems: 'center' },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  acceptedBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  acceptedBadgeText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  emptyRequests: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyRequestsText: { fontSize: 16, fontWeight: '600', color: theme.textSecondary },
  emptyRequestsSub: { fontSize: 13, color: theme.textTertiary },
  // Admin Dashboard
  adminHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  adminGreeting: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, textAlign: 'right' },
  adminSubGreeting: { fontSize: 13, color: theme.textSecondary, marginTop: 2, textAlign: 'right' },
  adminBadge: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F3E8FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  adminBadgeText: { fontSize: 13, fontWeight: '600', color: '#8B5CF6' },
  adminBanner: { height: 120, marginHorizontal: 16, borderRadius: 16, marginTop: 8, marginBottom: 16 },
  adminStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  adminStatCard: { width: '47%', padding: 16, borderRadius: 16, alignItems: 'center', gap: 6, ...shadows.card },
  adminStatValue: { fontSize: 24, fontWeight: '800' },
  adminStatLabel: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  adminCard: { backgroundColor: theme.surface, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, ...shadows.card },
  adminCardTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, textAlign: 'right', marginBottom: 12 },
  adminStatusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  adminStatusItem: { alignItems: 'center', flex: 1, gap: 4 },
  adminStatusDot: { width: 10, height: 10, borderRadius: 5 },
  adminStatusLabel: { fontSize: 11, color: theme.textSecondary, fontWeight: '500' },
  adminStatusValue: { fontSize: 18, fontWeight: '800', color: theme.textPrimary },
  adminServiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  adminServiceRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.primaryFaded, textAlign: 'center', lineHeight: 24, fontSize: 12, fontWeight: '700', color: theme.primary, overflow: 'hidden' },
  adminServiceName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.textPrimary, textAlign: 'right' },
  adminServiceBarBg: { width: 80, height: 6, borderRadius: 3, backgroundColor: theme.surfaceSecondary },
  adminServiceBar: { height: 6, borderRadius: 3, backgroundColor: theme.primary },
  adminServiceCount: { fontSize: 13, fontWeight: '700', color: theme.primary, width: 30, textAlign: 'center' },
  adminUserRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  adminUserAvatar: { width: 40, height: 40, borderRadius: 20 },
  adminUserInfo: { flex: 1 },
  adminUserName: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, textAlign: 'right' },
  adminUserPhone: { fontSize: 12, color: theme.textSecondary, textAlign: 'right' },
  adminUserRoleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  adminUserRoleText: { fontSize: 11, fontWeight: '700' },
  adminOrderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  adminOrderInfo: { flex: 1 },
  adminOrderNum: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
  adminOrderService: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  adminOrderRight: { alignItems: 'flex-end', gap: 4 },
  adminOrderPrice: { fontSize: 14, fontWeight: '800', color: theme.primary },
  adminOrderStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminOrderStatusText: { fontSize: 10, fontWeight: '700' },
  adminEmptyText: { fontSize: 14, color: theme.textTertiary, textAlign: 'center', paddingVertical: 20 },
});
