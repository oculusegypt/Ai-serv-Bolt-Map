import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { theme, shadows } from '../constants/theme';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { SERVICES } from '../constants/config';

type AuthStep = 'welcome' | 'login' | 'register';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('أدخل بريد إلكتروني صحيح');
      return;
    }
    if (!password || password.length < 6) {
      setError('كلمة المرور يجب ألا تقل عن 6 أحرف');
      return;
    }
    if (step === 'register' && !name.trim()) {
      setError('أدخل الاسم بالكامل');
      return;
    }
    if (step === 'register' && role === 'provider' && selectedServices.length === 0) {
      setError('اختر خدمة واحدة على الأقل');
      return;
    }

    setError('');
    setIsLoading(true);
    Haptics.selectionAsync();

    if (step === 'register') {
      const res = await register({
        email: email.trim(),
        password,
        name: name.trim(),
        role,
        services: role === 'provider' ? selectedServices : undefined,
      });
      setIsLoading(false);
      if (!res.ok) {
        setError(res.error || 'فشل إنشاء الحساب');
        return;
      }
      if (res.needsEmailVerification) {
        setError('تم إنشاء الحساب. يرجى تفعيل الحساب من البريد الإلكتروني ثم تسجيل الدخول');
        setStep('login');
        return;
      }
      return;
    }

    const res = await login(email.trim(), password);
    setIsLoading(false);
    if (!res.ok) {
      setError(res.error || 'فشل تسجيل الدخول');
      return;
    }

    router.replace('/(tabs)');
  };

  const toggleService = (sId: string) => {
    setSelectedServices((prev) =>
      prev.includes(sId) ? prev.filter((s) => s !== sId) : [...prev, sId]
    );
  };

  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.welcomeContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.welcomeHero}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=400&fit=crop' }}
              style={styles.welcomeImage}
              contentFit="cover"
            />
            <View style={styles.welcomeOverlay}>
              <View style={styles.logoBadge}>
                <MaterialIcons name="home-repair-service" size={32} color="#FFF" />
              </View>
              <Text style={styles.welcomeTitle}>خدماتي</Text>
              <Text style={styles.welcomeTagline}>كل خدمات بيتك في مكان واحد</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.welcomeActions}>
            <View style={styles.featureRow}>
              <FeatureItem icon="build" text="10 خدمات منزلية" />
              <FeatureItem icon="star" text="فنيين موثوقين" />
              <FeatureItem icon="speed" text="خدمة سريعة" />
            </View>

            <Pressable
              style={styles.primaryBtn}
              onPress={() => { Haptics.selectionAsync(); setStep('login'); }}
            >
              <Text style={styles.primaryBtnText}>تسجيل الدخول</Text>
              <MaterialIcons name="arrow-back" size={20} color="#FFF" />
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => { Haptics.selectionAsync(); setStep('register'); }}
            >
              <Text style={styles.secondaryBtnText}>إنشاء حساب جديد</Text>
            </Pressable>

            <Text style={styles.demoHint}>
              أنشئ حسابك ببريدك الإلكتروني ثم فعّله من الرسالة
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isRegister = step === 'register';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backBtn} onPress={() => { setStep('welcome'); setError(''); }}>
            <MaterialIcons name="arrow-forward" size={24} color={theme.textPrimary} />
          </Pressable>

          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.formTitle}>
              {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </Text>
            <Text style={styles.formSubtitle}>
              {isRegister ? 'أنشئ حسابك وابدأ الاستخدام' : 'أدخل بريدك الإلكتروني لتسجيل الدخول'}
            </Text>

            {isRegister ? (
              <>
                <Text style={styles.inputLabel}>نوع الحساب</Text>
                <View style={styles.roleRow}>
                  <Pressable
                    style={[styles.roleCard, role === 'customer' && styles.roleCardActive]}
                    onPress={() => { setRole('customer'); Haptics.selectionAsync(); }}
                  >
                    <MaterialIcons name="person" size={28} color={role === 'customer' ? theme.primary : theme.textTertiary} />
                    <Text style={[styles.roleLabel, role === 'customer' && styles.roleLabelActive]}>عميل</Text>
                    <Text style={styles.roleDesc}>اطلب خدمات لبيتك</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.roleCard, role === 'provider' && { borderColor: theme.secondary, backgroundColor: 'rgba(13,148,136,0.06)' }]}
                    onPress={() => { setRole('provider'); Haptics.selectionAsync(); }}
                  >
                    <MaterialIcons name="engineering" size={28} color={role === 'provider' ? theme.secondary : theme.textTertiary} />
                    <Text style={[styles.roleLabel, role === 'provider' && { color: theme.secondary, fontWeight: '700' }]}>مقدم خدمة</Text>
                    <Text style={styles.roleDesc}>قدم خدماتك واكسب</Text>
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>الاسم بالكامل</Text>
                <View style={styles.inputWrap}>
                  <MaterialIcons name="person-outline" size={20} color={theme.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="مثال: أحمد محمد"
                    placeholderTextColor={theme.textTertiary}
                    value={name}
                    onChangeText={setName}
                    textAlign="right"
                  />
                </View>

                {role === 'provider' ? (
                  <>
                    <Text style={styles.inputLabel}>اختر خدماتك (يمكن اختيار أكثر من خدمة)</Text>
                    <View style={styles.servicesGrid}>
                      {SERVICES.map((s) => {
                        const selected = selectedServices.includes(s.id);
                        return (
                          <Pressable
                            key={s.id}
                            style={[styles.serviceChip, selected && styles.serviceChipActive]}
                            onPress={() => { toggleService(s.id); Haptics.selectionAsync(); }}
                          >
                            <Text style={[styles.serviceChipText, selected && styles.serviceChipTextActive]}>
                              {s.name}
                            </Text>
                            {selected ? <MaterialIcons name="check-circle" size={16} color={theme.secondary} /> : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}
              </>
            ) : null}

            <Text style={styles.inputLabel}>البريد الإلكتروني</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { flex: 1, writingDirection: 'ltr' as const }]}
                placeholder="name@example.com"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign="left"
              />
              <MaterialIcons name="email" size={20} color={theme.textTertiary} />
            </View>

            <Text style={styles.inputLabel}>كلمة المرور</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { flex: 1, writingDirection: 'rtl' as const }]}
                placeholder="••••••••"
                placeholderTextColor={theme.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                textAlign="right"
              />
              <MaterialIcons name="lock" size={20} color={theme.textTertiary} />
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <MaterialIcons name="error" size={16} color={theme.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.primaryBtn, isLoading && { opacity: 0.6 }]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>
                    {isRegister ? 'إنشاء الحساب' : 'تسجيل الدخول'}
                  </Text>
                  <MaterialIcons name="arrow-back" size={20} color="#FFF" />
                </>
              )}
            </Pressable>

            <Pressable
              style={styles.switchBtn}
              onPress={() => { setStep(isRegister ? 'login' : 'register'); setError(''); }}
            >
              <Text style={styles.switchText}>
                {isRegister ? 'عندك حساب بالفعل؟ سجل دخول' : 'مش عندك حساب؟ سجل الآن'}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <MaterialIcons name={icon as any} size={22} color={theme.primary} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  welcomeContent: { flexGrow: 1 },
  welcomeHero: { height: 320, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  welcomeImage: { width: '100%', height: '100%' },
  welcomeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  logoBadge: { width: 64, height: 64, borderRadius: 20, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  welcomeTitle: { fontSize: 36, fontWeight: '800', color: '#FFF' },
  welcomeTagline: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  welcomeActions: { padding: 24, gap: 16 },
  featureRow: { flexDirection: 'row-reverse', justifyContent: 'space-around', marginBottom: 8 },
  featureItem: { alignItems: 'center', gap: 6 },
  featureIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.primaryFaded, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  primaryBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 16, ...shadows.card },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: theme.primary },
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: theme.primary },
  demoHint: { fontSize: 11, color: theme.textTertiary, textAlign: 'center', lineHeight: 18, marginTop: 4 },
  formContent: { flexGrow: 1, padding: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'flex-end' },
  formTitle: { fontSize: 26, fontWeight: '800', color: theme.textPrimary, textAlign: 'right', marginBottom: 6 },
  formSubtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'right', marginBottom: 24, lineHeight: 22 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, textAlign: 'right', marginBottom: 8, marginTop: 16 },
  inputWrap: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: theme.surfaceSecondary, borderRadius: 14, paddingHorizontal: 14, height: 52, gap: 10, borderWidth: 1, borderColor: theme.border },
  input: { flex: 1, fontSize: 16, color: theme.textPrimary, textAlign: 'right' },
  countryCode: { fontSize: 16, fontWeight: '600', color: theme.textPrimary },
  inputDivider: { width: 1, height: 24, backgroundColor: theme.border },
  roleRow: { flexDirection: 'row-reverse', gap: 12 },
  roleCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: theme.border, gap: 6 },
  roleCardActive: { borderColor: theme.primary, backgroundColor: theme.primaryFaded },
  roleLabel: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  roleLabelActive: { color: theme.primary, fontWeight: '700' },
  roleDesc: { fontSize: 11, color: theme.textSecondary, textAlign: 'center' },
  servicesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  serviceChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceSecondary },
  serviceChipActive: { borderColor: theme.secondary, backgroundColor: 'rgba(13,148,136,0.08)' },
  serviceChipText: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
  serviceChipTextActive: { color: theme.secondary, fontWeight: '600' },
  otpIcon: { alignSelf: 'center', marginBottom: 16 },
  otpRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 14, marginVertical: 24 },
  otpInput: { width: 56, height: 60, borderRadius: 14, borderWidth: 2, borderColor: theme.border, fontSize: 24, fontWeight: '700', color: theme.textPrimary, backgroundColor: theme.surfaceSecondary },
  otpInputFilled: { borderColor: theme.primary, backgroundColor: theme.primaryFaded },
  errorRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 8, marginBottom: 8 },
  errorText: { fontSize: 13, color: theme.error, fontWeight: '500' },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { fontSize: 14, color: theme.primary, fontWeight: '600' },
  switchBtn: { alignItems: 'center', marginTop: 16 },
  switchText: { fontSize: 14, color: theme.primary, fontWeight: '600' },
});
