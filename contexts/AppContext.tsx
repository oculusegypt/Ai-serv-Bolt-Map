import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Order } from '../services/mockData';
import type { ChatSession } from '../services/chatEngineTypes';
import { initChatSession, processUserMessage } from '../services/chatEngine';
import { ServiceId, calculatePrice } from '../constants/config';
import { useAuth, UserRole } from './AuthContext';
import { useLocation } from './LocationContext';
import { useNotifications } from './NotificationsContext';
import { refreshProvidersCache } from '../services/providerDirectory';
import { sendOrderPush } from '../services/pushNotificationsService';
import { getProviderAvailability, setProviderAvailability, upsertProviderLocation } from '../services/providerLocations';
import { supabase } from '../services/supabaseClient';
import {
  createOrder as createOrderInDb,
  listOrdersForAdmin,
  listOrdersForCustomer,
  listOrdersForProvider,
  updateOrderStatus,
} from '../services/ordersService';
import { ORDER_STATUS_MAP } from '../services/mockData';

interface AppState {
  role: UserRole;
  // Customer
  orders: Order[];
  addOrder: (order: Order) => void;
  refreshOrders: () => Promise<void>;
  currentChat: ChatSession | null;
  startChat: (serviceId: ServiceId) => void;
  sendMessage: (text: string) => void;
  clearChat: () => void;
  userAddress: string;
  setUserAddress: (addr: string) => void;
  userName: string;
  // Provider
  isProviderAvailable: boolean;
  toggleProviderAvailability: () => void;
  providerRequests: Order[];
  acceptRequest: (orderId: string) => void;
  rejectRequest: (orderId: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Order creation from chat
  createOrderFromChat: () => Promise<Order | null>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const role: UserRole = user?.role || 'customer';
  const { regionId, location } = useLocation();
  const { pushInApp, ensurePermissions, registerPushToken } = useNotifications();

  const [orders, setOrders] = useState<Order[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [userAddress, setUserAddress] = useState('تحديد الموقع...');
  const [isProviderAvailable, setIsProviderAvailable] = useState(true);
  const [providerRequests, setProviderRequests] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const userName = user?.name || 'مستخدم';

  const lastOrderSnapshotRef = useRef<Record<string, { status: string; rating: number | null }>>({});
  const didInitialLoadRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    ensurePermissions().catch(() => {});
    registerPushToken().catch(() => {});
  }, [user?.id, ensurePermissions, registerPushToken]);

