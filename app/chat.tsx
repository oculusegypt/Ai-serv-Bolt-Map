import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeInDown,
} from 'react-native-reanimated';
import { SERVICES, PRICING, ServiceId, calculatePrice } from '../constants/config';
import { useApp } from '../contexts/AppContext';
import type { ChatMessage } from '../services/chatEngineTypes';
import { getQuickOptionsForRegion, warmServiceFlow, type QuickOption, type ChatUiState } from '../services/chatFlows';
import { useLocation } from '../contexts/LocationContext';
import type { Provider } from '../services/mockData';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MapView: any = Platform.OS === 'web' ? null : require('react-native-maps').default;
const Marker: any = Platform.OS === 'web' ? null : require('react-native-maps').Marker;

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { currentChat, sendMessage, clearChat, createOrderFromChat } = useApp();
  const { regionId } = useLocation();
  const { theme, shadows } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);
  const [inputText, setInputText] = useState('');
  const [orderCreated, setOrderCreated] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const sendScale = useSharedValue(1);

  const chatSessionKey = useMemo(() => {
    const firstMsgId = (currentChat as any)?.messages?.[0]?.id as string | undefined;
    const serviceId = (currentChat as any)?.serviceId as string | undefined;
    return serviceId && firstMsgId ? `${serviceId}:${firstMsgId}` : '';
  }, [currentChat]);

  useEffect(() => {
    setOrderCreated(false);
    setCreatedOrder(null);
  }, [chatSessionKey]);

  const service = currentChat
    ? SERVICES.find((s) => s.id === currentChat.serviceId)
    : null;

  useEffect(() => {
    if (currentChat?.messages.length) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentChat?.messages.length]);

  useEffect(() => {
    const serviceId = (currentChat?.serviceId as unknown as string | undefined) || undefined;
    if (!serviceId) return;
    warmServiceFlow(serviceId, regionId || null).catch(() => {});
  }, [currentChat?.serviceId, regionId]);

  // Auto-create order when chatbot confirms
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentChat || orderCreated || !currentChat.orderNumber || !currentChat.selectedProvider) return;
      // Only create the DB order AFTER the user confirms (state transitions away from confirm_order).
      if (currentChat.state === 'confirm_order') return;
      if (currentChat.state !== 'order_created' && currentChat.state !== 'handover') return;
      const order = await createOrderFromChat();
      if (cancelled) return;
      if (order) {
        setOrderCreated(true);
        setCreatedOrder(order);

        // Close the current chat after sending the order so reopening the same service starts fresh.
        clearChat();
        router.replace({ pathname: '/order-detail', params: { orderId: order.id } } as any);
      }
    };
    run().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentChat, orderCreated, createOrderFromChat, clearChat, router]);

  const previewInvoiceOrder = useMemo(() => {
    if (!currentChat) return null;
    if (currentChat.state !== 'confirm_order' && currentChat.state !== 'confirm_order_final') return null;

    const serviceName = SERVICES.find((s) => s.id === currentChat.serviceId)?.name || String(currentChat.serviceId);

    // Cleaning:
    // - confirm_order: preliminary invoice BEFORE choosing provider/order number
    // - confirm_order_final: final invoice AFTER choosing provider/order number
    if (currentChat.serviceId === 'cleaning') {
      const totalPrice =
        typeof currentChat.estimatedTotal === 'number'
          ? currentChat.estimatedTotal
          : calculatePrice(
              currentChat.serviceId,
              currentChat.hours,
              currentChat.selectedExtras,
              currentChat.isUrgent
            ).total;

      const typeLabel =
        currentChat.cleaningType === 'basic'
          ? 'أساسي'
          : currentChat.cleaningType === 'deep'
            ? 'عميق'
            : currentChat.cleaningType === 'move'
              ? 'انتقال/قبل السكن'
              : '—';

      const items: { label: string; value: string }[] = [
        { label: 'نوع التنظيف', value: typeLabel },
        { label: 'عدد الغرف', value: String(currentChat.roomsCount ?? '—') },
        { label: 'عدد الحمامات', value: String(currentChat.bathroomsCount ?? '—') },
        {
          label: 'إضافات',
          value:
            (currentChat.selectedExtras || []).length > 0
              ? (currentChat.selectedExtras || []).join('، ')
              : 'لا يوجد',
        },
        { label: 'التوقيت', value: `${currentChat.scheduledDate || '—'} - ${currentChat.scheduledTime || '—'}` },
      ];

      const isFinal = currentChat.state === 'confirm_order_final';
      const orderNumber = isFinal ? String(currentChat.orderNumber || '—') : '—';
      const providerName = isFinal
        ? String((currentChat.selectedProvider as any)?.name || '—')
        : 'سيتم اختيار الفني بعد التأكيد';

      return {
        isPreview: true,
        orderNumber,
        serviceName,
        scheduledDate: currentChat.scheduledDate,
        scheduledTime: currentChat.scheduledTime,
        providerName,
        totalPrice,
        items,
      };
    }

    // Other services: keep existing condition
    if (!currentChat.orderNumber || !currentChat.selectedProvider) return null;

    const totalPrice =
      calculatePrice(
        currentChat.serviceId,
        currentChat.hours,
        currentChat.selectedExtras,
        currentChat.isUrgent
      ).total;

    return {
      isPreview: true,
      orderNumber: currentChat.orderNumber,
      serviceName,
      scheduledDate: currentChat.scheduledDate,
      scheduledTime: currentChat.scheduledTime,
      providerName: currentChat.selectedProvider.name,
      totalPrice,
    };
  }, [currentChat]);

  const handleSend = () => {
    if (isGuidedState) return;
    if (!inputText.trim()) return;
    Haptics.selectionAsync();
    sendScale.value = withSequence(
      withSpring(0.85, { duration: 100 }),
      withSpring(1, { duration: 200 })
    );
    sendMessage(inputText.trim());
    setInputText('');
    Keyboard.dismiss();
  };

  const sendBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const quickReplies = getQuickOptionsForRegion(
    (currentChat?.serviceId as unknown as string | undefined) || undefined,
    (currentChat?.state as ChatUiState) || 'greeting',
    regionId || null
  );

  const effectiveQuickReplies: QuickOption[] =
    currentChat?.state === 'confirm_order' || currentChat?.state === 'confirm_order_final' ? [] : quickReplies;

  const isGuidedState =
    quickReplies.length > 0 &&
    currentChat?.state !== 'handover' &&
    currentChat?.state !== 'order_created' &&
    currentChat?.state !== 'confirm_order_final';

  const goBackSafe = () => {
    router.replace('/(tabs)/inbox');
  };

  if (!currentChat || !service) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.emptyContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=400&h=400&fit=crop' }}
            style={styles.emptyImage}
            contentFit="contain"
          />
          <Text style={styles.emptyTitle}>{t('chat.empty_title')}</Text>
          <Pressable style={styles.emptyBtn} onPress={goBackSafe}>
            <Text style={styles.emptyBtnText}>{t('chat.empty_cta')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <Pressable
          style={styles.closeBtn}
          onPress={() => {
            clearChat();
            setOrderCreated(false);
            goBackSafe();
          }}
        >
          <MaterialIcons name="close" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.chatHeaderInfo}>
          <View style={[styles.chatHeaderIcon, { backgroundColor: service.colorLight }]}>
            <Image source={service.image} style={styles.chatHeaderIconImg} contentFit="cover" />
          </View>
          <View style={styles.chatHeaderText}>
            <Text style={styles.chatHeaderTitle}>{service.name}</Text>
            <Text style={styles.chatHeaderSubtitle}>
              {currentChat.state === 'handover'
                ? `${currentChat.selectedProvider?.name} • متصل`
                : t('chat.assistant_subtitle')}
            </Text>
          </View>
        </View>
        {orderCreated ? (
          <Pressable
            style={styles.viewOrderBtn}
            onPress={() => {
              clearChat();
              setOrderCreated(false);
              setCreatedOrder(null);
              router.replace('/(tabs)/orders');
            }}
          >
            <MaterialIcons name="receipt-long" size={18} color={theme.primary} />
            <Text style={styles.viewOrderText}>عرض الطلب</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.chatHeaderAction}>
            <MaterialIcons name="more-vert" size={22} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Order Created Banner */}
      {orderCreated && (
        <Pressable
          style={styles.orderBanner}
          onPress={() => {
            clearChat();
            setOrderCreated(false);
            setCreatedOrder(null);
            router.replace('/(tabs)/orders');
          }}
        >
          <MaterialIcons name="check-circle" size={20} color={theme.success} />
          <Text style={styles.orderBannerText}>تم إرسال طلبك بنجاح • اضغط لعرض الطلب</Text>
        </Pressable>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={tabBarHeight}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Service intro card */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.introCard}>
            <Image source={service.image} style={styles.introImage} contentFit="cover" />
            <Text style={styles.introTitle}>{service.name}</Text>
            <Text style={styles.introSubtitle}>
              من {PRICING[service.id].baseFee} ج.م • الحد الأدنى {PRICING[service.id].minimumHours} ساعة
            </Text>
          </Animated.View>

          {/* Messages */}
          {currentChat.messages.map((m: ChatMessage, idx: number) => (
            <MessageBubble
              key={`${m.id}_${idx}`}
              message={m}
              index={idx}
              isLast={idx === currentChat.messages.length - 1}
              chatState={currentChat.state}
              uiTheme={theme}
              uiStyles={styles}
              onSendQuick={(text) => sendMessage(text)}
              onSelectProvider={(text) => sendMessage(text)}
              onRequestEdit={() => {
                Haptics.selectionAsync();
                Alert.alert(
                  t('chat.edit_order_title'),
                  t('chat.edit_order_body'),
                  [
                    { text: t('chat.cancel'), style: 'cancel' },
                    {
                      text: t('chat.edit'),
                      onPress: () => {
                        sendMessage('تعديل');
                      },
                    },
                  ]
                );
              }}
            />
          ))}

          {previewInvoiceOrder ? (
            <InvoiceBubble
              index={currentChat.messages.length + 0.5}
              order={previewInvoiceOrder}
              uiTheme={theme}
              uiStyles={styles}
              onTrack={() => {}}
              showTrack={false}
              onConfirm={() => {
                Haptics.selectionAsync();
                sendMessage('تأكيد');
              }}
              onEdit={() => {
                Haptics.selectionAsync();
                sendMessage('تعديل');
              }}
            />
          ) : null}

          {orderCreated && createdOrder ? (
            <InvoiceBubble
              index={currentChat.messages.length + 1}
              order={createdOrder}
              uiTheme={theme}
              uiStyles={styles}
              onTrack={() => {
                Haptics.selectionAsync();
                clearChat();
                setOrderCreated(false);
                setCreatedOrder(null);
                router.push({ pathname: '/order-detail', params: { orderId: createdOrder.id } });
              }}
              showTrack
            />
          ) : null}
        </ScrollView>

        {/* Quick Replies */}
        {effectiveQuickReplies.length > 0 && (
          <View style={styles.quickOptionsWrap}>
            <View style={styles.quickOptionsGrid}>
              {effectiveQuickReplies.map((opt: QuickOption, i: number) => (
                <Pressable
                  key={i}
                  style={[
                    styles.quickOptionCard,
                    styles.quickOptionCardGrid,
                    currentChat?.state === 'confirm_order' && opt.text.includes('نعم')
                      ? styles.quickOptionCardPrimary
                      : null,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    sendMessage(opt.text);
                  }}
                >
                  <View style={styles.quickOptionTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.quickOptionTitle,
                          currentChat?.state === 'confirm_order' && opt.text.includes('نعم')
                            ? styles.quickOptionTitleOnPrimary
                            : null,
                        ]}
                      >
                        {opt.text}
                      </Text>
                      {opt.subtitle ? (
                        <Text
                          style={[
                            styles.quickOptionSubtitle,
                            currentChat?.state === 'confirm_order' && opt.text.includes('نعم')
                              ? styles.quickOptionSubtitleOnPrimary
                              : null,
                          ]}
                        >
                          {opt.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {opt.infoText ? (
                      <Pressable
                        style={styles.quickOptionInfoBtn}
                        onPress={() => {
                          Haptics.selectionAsync();
                          Alert.alert(opt.infoTitle || 'تفاصيل', opt.infoText);
                        }}
                      >
                        <MaterialIcons name="info-outline" size={18} color={theme.textSecondary} />
                      </Pressable>
                    ) : null}
                  </View>

                  {opt.priceText ? (
                    <Text
                      style={[
                        styles.quickOptionPrice,
                        currentChat?.state === 'confirm_order' && opt.text.includes('نعم')
                          ? styles.quickOptionPriceOnPrimary
                          : null,
                      ]}
                    >
                      {opt.priceText}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: 8 }]}>
          <Pressable style={styles.attachBtn}>
            <MaterialIcons name="attach-file" size={22} color={theme.textSecondary} />
          </Pressable>
          <Pressable style={styles.cameraBtn}>
            <MaterialIcons name="camera-alt" size={22} color={theme.textSecondary} />
          </Pressable>
          <TextInput
            style={styles.chatInput}
            placeholder={isGuidedState ? t('chat.input_placeholder_guided') : t('chat.input_placeholder_free')}
            placeholderTextColor={theme.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            textAlign="right"
            multiline
            editable={!isGuidedState}
            onSubmitEditing={handleSend}
          />
          <AnimatedPressable
            style={[styles.sendBtn, sendBtnStyle]}
            onPress={handleSend}
            disabled={!inputText.trim() || isGuidedState}
          >
            <MaterialIcons name="send" size={20} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  index,
  isLast,
  chatState,
  uiTheme,
  uiStyles,
  onSendQuick,
  onSelectProvider,
  onRequestEdit,
}: {
  message: ChatMessage;
  index: number;
  isLast: boolean;
  chatState: string;
  uiTheme: any;
  uiStyles: any;
  onSendQuick: (text: string) => void;
  onSelectProvider: (text: string) => void;
  onRequestEdit: () => void;
}) {
  const isBot = message.sender === 'bot';
  const isSystem = message.sender === 'system';

  if (message.type === 'providers' && Array.isArray(message.data)) {
    const providers = message.data as Provider[];
    const pinProviders = providers.filter((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number');
    const center =
      pinProviders[0] && pinProviders[0].latitude && pinProviders[0].longitude
        ? { latitude: pinProviders[0].latitude!, longitude: pinProviders[0].longitude! }
        : { latitude: 30.0444, longitude: 31.2357 };

    return (
      <Animated.View
        entering={FadeInDown.delay(Math.min(index * 50, 200)).duration(300)}
        style={[uiStyles.messageBubbleRow, uiStyles.botRow]}
      >
        <View style={uiStyles.botAvatarWrap}>
          <MaterialIcons name="smart-toy" size={18} color={uiTheme.primary} />
        </View>
        <View style={[uiStyles.messageBubble, uiStyles.botBubble, uiStyles.providersCard]}>
          <View style={uiStyles.providersMapWrap}>
            {Platform.OS === 'web' || !MapView ? (
              <View style={uiStyles.providersMapWebFallback} />
            ) : (
              <MapView
                style={uiStyles.providersMap}
                initialRegion={{
                  latitude: center.latitude,
                  longitude: center.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {pinProviders.map((p) => (
                  <Marker
                    key={p.id}
                    coordinate={{ latitude: p.latitude as number, longitude: p.longitude as number }}
                    title={p.name}
                  />
                ))}
              </MapView>
            )}
          </View>

          <View style={uiStyles.providersHeaderRow}>
            <View style={uiStyles.providersHeaderTitleRow}>
              <MaterialIcons name="near-me" size={16} color={uiTheme.primary} />
              <Text style={uiStyles.providersHeaderTitle}>الفنيين المتاحين</Text>
            </View>
            <View style={uiStyles.providersCountPill}>
              <Text style={uiStyles.providersCountText}>{providers.length}</Text>
            </View>
          </View>

          <View style={uiStyles.providersList}>
            {providers.map((p, i) => (
              <Pressable
                key={p.id}
                style={uiStyles.providerRow}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelectProvider(String(i + 1));
                }}
              >
                <View style={uiStyles.providerAvatarWrap}>
                  <Image source={{ uri: p.avatar }} style={uiStyles.providerAvatar} contentFit="cover" />
                </View>
                <View style={uiStyles.providerInfo}>
                  <Text style={uiStyles.providerName}>{p.name}</Text>
                  <View style={uiStyles.providerMetaRow}>
                    <View style={uiStyles.providerBadge}>
                      <MaterialIcons name="star" size={14} color={uiTheme.warning} />
                      <Text style={uiStyles.providerBadgeText}>{p.rating}</Text>
                    </View>
                    <View style={uiStyles.providerBadgeMuted}>
                      <MaterialIcons name="place" size={14} color={uiTheme.textSecondary} />
                      <Text style={uiStyles.providerBadgeMutedText}>{p.distance}</Text>
                    </View>
                    <View style={uiStyles.providerBadgeMuted}>
                      <MaterialIcons name="schedule" size={14} color={uiTheme.textSecondary} />
                      <Text style={uiStyles.providerBadgeMutedText}>{p.responseTime}</Text>
                    </View>
                  </View>
                </View>
                <View style={uiStyles.providerPickWrap}>
                  <MaterialIcons name="chevron-left" size={22} color={uiTheme.textSecondary} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.View>
    );
  }

  if (isSystem) {
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(300)} style={uiStyles.systemMessage}>
        <Text style={uiStyles.systemMessageText}>{message.text}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 50, 200)).duration(300)}
      style={[uiStyles.messageBubbleRow, isBot ? uiStyles.botRow : uiStyles.userRow]}
    >
      {isBot && (
        <View style={uiStyles.botAvatarWrap}>
          <MaterialIcons name="smart-toy" size={18} color={uiTheme.primary} />
        </View>
      )}
      <Pressable
        onLongPress={() => {
          if (!isBot && !isSystem) onRequestEdit();
        }}
        delayLongPress={300}
        style={[uiStyles.messageBubble, isBot ? uiStyles.botBubble : uiStyles.userBubble]}
      >
        <Text style={[uiStyles.messageText, isBot ? uiStyles.botMessageText : uiStyles.userMessageText]}>
          {message.text}
        </Text>

        <Text
          style={[
            uiStyles.messageTime,
            isBot ? { color: uiTheme.textTertiary } : { color: 'rgba(255,255,255,0.6)' },
          ]}
        >
          {message.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function InvoiceBubble({
  index,
  order,
  uiTheme,
  uiStyles,
  onTrack,
  showTrack,
  onConfirm,
  onEdit,
}: {
  index: number;
  order: any;
  uiTheme: any;
  uiStyles: any;
  onTrack: () => void;
  showTrack?: boolean;
  onConfirm?: () => void;
  onEdit?: () => void;
}) {
  const canTrack = showTrack !== false;
  const isPreview = Boolean(order?.isPreview) && !canTrack;
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 50, 200)).duration(300)}
      style={[uiStyles.messageBubbleRow, uiStyles.botRow]}
    >
      <View style={uiStyles.botAvatarWrap}>
        <MaterialIcons name="receipt-long" size={18} color={uiTheme.primary} />
      </View>
      <View style={[uiStyles.messageBubble, uiStyles.botBubble, uiStyles.invoiceCard]}>
        <View style={uiStyles.invoiceHeaderRow}>
          <Text style={uiStyles.invoiceTitle}>فاتورة الطلب</Text>
          <View style={uiStyles.invoiceBadge}>
            <MaterialIcons name="payments" size={16} color={uiTheme.success} />
            <Text style={uiStyles.invoiceBadgeText}>كاش</Text>
          </View>
        </View>

        <View style={uiStyles.invoiceRow}>
          <Text style={uiStyles.invoiceLabel}>رقم الطلب</Text>
          {canTrack ? (
            <Pressable onPress={onTrack}>
              <Text style={uiStyles.invoiceValueLink}>{order.orderNumber}</Text>
            </Pressable>
          ) : (
            <Text style={uiStyles.invoiceValue}>{order.orderNumber}</Text>
          )}
        </View>
        <View style={uiStyles.invoiceRow}>
          <Text style={uiStyles.invoiceLabel}>الخدمة</Text>
          <Text style={uiStyles.invoiceValue}>{order.serviceName}</Text>
        </View>
        <View style={uiStyles.invoiceRow}>
          <Text style={uiStyles.invoiceLabel}>الموعد</Text>
          <Text style={uiStyles.invoiceValue}>{order.scheduledDate} - {order.scheduledTime}</Text>
        </View>
        <View style={uiStyles.invoiceRow}>
          <Text style={uiStyles.invoiceLabel}>الفني</Text>
          <Text style={uiStyles.invoiceValue}>{order.providerName}</Text>
        </View>

        {Array.isArray(order.items) && order.items.length > 0 ? (
          <View style={uiStyles.invoiceItemsWrap}>
            {order.items.map((it: any, i: number) => (
              <View key={`${it?.label}_${i}`} style={uiStyles.invoiceItemRow}>
                <Text style={uiStyles.invoiceItemName}>{it?.label}</Text>
                <Text style={uiStyles.invoiceItemValue}>{it?.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={uiStyles.invoiceTotalRow}>
          <Text style={uiStyles.invoiceTotalLabel}>الإجمالي</Text>
          <Text style={uiStyles.invoiceTotalValue}>{order.totalPrice} ج.م</Text>
        </View>

        {isPreview ? (
          <View style={uiStyles.invoiceActionsRow}>
            <Pressable
              style={[uiStyles.invoiceActionBtn, uiStyles.invoiceActionBtnPrimary]}
              onPress={() => {
                if (typeof onConfirm === 'function') onConfirm();
              }}
            >
              <Text style={uiStyles.invoiceActionBtnTextPrimary}>تأكيد</Text>
            </Pressable>
            <Pressable
              style={[uiStyles.invoiceActionBtn, uiStyles.invoiceActionBtnSecondary]}
              onPress={() => {
                if (typeof onEdit === 'function') onEdit();
              }}
            >
              <Text style={uiStyles.invoiceActionBtnTextSecondary}>تعديل</Text>
            </Pressable>
          </View>
        ) : null}

        {canTrack ? (
          <Pressable style={uiStyles.invoiceTrackBtn} onPress={onTrack}>
            <MaterialIcons name="timeline" size={18} color="#FFF" />
            <Text style={uiStyles.invoiceTrackBtnText}>تتبع الطلب</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const createStyles = (theme: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderIconImg: {
    width: 40,
    height: 40,
  },
  chatHeaderText: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
    textAlign: 'right',
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'right',
  },
  chatHeaderAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOrderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOrderText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.primary,
  },
  orderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  orderBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
    textAlign: 'right',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  quickOptionsWrap: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  quickOptionsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    justifyContent: 'flex-end',
  },
  quickOptionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  quickOptionCard: {
    width: 240,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  quickOptionCardGrid: {
    width: '48%',
  },
  quickOptionCardPrimary: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  quickOptionTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
  },
  quickOptionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.textPrimary,
    textAlign: 'right',
  },
  quickOptionTitleOnPrimary: {
    color: theme.textOnPrimary,
  },
  quickOptionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'right',
    lineHeight: 18,
  },
  quickOptionSubtitleOnPrimary: {
    color: 'rgba(255,255,255,0.9)',
  },
  quickOptionPrice: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800',
    color: theme.primary,
    textAlign: 'right',
  },
  quickOptionPriceOnPrimary: {
    color: 'rgba(255,255,255,0.95)',
  },
  quickOptionInfoBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  introCard: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 12,
  },
  introImage: {
    width: 80,
    height: 80,
    borderRadius: 24,
    marginBottom: 8,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: 8,
    maxWidth: '100%',
  },
  botRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  userRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  botAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginTop: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '85%',
    flexShrink: 1,
  },
  botBubble: {
    backgroundColor: theme.chatBotBubble,
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: theme.chatUserBubble,
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    writingDirection: 'rtl',
  },
  botMessageText: {
    color: theme.chatBotText,
    textAlign: 'right',
  },
  userMessageText: {
    color: theme.chatUserText,
    textAlign: 'right',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'left',
  },
  inlineConfirmRow: {
    marginTop: 10,
    flexDirection: 'row-reverse',
    gap: 10,
  },
  inlineConfirmBtn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  inlineConfirmBtnPrimary: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  inlineConfirmBtnSecondary: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
  },
  inlineConfirmBtnTextPrimary: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.textOnPrimary,
    textAlign: 'center',
  },
  inlineConfirmBtnTextSecondary: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.textPrimary,
    textAlign: 'center',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: theme.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  invoiceHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  invoiceTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  invoiceBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#D1FAE5',
  },
  invoiceBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  invoiceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  invoiceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  invoiceValue: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    flexShrink: 1,
    marginLeft: 10,
  },
  invoiceValueLink: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  invoiceTotalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  invoiceTotalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  invoiceTotalValue: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  invoiceTrackBtn: {
    marginTop: 12,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  invoiceTrackBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'right',
  },
  invoiceItemsWrap: { marginTop: 10, gap: 6 },
  invoiceItemRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  invoiceItemName: { fontSize: 12, fontWeight: '800', color: theme.textSecondary, textAlign: 'right' },
  invoiceItemValue: { flex: 1, fontSize: 12, fontWeight: '800', color: theme.textPrimary, textAlign: 'left', marginLeft: 10 },
  invoiceActionsRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 12 },
  invoiceActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  invoiceActionBtnPrimary: { backgroundColor: theme.primary, borderColor: theme.primary },
  invoiceActionBtnSecondary: { backgroundColor: theme.surface, borderColor: theme.border },
  invoiceActionBtnTextPrimary: { fontSize: 13, fontWeight: '900', color: theme.textOnPrimary, textAlign: 'center' },
  invoiceActionBtnTextSecondary: { fontSize: 13, fontWeight: '900', color: theme.textPrimary, textAlign: 'center' },
  quickRepliesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  quickReplyBtn: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 6,
  },
  attachBtn: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.textPrimary,
    maxHeight: 100,
    textAlign: 'right',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providersCard: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    width: 320,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.border,
    ...shadows.card,
  },
  providersMapWrap: {
    width: '100%',
    height: 190,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.surfaceSecondary,
  },
  providersMapWebFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.surfaceSecondary,
  },
  providersMap: {
    width: '100%',
    height: '100%',
  },
  providersHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  providersHeaderTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  providersHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textPrimary,
    textAlign: 'right',
  },
  providersCountPill: {
    minWidth: 26,
    height: 20,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providersCountText: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.primary,
  },
  providersList: {
    gap: theme.spacing.sm,
  },
  providerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  providerAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: theme.surfaceSecondary,
  },
  providerAvatar: {
    width: 36,
    height: 36,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textPrimary,
    textAlign: 'right',
  },
  providerMetaRow: {
    marginTop: 3,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.warningLight,
  },
  providerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textPrimary,
    textAlign: 'right',
  },
  providerBadgeMuted: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surfaceSecondary,
  },
  providerBadgeMutedText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
    textAlign: 'right',
  },
  providerPickWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  invoiceCard: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    width: 320,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.border,
    ...shadows.card,
  },
});
