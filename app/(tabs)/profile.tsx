import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { upsertProviderLocation } from '../../services/providerLocations';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { useMessages } from '../../contexts/MessagesContext';
import { getProviderStats } from '../../services/providerStatsService';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role, refreshOrders } = useApp();
  const { user, logout } = useAuth();
  const { location, requestLocation } = useLocation();
  const { theme, shadows, mode, setMode } = useTheme();
  const { language, setLanguage, needsReloadForLayout, t } = useI18n();
  const { unreadMessagesCount, refreshUnreadMessagesCount } = useMessages();

  const styles = createStyles(theme, shadows);

  const [logoutModal, setLogoutModal] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);
  const [themeModal, setThemeModal] = useState(false);

  const [providerStats, setProviderStats] = useState<{ completedOrders: number; ratingAvg: number; experienceYears: number } | null>(null);
  const [loadingProviderStats, setLoadingProviderStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isProvider = role === 'provider';
  const isAdmin = role === 'admin';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      if (!isProvider) return;
      setLoadingProviderStats(true);
      try {
        const res = await getProviderStats(user.id);
        if (cancelled) return;
        if (res.ok && res.stats) {
          setProviderStats({
            completedOrders: res.stats.completedOrders,
            ratingAvg: res.stats.ratingAvg,
            experienceYears: res.stats.experienceYears,
          });
        } else {
          setProviderStats({ completedOrders: 0, ratingAvg: 0, experienceYears: 0 });
        }
      } finally {
        if (!cancelled) setLoadingProviderStats(false);
      }
    };
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id, isProvider]);

  const refreshProviderStats = async () => {
    if (!user?.id) return;
    if (!isProvider) return;
    const res = await getProviderStats(user.id);
    if (res.ok && res.stats) {
      setProviderStats({
        completedOrders: res.stats.completedOrders,
        ratingAvg: res.stats.ratingAvg,
        experienceYears: res.stats.experienceYears,
      });
    }
  };

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        refreshOrders(),
        refreshUnreadMessagesCount(),
        refreshProviderStats(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 16, paddingTop: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.textPrimary, textAlign: 'right' }}>
              حسابي
            </Text>
            <Text style={{ marginTop: 8, fontSize: 13, color: theme.textSecondary, textAlign: 'right', lineHeight: 18 }}>
              سجل دخولك لإدارة حسابك، متابعة طلباتك، واستلام الرسائل.
            </Text>
          </View>

          <Pressable
            style={{
              marginTop: 16,
              backgroundColor: theme.primary,
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/auth');
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>تسجيل الدخول / إنشاء حساب</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const handleUpdateProviderLocation = async () => {
    Haptics.selectionAsync();
    if (!user) return;

    const loc = await requestLocation();
    if (!loc) return;

    await upsertProviderLocation({
      providerId: user.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address,
    });
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      setLogoutModal(true);
    } else {
      Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'خروج', 
          style: 'destructive', 
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        },
      ]);
    }
  };

  const settingsGroups = isAdmin
    ? [
        {
          title: 'الإدارة',
          items: [
            { icon: 'people', label: 'إدارة المستخدمين', value: '' },
            { icon: 'assessment', label: 'التقارير', value: '' },
            { icon: 'settings', label: 'إعدادات النظام', value: '' },
          ],
        },
        {
          title: 'الحساب',
          items: [
            { icon: 'person', label: 'البيانات الشخصية', value: '' },
            { icon: 'inbox', label: 'الرسائل', value: unreadMessagesCount > 0 ? String(unreadMessagesCount) : '', onPress: () => router.push('/(tabs)/inbox') },
            { icon: 'notifications', label: 'الإشعارات', value: '', onPress: () => router.push('/(tabs)/notifications') },
            { icon: 'language', label: t('profile.language'), value: language === 'ar' ? t('profile.language.ar') : language === 'en' ? t('profile.language.en') : t('profile.language.system'), onPress: () => setLanguageModal(true) },
            { icon: 'dark-mode', label: t('profile.theme'), value: mode === 'light' ? t('profile.theme.light') : mode === 'dark' ? t('profile.theme.dark') : t('profile.theme.system'), onPress: () => setThemeModal(true) },
            { icon: 'help', label: 'المساعدة', value: '' },
          ],
        },
      ]
    : isProvider
    ? [
        {
          title: 'الخدمات',
          items: [
            { icon: 'build', label: 'خدماتي المتاحة', value: user?.services ? `${user.services.length} خدمات` : '' },
            { icon: 'attach-money', label: 'الأرباح', value: '', onPress: () => router.push('/(tabs)/provider-earnings') },
            { icon: 'schedule', label: 'مواعيد العمل', value: '' },
            { icon: 'payments', label: 'سحب الأموال', value: '', onPress: () => router.push('/(tabs)/withdraw') },
          ],
        },
        {
          title: 'الحساب',
          items: [
            { icon: 'person', label: 'البيانات الشخصية', value: '', onPress: () => router.push('/(tabs)/edit-profile') },
            { icon: 'verified', label: 'المستندات', value: 'مُوثق' },
            { icon: 'account-balance-wallet', label: 'المحفظة', value: '', onPress: () => router.push('/(tabs)/wallet') },
            { icon: 'inbox', label: 'الرسائل', value: unreadMessagesCount > 0 ? String(unreadMessagesCount) : '', onPress: () => router.push('/(tabs)/inbox') },
          ],
        },
        {
          title: 'الموقع',
          items: [
            { icon: 'my-location', label: 'تحديث موقعي', value: '', onPress: handleUpdateProviderLocation },
            { icon: 'location-on', label: 'الموقع الحالي', value: location?.address || 'غير محدد' },
          ],
        },
        {
          title: 'الإعدادات',
          items: [
            { icon: 'notifications', label: 'الإشعارات', value: '', onPress: () => router.push('/(tabs)/notifications') },
            { icon: 'language', label: t('profile.language'), value: language === 'ar' ? t('profile.language.ar') : language === 'en' ? t('profile.language.en') : t('profile.language.system'), onPress: () => setLanguageModal(true) },
            { icon: 'dark-mode', label: t('profile.theme'), value: mode === 'light' ? t('profile.theme.light') : mode === 'dark' ? t('profile.theme.dark') : t('profile.theme.system'), onPress: () => setThemeModal(true) },
            { icon: 'help', label: 'المساعدة', value: '' },
            { icon: 'privacy-tip', label: 'الخصوصية', value: '' },
          ],
        },
      ]
    : [
        {
          title: 'الحساب',
          items: [
            { icon: 'person', label: 'البيانات الشخصية', value: '', onPress: () => router.push('/(tabs)/edit-profile') },
            { icon: 'location-on', label: 'عناويني', value: location?.address ? '1 عنوان' : '' },
            { icon: 'account-balance-wallet', label: 'المحفظة', value: '', onPress: () => router.push('/(tabs)/wallet') },
            { icon: 'credit-card', label: 'طرق الدفع', value: '' },
            { icon: 'inbox', label: 'الرسائل', value: unreadMessagesCount > 0 ? String(unreadMessagesCount) : '', onPress: () => router.push('/(tabs)/inbox') },
          ],
        },
        {
          title: 'الموقع',
          items: [
            { icon: 'my-location', label: 'تحديث موقعي', value: '', onPress: requestLocation },
            { icon: 'location-on', label: 'الموقع الحالي', value: location?.address || 'غير محدد' },
          ],
        },
        {
          title: 'الإعدادات',
          items: [
            { icon: 'notifications', label: 'الإشعارات', value: '', onPress: () => router.push('/(tabs)/notifications') },
            { icon: 'language', label: t('profile.language'), value: language === 'ar' ? t('profile.language.ar') : language === 'en' ? t('profile.language.en') : t('profile.language.system'), onPress: () => setLanguageModal(true) },
            { icon: 'dark-mode', label: t('profile.theme'), value: mode === 'light' ? t('profile.theme.light') : mode === 'dark' ? t('profile.theme.dark') : t('profile.theme.system'), onPress: () => setThemeModal(true) },
            { icon: 'help', label: 'المساعدة والدعم', value: '' },
            { icon: 'info', label: 'عن التطبيق', value: '' },
          ],
        },
      ];

  const getRoleInfo = () => {
    if (isAdmin) return { label: 'مدير النظام', color: '#8B5CF6', icon: 'admin-panel-settings' as const };
    if (isProvider) return { label: 'مقدم خدمة', color: theme.secondary, icon: 'engineering' as const };
    return { label: 'عميل', color: theme.primary, icon: 'person' as const };
  };

  const roleInfo = getRoleInfo();

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
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
              }}
              style={styles.avatar}
              contentFit="cover"
            />
            {isProvider ? (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={18} color="#3B82F6" />
              </View>
            ) : null}
            {isAdmin ? (
              <View style={[styles.verifiedBadge, { backgroundColor: '#F3E8FF' }]}>
                <MaterialIcons name="shield" size={18} color="#8B5CF6" />
              </View>
            ) : null}
          </View>
          <Text style={styles.userName}>{user?.name || 'مستخدم'}</Text>
          <Text style={styles.userPhone}>{user?.phone || ''}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '15' }]}>
            <MaterialIcons name={roleInfo.icon} size={14} color={roleInfo.color} />
            <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
          </View>
          {isProvider ? (
            <View style={styles.providerStatsRow}>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>
                  {loadingProviderStats ? '...' : String(providerStats?.completedOrders ?? 0)}
                </Text>
                <Text style={styles.profileStatLabel}>طلب مكتمل</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>
                  {loadingProviderStats ? '...' : (providerStats?.ratingAvg ?? 0).toFixed(1)}
                </Text>
                <Text style={styles.profileStatLabel}>التقييم</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>
                  {loadingProviderStats ? '...' : `${providerStats?.experienceYears ?? 0} سنة`}
                </Text>
                <Text style={styles.profileStatLabel}>الخبرة</Text>
              </View>
            </View>
          ) : null}
        </View>

        {settingsGroups.map((group, gi) => (
          <View key={gi} style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>{group.title}</Text>
            <View style={styles.settingsGroupCard}>
              {group.items.map((item, ii) => (
                <Pressable
                  key={ii}
                  style={[styles.settingsItem, ii < group.items.length - 1 && styles.settingsItemBorder]}
                  onPress={() => { Haptics.selectionAsync(); if ((item as any).onPress) (item as any).onPress(); }}
                >
                  <View style={styles.settingsItemLeft}>
                    <View style={[styles.settingsIconWrap, isAdmin ? { backgroundColor: '#F3E8FF' } : {}]}>
                      <MaterialIcons name={item.icon as any} size={20} color={isAdmin ? '#8B5CF6' : theme.primary} />
                    </View>
                    <Text style={styles.settingsItemLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.settingsItemRight}>
                    {item.icon === 'inbox' && unreadMessagesCount > 0 ? (
                      <View style={styles.inboxBadge}>
                        <Text style={styles.inboxBadgeText}>{unreadMessagesCount}</Text>
                      </View>
                    ) : item.value ? (
                      <Text style={styles.settingsItemValue} numberOfLines={1}>{item.value}</Text>
                    ) : null}
                    <MaterialIcons name="arrow-back-ios" size={14} color={theme.textTertiary} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={theme.error} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>

      {/* Web Logout Modal */}
      {Platform.OS === 'web' ? (
        <Modal visible={logoutModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>تسجيل الخروج</Text>
              <Text style={styles.modalMessage}>هل أنت متأكد من تسجيل الخروج؟</Text>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancelBtn} onPress={() => setLogoutModal(false)}>
                  <Text style={styles.modalCancelText}>إلغاء</Text>
                </Pressable>
                <Pressable style={styles.modalConfirmBtn} onPress={async () => { 
                  setLogoutModal(false); 
                  await logout(); 
                  router.replace('/(tabs)');
                }}>
                  <Text style={styles.modalConfirmText}>خروج</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Language Modal */}
      <Modal visible={languageModal} transparent animationType="fade" onRequestClose={() => setLanguageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('profile.language')}</Text>
            {needsReloadForLayout ? (
              <Text style={styles.modalMessage}>{t('common.restart_required')}</Text>
            ) : null}
            <View style={{ width: '100%', gap: 10 }}>
              <Pressable
                style={styles.pickerBtn}
                onPress={() => { setLanguageModal(false); setLanguage('system').catch(() => {}); }}
              >
                <Text style={styles.pickerBtnText}>{t('profile.language.system')}</Text>
              </Pressable>
              <Pressable
                style={styles.pickerBtn}
                onPress={() => { setLanguageModal(false); setLanguage('ar').catch(() => {}); }}
              >
                <Text style={styles.pickerBtnText}>{t('profile.language.ar')}</Text>
              </Pressable>
              <Pressable
                style={styles.pickerBtn}
                onPress={() => { setLanguageModal(false); setLanguage('en').catch(() => {}); }}
              >
                <Text style={styles.pickerBtnText}>{t('profile.language.en')}</Text>
              </Pressable>
              <Pressable style={styles.modalCancelBtn} onPress={() => setLanguageModal(false)}>
                <Text style={styles.modalCancelText}>إغلاق</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme Modal */}
      <Modal visible={themeModal} transparent animationType="fade" onRequestClose={() => setThemeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('profile.theme')}</Text>
            <View style={{ width: '100%', gap: 10 }}>
              <Pressable
                style={styles.pickerBtn}
                onPress={() => { setThemeModal(false); setMode('system').catch(() => {}); }}
              >
                <Text style={styles.pickerBtnText}>{t('profile.theme.system')}</Text>
              </Pressable>
              <Pressable
                style={styles.pickerBtn}
                onPress={() => { setThemeModal(false); setMode('light').catch(() => {}); }}
              >
                <Text style={styles.pickerBtnText}>{t('profile.theme.light')}</Text>
              </Pressable>
              <Pressable
                style={styles.pickerBtn}
                onPress={() => { setThemeModal(false); setMode('dark').catch(() => {}); }}
              >
                <Text style={styles.pickerBtnText}>{t('profile.theme.dark')}</Text>
              </Pressable>
              <Pressable style={styles.modalCancelBtn} onPress={() => setThemeModal(false)}>
                <Text style={styles.modalCancelText}>إغلاق</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.backgroundSecondary },
    profileCard: { backgroundColor: theme.surface, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border },
    avatarContainer: { position: 'relative' },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.surface, borderRadius: 10, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
    userName: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginTop: 12 },
    userPhone: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
    roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    roleBadgeText: { fontSize: 12, fontWeight: '600' },
    providerStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
    profileStat: { alignItems: 'center', paddingHorizontal: 20 },
    profileStatValue: { fontSize: 18, fontWeight: '800', color: theme.textPrimary },
    profileStatLabel: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    profileStatDivider: { width: 1, height: 30, backgroundColor: theme.border },
    settingsGroup: { paddingHorizontal: 16, marginTop: 24 },
    settingsGroupTitle: { fontSize: 13, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 8, textAlign: 'right' },
    settingsGroupCard: { backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden', ...shadows.card },
    settingsItem: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
    settingsItemBorder: { borderBottomWidth: 1, borderBottomColor: theme.borderLight },
    settingsItemLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
    settingsIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primaryFaded, alignItems: 'center', justifyContent: 'center' },
    settingsItemLabel: { fontSize: 15, fontWeight: '500', color: theme.textPrimary },
    settingsItemRight: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 170 },
    settingsItemValue: { fontSize: 13, color: theme.textSecondary },
    inboxBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 7,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#EF4444',
    },
    inboxBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 11 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 24, marginBottom: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.errorLight },
    logoutText: { fontSize: 15, fontWeight: '700', color: theme.error },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { backgroundColor: theme.surface, padding: 24, borderRadius: 16, minWidth: 300, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
    modalMessage: { fontSize: 14, color: theme.textSecondary, marginBottom: 20, textAlign: 'center' },
    modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
    modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.surfaceSecondary, alignItems: 'center' },
    modalCancelText: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
    modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.error, alignItems: 'center' },
    modalConfirmText: { fontSize: 14, fontWeight: '700', color: theme.textOnPrimary },
    pickerBtn: { width: '100%', paddingVertical: 12, borderRadius: 10, backgroundColor: theme.surfaceSecondary, alignItems: 'center' },
    pickerBtnText: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  });