  useEffect(() => {
    // Reset state when switching users (or logging out) to avoid showing other user's data.
    setOrders([]);
    setProviderRequests([]);
    setCurrentChat(null);
    setSearchQuery('');
    setUserAddress('تحديد الموقع...');
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadProviderAvailability = async () => {
      if (!user?.id) return;
      if (role !== 'provider') return;

      const res = await getProviderAvailability(user.id);
      if (cancelled) return;

      if (res.ok && typeof res.isAvailable === 'boolean') {
        setIsProviderAvailable(res.isAvailable);
      } else {
        // If provider has no location row yet, keep default true.
        setIsProviderAvailable(true);
      }
    };

    loadProviderAvailability().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [role, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (role !== 'provider') return;
    if (!location) return;

    // Heartbeat: keep provider location fresh so map can treat provider as online.
    // Also persist availability along with location.
    const tick = () => {
      upsertProviderLocation({
        providerId: user.id,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        isAvailable: isProviderAvailable,
      }).catch(() => {
        // ignore
      });
    };

    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      clearInterval(id);
    };
  }, [isProviderAvailable, location, role, user?.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;

      if (role === 'admin') {
        const res = await listOrdersForAdmin();
        if (!cancelled) {
          setOrders(res.orders);
          setProviderRequests([]);
          lastOrderSnapshotRef.current = Object.fromEntries(res.orders.map((o) => [o.id, { status: o.status, rating: o.rating ?? null }]));
          didInitialLoadRef.current = true;
        }
        return;
      }

      if (role === 'provider') {
        const res = await listOrdersForProvider(user.id);
        if (!cancelled) {
          setProviderRequests(res.orders);
          setOrders([]);
          lastOrderSnapshotRef.current = Object.fromEntries(res.orders.map((o) => [o.id, { status: o.status, rating: o.rating ?? null }]));
          didInitialLoadRef.current = true;

          const pendingCount = res.orders.filter((o) => o.status === 'pending').length;
          if (pendingCount > 0) {
            pushInApp({
              title: 'طلبات معلّقة',
              body: `لديك ${pendingCount} طلب/طلبات بانتظار القبول`,
              read: false,
            }).catch(() => {});
          }
        }
        return;
      }

      const res = await listOrdersForCustomer(user.id);
      if (!cancelled) {
        setOrders(res.orders);
        setProviderRequests([]);
        lastOrderSnapshotRef.current = Object.fromEntries(res.orders.map((o) => [o.id, { status: o.status, rating: o.rating ?? null }]));
        didInitialLoadRef.current = true;
      }
    };

    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id, role]);

  const maybeNotifyOrdersChange = useCallback(
    async (nextOrders: Order[]) => {
      if (!didInitialLoadRef.current) return;

      const prev = lastOrderSnapshotRef.current;
      const nextMap: Record<string, { status: string; rating: number | null }> = Object.fromEntries(
        nextOrders.map((o) => [o.id, { status: o.status, rating: o.rating ?? null }])
      );

      const statusLabel = (s: string) => ORDER_STATUS_MAP[s]?.label || s;

      for (const o of nextOrders) {
        const prevSnap = prev[o.id];
        const prevStatus = prevSnap?.status;
        const prevRating = prevSnap?.rating ?? null;
        const nextRating = o.rating ?? null;

        // New order
        if (!prevStatus) {
          if (role === 'provider' && o.status === 'pending') {
            await pushInApp({
              title: 'طلب جديد',
              body: `وصل لك طلب جديد رقم ${o.orderNumber}`,
              read: false,
              orderId: o.id,
            });
          }
          continue;
        }

        // Rating was added (provider should be notified)
        if (role === 'provider' && prevRating == null && typeof nextRating === 'number') {
          await pushInApp({
            title: 'تقييم جديد',
            body: `تم تقييم الطلب ${o.orderNumber} بـ ${nextRating}/5`,
            read: false,
            orderId: o.id,
          });
        }

        // Status changed
        if (prevStatus !== o.status) {
          // Provider notifications: only payment submitted by customer.
          if (role === 'provider') {
            if (o.status === 'customer_paid') {
              await pushInApp({
                title: 'تأكيد الدفع',
                body: `العميل أكد دفع الطلب ${o.orderNumber}`,
                read: false,
                orderId: o.id,
              });
            }
          }

          // Customer notifications: provider progress updates (avoid notifying customer about their own payment submission step)
          if (role === 'customer') {
            if (o.status !== 'customer_paid') {
              const label = statusLabel(o.status);
              const title = 'تحديث حالة الطلب';
              const body = `الطلب ${o.orderNumber}: ${label}`;
              await pushInApp({ title, body, read: false, orderId: o.id });
            }
          }

          // Admin: keep generic status notifications
          if (role === 'admin') {
            const label = statusLabel(o.status);
            const title = 'تحديث حالة الطلب';
            const body = `الطلب ${o.orderNumber}: ${label}`;
            await pushInApp({ title, body, read: false, orderId: o.id });
          }
        }
      }

      lastOrderSnapshotRef.current = nextMap;
    },
    [pushInApp, role]
  );

  const refreshOrders = useCallback(async () => {
    if (!user?.id) return;

    if (role === 'admin') {
      const res = await listOrdersForAdmin();
      setOrders(res.orders);
      setProviderRequests([]);
      await maybeNotifyOrdersChange(res.orders);
      return;
    }

    if (role === 'provider') {
      const res = await listOrdersForProvider(user.id);
      setProviderRequests(res.orders);
      setOrders([]);
      await maybeNotifyOrdersChange(res.orders);
      return;
    }

    const res = await listOrdersForCustomer(user.id);
    setOrders(res.orders);
    setProviderRequests([]);
    await maybeNotifyOrdersChange(res.orders);
  }, [user?.id, role, maybeNotifyOrdersChange]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`orders-live-${role}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter:
            role === 'provider'
              ? `provider_id=eq.${user.id}`
              : role === 'customer'
                ? `customer_id=eq.${user.id}`
                : undefined,
        } as any,
        async () => {
          await refreshOrders();
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [refreshOrders, role, user?.id]);

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setProviderRequests((prev) => [
      { ...order, status: 'pending' as const },
      ...prev,
    ]);
  }, []);

  const startChat = useCallback((serviceId: ServiceId) => {
    // Load real providers into cache (no mock fallback). Chat engine reads from cache synchronously.
    refreshProvidersCache({
      serviceId,
      userCoord: location ? { latitude: location.latitude, longitude: location.longitude } : null,
    }).catch(() => {});
    const session = initChatSession(serviceId, regionId || null);
    setCurrentChat(session);
  }, [regionId, location]);

  const sendMessage = useCallback((text: string) => {
    setCurrentChat((prev) => {
      if (!prev) return prev;
      return processUserMessage(prev, text);
    });
  }, []);

  const clearChat = useCallback(() => {
    setCurrentChat(null);
  }, []);

  const createOrderFromChat = useCallback(async (): Promise<Order | null> => {
    if (!currentChat || !currentChat.orderNumber || !currentChat.selectedProvider) return null;
    
    // Check if user is authenticated before creating order
    if (!user?.id) {
      // Redirect to login screen
      router.replace('/auth');
      return null;
    }

    const totalPrice =
      currentChat.serviceId === 'cleaning' && typeof currentChat.estimatedTotal === 'number'
        ? currentChat.estimatedTotal
        : calculatePrice(
            currentChat.serviceId,
            currentChat.hours,
            currentChat.selectedExtras,
            currentChat.isUrgent
          ).total;

    const serviceNames: Record<string, string> = {
      cleaning: 'تنظيف المنزل',
      plumbing: 'سباكة',
      electrical: 'كهرباء',
      ac: 'صيانة مكيفات',
      painting: 'دهان وديكور',
      carpentry: 'نجارة وتركيب أثاث',
      pest: 'مكافحة حشرات',
      appliance: 'صيانة أجهزة منزلية',
      handyman: 'أعمال يدوية عامة',
      carpet: 'تنظيف سجاد وكنب وستائر',
    };

    const serviceName = serviceNames[currentChat.serviceId] || currentChat.serviceId;
    const scheduledDate = currentChat.scheduledDate || 'النهاردة';
    const scheduledTime = currentChat.scheduledTime || '10:00 ص';

    const res = await createOrderInDb({
      orderNumber: currentChat.orderNumber,
      customerId: user.id,
      providerId: currentChat.selectedProvider.id,
      serviceId: currentChat.serviceId,
      serviceName,
      totalPrice,
      address: userAddress,
      latitude: location?.latitude,
      longitude: location?.longitude,
      scheduledDate,
      scheduledTime,
    });

    if (!res.ok || !res.order) return null;

    const dbOrder: Order = {
      ...res.order,
      providerName: currentChat.selectedProvider?.name || '',
    };

    setOrders((prev) => [dbOrder, ...prev]);
    return dbOrder;
  }, [currentChat, user?.id, userAddress, location?.latitude, location?.longitude]);

  const toggleProviderAvailability = useCallback(() => {
    if (!user?.id) return;

    setIsProviderAvailable((prev) => {
      const next = !prev;

      // Persist availability immediately so map selection reflects it.
      setProviderAvailability({ providerId: user.id, isAvailable: next }).catch(() => {
        // ignore
      });

      // Ensure updated_at stays fresh if provider toggles without sending location.
      if (location) {
        upsertProviderLocation({
          providerId: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          isAvailable: next,
        }).catch(() => {
          // ignore
        });
      }

      return next;
    });
  }, [location, user?.id]);

  const acceptRequest = useCallback((orderId: string) => {
    // Initial busy policy: provider can't accept a new request if they already have any open order.
    // Open = any status except paid/cancelled.
    const hasAnotherOpen = providerRequests.some(
      (o) =>
        o.id !== orderId &&
        o.status !== 'paid' &&
        o.status !== 'cancelled'
    );
    if (hasAnotherOpen) {
      pushInApp({
        title: 'غير متاح الآن',
        body: 'لديك طلب جارٍ بالفعل. أكمل الطلب الحالي حتى الدفع ثم اقبل طلب جديد.',
        read: false,
      });
      return;
    }

    const oldStatus = providerRequests.find((o) => o.id === orderId)?.status ?? null;
    updateOrderStatus({ orderId, status: 'accepted' })
      .then(() => {
        sendOrderPush({ orderId, newStatus: 'accepted', oldStatus }).catch(() => {});
        refreshOrders();
      })
      .catch(() => {});
  }, [refreshOrders, providerRequests]);

  const rejectRequest = useCallback((orderId: string) => {
    const oldStatus = providerRequests.find((o) => o.id === orderId)?.status ?? null;
    updateOrderStatus({ orderId, status: 'cancelled' })
      .then(() => {
        sendOrderPush({ orderId, newStatus: 'cancelled', oldStatus }).catch(() => {});
        refreshOrders();
      })
      .catch(() => {});
  }, [refreshOrders, providerRequests]);

  return (
    <AppContext.Provider
      value={{
        role,
        orders,
        addOrder,
        refreshOrders,
        currentChat,
        startChat,
        sendMessage,
        clearChat,
        userAddress,
        setUserAddress,
        userName,
        isProviderAvailable,
        toggleProviderAvailability,
        providerRequests,
        acceptRequest,
        rejectRequest,
        searchQuery,
        setSearchQuery,
        createOrderFromChat,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
