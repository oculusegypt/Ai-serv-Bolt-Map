import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { I18nManager, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { useNotifications } from '../../contexts/NotificationsContext';

function RtlAwareTabBar(props: BottomTabBarProps & { isRTL: boolean }) {
  const { isRTL, state } = props;

  if (!isRTL) return <BottomTabBar {...props} />;

  const routes = [...state.routes].reverse();
  const index = routes.length - 1 - state.index;

  return (
    <BottomTabBar
      {...props}
      state={{
        ...state,
        routes,
        index,
      }}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const role = user?.role || 'customer';
  const { theme } = useTheme();
  const { t, isRTL } = useI18n();
  const { unreadCount } = useNotifications();

  const nativeRtl = I18nManager.isRTL;
  const tabBarIsRtl = isRTL && !nativeRtl;

  const tabBarStyle = {
    height: Platform.select({
      ios: insets.bottom + 60,
      android: insets.bottom + 60,
      default: 70,
    }),
    paddingTop: 8,
    paddingBottom: Platform.select({
      ios: insets.bottom + 8,
      android: insets.bottom + 8,
      default: 8,
    }),
    paddingHorizontal: 8,
    backgroundColor: theme.background,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  };

  if (role === 'admin') {
    return (
      <Tabs
        tabBar={(props: BottomTabBarProps) => (
          <RtlAwareTabBar {...props} isRTL={tabBarIsRtl} />
        )}
        screenOptions={{
          headerShown: false,
          tabBarStyle,
          tabBarActiveTintColor: '#8B5CF6',
          tabBarInactiveTintColor: theme.textTertiary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="auth" options={{ href: null }} />
        <Tabs.Screen name="chat" options={{ href: null }} />
        <Tabs.Screen name="order-detail" options={{ href: null }} />
        <Tabs.Screen name="order-chat" options={{ href: null }} />
        <Tabs.Screen name="inbox" options={{ href: null }} />
        <Tabs.Screen name="edit-profile" options={{ href: null }} />
        <Tabs.Screen name="wallet" options={{ href: null }} />
        <Tabs.Screen name="withdraw" options={{ href: null }} />
        <Tabs.Screen name="refund" options={{ href: null }} />
        <Tabs.Screen name="provider-earnings" options={{ href: null }} />
        <Tabs.Screen name="index" options={{ title: t('tabs.admin.dashboard'), tabBarIcon: ({ color, size }) => (<MaterialIcons name="dashboard" size={size} color={color} />) }} />
        <Tabs.Screen name="admin-orders" options={{ title: t('tabs.admin.orders'), tabBarIcon: ({ color, size }) => (<MaterialIcons name="assignment" size={size} color={color} />) }} />
        <Tabs.Screen name="admin-users" options={{ title: t('tabs.admin.users'), tabBarIcon: ({ color, size }) => (<MaterialIcons name="people" size={size} color={color} />) }} />
        <Tabs.Screen name="admin-services" options={{ title: t('tabs.admin.services'), tabBarIcon: ({ color, size }) => (<MaterialIcons name="miscellaneous-services" size={size} color={color} />) }} />
        <Tabs.Screen name="notifications" options={{ title: t('tabs.notifications'), tabBarIcon: ({ color, size }) => (<MaterialIcons name="notifications" size={size} color={color} />), tabBarBadge: unreadCount > 0 ? unreadCount : undefined, tabBarBadgeStyle: { backgroundColor: '#EF4444', color: '#FFF' } }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => (<MaterialIcons name="person" size={size} color={color} />) }} />
      </Tabs>
    );
  }

  if (role === 'provider') {
    return (
      <Tabs
        tabBar={(props: BottomTabBarProps) => (
          <RtlAwareTabBar {...props} isRTL={tabBarIsRtl} />
        )}
        screenOptions={{
          headerShown: false,
          tabBarStyle,
          tabBarActiveTintColor: theme.secondary,
          tabBarInactiveTintColor: theme.textTertiary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="auth" options={{ href: null }} />
        <Tabs.Screen name="chat" options={{ href: null }} />
        <Tabs.Screen name="order-detail" options={{ href: null }} />
        <Tabs.Screen name="order-chat" options={{ href: null }} />
        <Tabs.Screen name="inbox" options={{ href: null }} />
        <Tabs.Screen name="edit-profile" options={{ href: null }} />
        <Tabs.Screen name="wallet" options={{ href: null }} />
        <Tabs.Screen name="withdraw" options={{ href: null }} />
        <Tabs.Screen name="refund" options={{ href: null }} />
        <Tabs.Screen name="provider-earnings" options={{ href: null }} />
        <Tabs.Screen name="admin-orders" options={{ href: null }} />
        <Tabs.Screen name="admin-users" options={{ href: null }} />
        <Tabs.Screen name="admin-services" options={{ href: null }} />

        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.dashboard'),
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: t('tabs.orders'),
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="receipt-long" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: t('tabs.notifications'),
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="notifications" size={size} color={color} />
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: { backgroundColor: '#EF4444', color: '#FFF' },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabs.profile'),
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    );
  }

  return (
    <Tabs
      tabBar={(props: BottomTabBarProps) => (
        <RtlAwareTabBar {...props} isRTL={tabBarIsRtl} />
      )}
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="auth" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="order-detail" options={{ href: null }} />
      <Tabs.Screen name="order-chat" options={{ href: null }} />
      <Tabs.Screen name="inbox" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="withdraw" options={{ href: null }} />
      <Tabs.Screen name="refund" options={{ href: null }} />
      <Tabs.Screen name="provider-earnings" options={{ href: null }} />
      <Tabs.Screen name="admin-orders" options={{ href: null }} />
      <Tabs.Screen name="admin-users" options={{ href: null }} />
      <Tabs.Screen name="admin-services" options={{ href: null }} />

      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.orders'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt-long" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('tabs.notifications'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="notifications" size={size} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', color: '#FFF' },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
