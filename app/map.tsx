import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { theme, shadows } from '../constants/theme';
import { SERVICES, ServiceId, PRICING } from '../constants/config';
import { useLocation } from '../contexts/LocationContext';
import { getMapProvidersForServiceAsync, getDistanceKm, MapProvider } from '../services/mapProviders';
import { useApp } from '../contexts/AppContext';

const MapView: any = Platform.OS === 'web' ? null : require('react-native-maps').default;
const Marker: any = Platform.OS === 'web' ? null : require('react-native-maps').Marker;
const PROVIDER_GOOGLE: any = Platform.OS === 'web' ? null : require('react-native-maps').PROVIDER_GOOGLE;

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const { location } = useLocation();
  const { startChat } = useApp();
  const [selectedProvider, setSelectedProvider] = useState<MapProvider | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  const service = SERVICES.find((s) => s.id === serviceId);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!serviceId) {
        setProviders([]);
        return;
      }
      setProvidersLoading(true);
      const list = await getMapProvidersForServiceAsync(serviceId as ServiceId);
      if (!cancelled) setProviders(list);
      if (!cancelled) setProvidersLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  const providersWithDistance = useMemo(() => {
    if (!location) return providers.map((p) => ({ ...p, distanceKm: 0 }));
    return providers
      .map((p) => ({
        ...p,
        distanceKm: getDistanceKm(location.latitude, location.longitude, p.latitude, p.longitude),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [providers, location]);

  const userLat = location?.latitude || 30.0444;
  const userLng = location?.longitude || 31.2357;

  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleBookProvider = (provider: MapProvider) => {
    Haptics.selectionAsync();
    if (serviceId) {
      startChat(serviceId as ServiceId);
      router.push('/(tabs)/chat');
    }
  };

  const goBackSafe = () => {
    try {
      if ((router as any).canGoBack?.()) {
        router.back();
        return;
      }
    } catch {
      // ignore
    }
    router.replace('/(tabs)');
  };

  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>خدمة غير موجودة</Text>
          <Pressable onPress={goBackSafe} style={styles.backBtnInner}>
            <Text style={{ color: '#FFF', fontWeight: '700' }}>رجوع</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={goBackSafe}>
          <MaterialIcons name="arrow-forward" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{service.name}</Text>
          <Text style={styles.headerSubtitle}>
            {providersLoading ? 'جاري تحميل الفنيين...' : `${providersWithDistance.length} فني متاح`}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Map Area */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <WebMap
            userLat={userLat}
            userLng={userLng}
            providers={providersWithDistance}
            onSelectProvider={setSelectedProvider}
            selectedId={selectedProvider?.id}
          />
        ) : (
          <MapView
            style={styles.nativeMap}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: userLat,
              longitude: userLng,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            }}
            showsUserLocation
            showsMyLocationButton
            onMapReady={() => setMapReady(true)}
          >
            <Marker
              coordinate={{ latitude: userLat, longitude: userLng }}
              title="موقعك"
            >
              <View style={styles.userMarker}>
                <MaterialIcons name="my-location" size={14} color="#FFF" />
              </View>
            </Marker>

            {providersWithDistance.map((p) => (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                title={p.name}
                onPress={() => setSelectedProvider(p)}
              >
                <View
                  style={[
                    styles.providerMarker,
                    { backgroundColor: selectedProvider?.id === p.id ? theme.primary : theme.secondary },
                  ]}
                >
                  <MaterialIcons name="person-pin" size={14} color="#FFF" />
                </View>
              </Marker>
            ))}
          </MapView>
        )}

        {/* Location Badge */}
        <View style={styles.locationBadge}>
          <MaterialIcons name="my-location" size={16} color={theme.primary} />
          <Text style={styles.locationBadgeText} numberOfLines={1}>
            {location?.address || 'تحديد الموقع...'}
          </Text>
        </View>
      </View>

      {/* Selected Provider Card */}
      {selectedProvider ? (
        <Animated.View entering={FadeInUp.duration(300)} style={[styles.selectedCard, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.selectedHeader}>
            <Image source={{ uri: selectedProvider.avatar }} style={styles.selectedAvatar} contentFit="cover" />
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName}>{selectedProvider.name}</Text>
              <View style={styles.selectedStatsRow}>
                <MaterialIcons name="star" size={14} color="#F59E0B" />
                <Text style={styles.selectedRating}>{selectedProvider.rating}</Text>
                <Text style={styles.selectedReviews}>({selectedProvider.reviewCount})</Text>
                <Text style={styles.selectedDivider}>•</Text>
                <MaterialIcons name="location-on" size={14} color={theme.textSecondary} />
                <Text style={styles.selectedDistance}>
                  {(selectedProvider as any).distanceKm || '?'} كم
                </Text>
              </View>
              <Text style={styles.selectedJobs}>{selectedProvider.completedJobs} طلب مكتمل • {selectedProvider.responseTime}</Text>
            </View>
            <Pressable style={styles.closeSelectedBtn} onPress={() => setSelectedProvider(null)}>
              <MaterialIcons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.selectedPriceRow}>
            <Text style={styles.selectedPriceLabel}>السعر يبدأ من</Text>
            <Text style={styles.selectedPrice}>
              {Math.round(PRICING[serviceId as ServiceId].baseFee * selectedProvider.priceModifier)} ج.م
            </Text>
          </View>
          <Pressable style={styles.bookBtn} onPress={() => handleBookProvider(selectedProvider)}>
            <MaterialIcons name="chat" size={20} color="#FFF" />
            <Text style={styles.bookBtnText}>احجز مع {selectedProvider.name}</Text>
          </Pressable>
        </Animated.View>
      ) : (
        /* Provider List */
        <View style={[styles.listContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>الفنيين المتاحين</Text>
            <Text style={styles.listCount}>{providersWithDistance.length}</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {providersWithDistance.map((provider) => (
              <Pressable
                key={provider.id}
                style={styles.providerListCard}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedProvider(provider);
                }}
              >
                <Image source={{ uri: provider.avatar }} style={styles.listAvatar} contentFit="cover" />
                <View style={styles.listInfo}>
                  <Text style={styles.listName}>{provider.name}</Text>
                  <View style={styles.listMetaRow}>
                    <MaterialIcons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.listRating}>{provider.rating}</Text>
                    <Text style={styles.listSep}>•</Text>
                    <Text style={styles.listDistance}>{provider.distanceKm} كم</Text>
                    <Text style={styles.listSep}>•</Text>
                    <Text style={styles.listTime}>{provider.responseTime}</Text>
                  </View>
                </View>
                <View style={styles.listPriceWrap}>
                  <Text style={styles.listPrice}>
                    {Math.round(PRICING[serviceId as ServiceId].baseFee * provider.priceModifier)} ج.م
                  </Text>
                  <MaterialIcons name="arrow-back-ios" size={14} color={theme.textTertiary} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// Web Map using Leaflet via iframe
function WebMap({
  userLat,
  userLng,
  providers,
  onSelectProvider,
  selectedId,
}: {
  userLat: number;
  userLng: number;
  providers: (MapProvider & { distanceKm: number })[];
  onSelectProvider: (p: MapProvider) => void;
  selectedId?: string;
}) {
  const markersJs = providers
    .map(
      (p) =>
        `L.marker([${p.latitude},${p.longitude}],{icon:provIcon}).bindPopup('<b>${p.name}</b><br>⭐ ${p.rating} | ${p.distanceKm} كم').on('click',function(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('${p.id}')});`
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body{margin:0}#map{width:100%;height:100vh}</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map').setView([${userLat},${userLng}],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'OpenStreetMap',maxZoom:18
}).addTo(map);
L.marker([${userLat},${userLng}],{icon:L.divIcon({html:'<div style="background:#F97316;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(map).bindPopup('موقعك الحالي');
var provIcon=L.divIcon({html:'<div style="background:#0D9488;width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',iconSize:[16,16],iconAnchor:[8,8]});
${markersJs}
</script>
</body>
</html>`;

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <iframe
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="map"
        />
      </View>
    );
  }

  return (
    <View style={[styles.nativeMapFallback, { flex: 1 }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnInner: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  mapContainer: {
    width: '100%',
    height: 360,
    backgroundColor: theme.surfaceSecondary,
    position: 'relative',
  },
  nativeMap: {
    width: '100%',
    height: '100%',
  },
  userMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  providerMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userDot: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    top: '45%',
    left: '45%',
    borderWidth: 3,
    borderColor: '#FFF',
    ...shadows.cardElevated,
  },
  providerDot: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    ...shadows.card,
  },
  nativeMapFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceSecondary,
  },
  locationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    ...shadows.cardElevated,
    maxWidth: 250,
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  selectedCard: {
    backgroundColor: theme.surface,
    padding: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadows.modal,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  selectedAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.textPrimary,
    textAlign: 'right',
  },
  selectedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  selectedRating: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  selectedReviews: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  selectedDivider: {
    fontSize: 12,
    color: theme.textTertiary,
    marginHorizontal: 2,
  },
  selectedDistance: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  selectedJobs: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  closeSelectedBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
    marginBottom: 12,
  },
  selectedPriceLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  selectedPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.primary,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 16,
  },
  bookBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  listContainer: {
    flex: 1,
    backgroundColor: theme.backgroundSecondary,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
    textAlign: 'right',
  },
  listCount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.primary,
    backgroundColor: theme.primaryFaded,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  providerListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    ...shadows.card,
  },
  listAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
    textAlign: 'right',
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  listRating: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  listSep: {
    fontSize: 10,
    color: theme.textTertiary,
  },
  listDistance: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  listTime: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  listPriceWrap: {
    alignItems: 'center',
    gap: 4,
  },
  listPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.primary,
  },
});
