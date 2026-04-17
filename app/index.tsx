import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { theme, shadows } from '../constants/theme';
import { SERVICES } from '../constants/config';

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const popularServices = useMemo(() => SERVICES.slice(0, 6), []);
  const topProviders = useMemo(
    () => [
      {
        name: 'أحمد فني سباكة',
        rating: 4.9,
        jobs: '1200+',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      },
      {
        name: 'محمد كهربائي',
        rating: 4.8,
        jobs: '900+',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
      },
      {
        name: 'حسام تكييفات',
        rating: 4.9,
        jobs: '1800+',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop',
      },
    ],
    []
  );

  const testimonials = useMemo(
    () => [
      {
        name: 'سارة',
        text: 'طلبت سباك وجالي في نفس اليوم. شغل محترم وسعر واضح.',
        rating: 5,
      },
      {
        name: 'محمود',
        text: 'التتبع خطوة بخطوة فرق معايا جدًا. التقييم بعد الدفع فكرة ممتازة.',
        rating: 5,
      },
      {
        name: 'نور',
        text: 'محادثة سهلة وحددت الخدمة بسرعة. تجربة ممتازة.',
        rating: 4,
      },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <Animated.View entering={FadeInDown.duration(600)} style={styles.hero}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1400&h=900&fit=crop' }}
            style={styles.heroImage}
            contentFit="cover"
          />
          <View style={styles.heroOverlay}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <MaterialIcons name="home-repair-service" size={30} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.brandTitle}>خدماتي</Text>
                <Text style={styles.brandSubtitle}>خدمات منزلية سريعة وموثوقة</Text>
              </View>
            </View>

            <View style={styles.valueProps}>
              <ValueProp icon="speed" title="سرعة" desc="اطلب الخدمة خلال ثوانٍ" />
              <ValueProp icon="verified" title="موثوقية" desc="مقدمي خدمة موثقين" />
              <ValueProp icon="support-agent" title="متابعة" desc="تتبع الطلب خطوة بخطوة" />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(150).duration(550)} style={styles.card}>
          <Text style={styles.cardTitle}>ابدأ الآن</Text>
          <Text style={styles.cardSubtitle}>
            سجّل دخولك أو أنشئ حسابًا جديدًا لتجربة محادثة ذكية تختار لك أفضل مقدم خدمة.
          </Text>

          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              Haptics.selectionAsync();
              router.replace('/auth');
            }}
          >
            <MaterialIcons name="login" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>تسجيل الدخول / إنشاء حساب</Text>
          </Pressable>

          <View style={styles.badgesRow}>
            <Badge icon="payment" text="تسعير واضح" />
            <Badge icon="map" text="اختيار على الخريطة" />
            <Badge icon="chat" text="محادثة سهلة" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(500)} style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>الخدمات</Text>
            <Text style={styles.sectionSubtitle}>اختر الخدمة المناسبة وابدأ</Text>
          </View>
          <View style={styles.servicesGrid}>
            {popularServices.map((s) => (
              <View key={s.id} style={[styles.serviceChip, { backgroundColor: s.colorLight }]}> 
                <Text style={styles.serviceChipText}>{s.name}</Text>
                <MaterialIcons name="arrow-back" size={18} color={theme.textSecondary} />
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>لماذا خدماتي؟</Text>
            <Text style={styles.sectionSubtitle}>تجربة سريعة وواضحة</Text>
          </View>
          <View style={styles.featuresGrid}>
            <FeatureCard icon="schedule" title="حجز سريع" desc="اطلب الخدمة خلال ثوانٍ" />
            <FeatureCard icon="verified" title="مزوّد موثوق" desc="ملفات وتقييمات حقيقية" />
            <FeatureCard icon="payments" title="دفع منضبط" desc="تأكيد عميل ثم مزوّد" />
            <FeatureCard icon="support-agent" title="دعم" desc="متابعة من البداية للنهاية" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(380).duration(500)} style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>آراء العملاء</Text>
            <Text style={styles.sectionSubtitle}>ناس جرّبت وبتنصح</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testimonialsRow}
          >
            {testimonials.map((t, idx) => (
              <View key={idx} style={styles.testimonialCard}>
                <View style={styles.testimonialTop}>
                  <View style={styles.testimonialAvatar}>
                    <MaterialIcons name="person" size={18} color={theme.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testimonialName}>{t.name}</Text>
                    <View style={styles.testimonialStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <MaterialIcons
                          key={s}
                          name={s <= t.rating ? 'star' : 'star-border'}
                          size={16}
                          color="#F59E0B"
                        />
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={styles.testimonialText}>{t.text}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(460).duration(500)} style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>أفضل المزوّدين</Text>
            <Text style={styles.sectionSubtitle}>نماذج من مزوّدين مميزين</Text>
          </View>
          <View style={styles.providersRow}>
            {topProviders.map((p, idx) => (
              <View key={idx} style={styles.providerCard}>
                <Image source={{ uri: p.avatar }} style={styles.providerAvatar} contentFit="cover" />
                <Text style={styles.providerName} numberOfLines={1}>{p.name}</Text>
                <View style={styles.providerMetaRow}>
                  <MaterialIcons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.providerMetaText}>{p.rating}</Text>
                  <Text style={styles.providerMetaSep}>•</Text>
                  <Text style={styles.providerMetaText}>{p.jobs}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(540).duration(500)} style={styles.finalCtaWrap}>
          <View style={styles.finalCtaCard}>
            <Text style={styles.finalCtaTitle}>جاهز تبدأ؟</Text>
            <Text style={styles.finalCtaSubtitle}>سجل دخولك واطلب أول خدمة خلال دقيقة</Text>
            <Pressable
              style={styles.finalCtaBtn}
              onPress={() => {
                Haptics.selectionAsync();
                router.replace('/auth');
              }}
            >
              <MaterialIcons name="rocket-launch" size={20} color="#FFF" />
              <Text style={styles.finalCtaBtnText}>ابدأ الآن</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ValueProp({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={styles.valueProp}>
      <View style={styles.valuePropIcon}>
        <MaterialIcons name={icon as any} size={22} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.valuePropTitle}>{title}</Text>
        <Text style={styles.valuePropDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function Badge({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.badge}>
      <MaterialIcons name={icon as any} size={16} color={theme.textSecondary} />
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureCardIcon}>
        <MaterialIcons name={icon as any} size={22} color={theme.primary} />
      </View>
      <Text style={styles.featureCardTitle}>{title}</Text>
      <Text style={styles.featureCardDesc}>{desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  hero: { height: 420, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 20,
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row-reverse', gap: 12, alignItems: 'center' },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: { fontSize: 34, fontWeight: '900', color: '#FFF', textAlign: 'right' },
  brandSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign: 'right' },
  valueProps: { gap: 10, marginBottom: 8 },
  valueProp: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 12,
    borderRadius: 16,
  },
  valuePropIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valuePropTitle: { fontSize: 14, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  valuePropDesc: { fontSize: 12, color: 'rgba(255,255,255,0.82)', textAlign: 'right', marginTop: 2 },
  card: {
    marginTop: -22,
    marginHorizontal: 16,
    backgroundColor: theme.surface,
    borderRadius: 22,
    padding: 16,
    ...shadows.card,
  },
  cardTitle: { fontSize: 20, fontWeight: '900', color: theme.textPrimary, textAlign: 'right' },
  cardSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'right',
    marginTop: 8,
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  badgesRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 14, justifyContent: 'flex-end' },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.surfaceSecondary,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: theme.textSecondary },

  sectionWrap: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: theme.textPrimary, textAlign: 'right' },
  sectionSubtitle: { fontSize: 12, color: theme.textSecondary, textAlign: 'right' },

  servicesGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: '48%',
  },
  serviceChipText: { fontSize: 13, fontWeight: '800', color: theme.textPrimary, textAlign: 'right', flex: 1 },

  featuresGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: '47%',
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 14,
    alignItems: 'flex-end',
    ...shadows.card,
  },
  featureCardIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: theme.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureCardTitle: { fontSize: 14, fontWeight: '900', color: theme.textPrimary, textAlign: 'right' },
  featureCardDesc: { fontSize: 12, color: theme.textSecondary, marginTop: 6, textAlign: 'right', lineHeight: 18 },

  testimonialsRow: { paddingHorizontal: 16, gap: 12 },
  testimonialCard: {
    width: 280,
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 14,
    ...shadows.card,
  },
  testimonialTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  testimonialAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: theme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialName: { fontSize: 14, fontWeight: '900', color: theme.textPrimary, textAlign: 'right' },
  testimonialStars: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 4 },
  testimonialText: { fontSize: 12, color: theme.textSecondary, marginTop: 10, lineHeight: 18, textAlign: 'right' },

  providersRow: { flexDirection: 'row-reverse', gap: 12 },
  providerCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    ...shadows.card,
  },
  providerAvatar: { width: 54, height: 54, borderRadius: 27 },
  providerName: { fontSize: 13, fontWeight: '900', color: theme.textPrimary, marginTop: 10, textAlign: 'center' },
  providerMetaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 6 },
  providerMetaText: { fontSize: 12, fontWeight: '800', color: theme.textPrimary },
  providerMetaSep: { fontSize: 10, color: theme.textTertiary, marginHorizontal: 2 },

  finalCtaWrap: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  finalCtaCard: {
    backgroundColor: theme.primary,
    borderRadius: 22,
    padding: 18,
    ...shadows.card,
  },
  finalCtaTitle: { fontSize: 20, fontWeight: '900', color: '#FFF', textAlign: 'right' },
  finalCtaSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'right', marginTop: 6 },
  finalCtaBtn: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  finalCtaBtnText: { fontSize: 15, fontWeight: '900', color: '#FFF' },
});
