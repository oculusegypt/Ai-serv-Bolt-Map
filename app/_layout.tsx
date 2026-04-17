import { Stack, useRouter, useSegments } from 'expo-router';
import { AppProvider } from '../contexts/AppContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { LocationProvider } from '../contexts/LocationContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';
import { ActivityIndicator, View } from 'react-native';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { I18nProvider } from '../contexts/I18nContext';
import { useEffect } from 'react';
import { MessagesProvider } from '../contexts/MessagesContext';
import * as Notifications from 'expo-notifications';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { theme } = useTheme();

  useEffect(() => {
    let sub: Notifications.Subscription | null = null;
    let cancelled = false;

    const openFromData = (data: any) => {
      const orderId = String(data?.orderId || data?.order_id || '');
      if (!orderId) return;
      router.push({ pathname: '/order-detail' as any, params: { orderId } } as any);
    };

    const init = async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (cancelled) return;
        const data = last?.notification?.request?.content?.data;
        if (data) openFromData(data);
      } catch {
        // ignore
      }

      try {
        sub = Notifications.addNotificationResponseReceivedListener((resp) => {
          const data = resp?.notification?.request?.content?.data;
          if (data) openFromData(data);
        });
      } catch {
        // ignore
      }
    };

    init().catch(() => {});
    return () => {
      cancelled = true;
      try {
        if (sub) sub.remove();
      } catch {
        // ignore
      }
    };
  }, [router]);

  useEffect(() => {
    if (isLoading) return;

    const firstSeg = segments[0] as unknown as string | undefined;
    const inAuth = firstSeg === 'auth';
    const inTabs = firstSeg === '(tabs)';
    const inLanding = !firstSeg || firstSeg === 'index';

    const protectedOutsideTabs =
      firstSeg === 'chat' ||
      firstSeg === 'map' ||
      firstSeg === 'order-detail' ||
      firstSeg === 'order-chat';

    if (!isAuthenticated) {
      // Guests: '/' is the default home. Allow landing and tabs.
      // Block only protected screens outside tabs.
      if (!inAuth && !inLanding && !inTabs && protectedOutsideTabs) {
        router.replace('/(tabs)/profile');
      }
      return;
    }

    // Authenticated users should not stay on auth or landing.
    if (inAuth || inLanding) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, router, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="order-detail" options={{ animation: 'slide_from_left' }} />
      <Stack.Screen name="order-chat" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="map" options={{ animation: 'slide_from_left' }} />
      <Stack.Screen name="auth" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <I18nProvider>
          <LocationProvider>
            <NotificationsProvider>
              <MessagesProvider>
                <AppProvider>
                  <AppContent />
                </AppProvider>
              </MessagesProvider>
            </NotificationsProvider>
          </LocationProvider>
        </I18nProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
