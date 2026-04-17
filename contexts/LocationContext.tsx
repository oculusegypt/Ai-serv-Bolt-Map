import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { supabase } from '../services/supabaseClient';

export interface UserLocation {
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
}

interface LocationState {
  location: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<UserLocation | null>;
  setManualLocation: (loc: UserLocation) => void;
  regionId: string | null;
  regionName: string | null;
  regionExtraFee: number;
}

const LocationContext = createContext<LocationState | undefined>(undefined);

// Default: Cairo, Egypt
const DEFAULT_LOCATION: UserLocation = {
  latitude: 30.0444,
  longitude: 31.2357,
  address: 'وسط البلد، القاهرة',
  city: 'القاهرة',
};

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [regionExtraFee, setRegionExtraFee] = useState(0);

  const formatNominatimAddress = useCallback((data: any) => {
    const a = data?.address || {};
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = a?.[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      return '';
    };

    const houseNumber = pick('house_number');
    const road = pick('road', 'street', 'pedestrian');
    const street = [road, houseNumber].filter(Boolean).join(' ');

    const area = pick('neighbourhood', 'suburb', 'quarter');
    const district = pick('city_district', 'district', 'borough');
    const city = pick('city', 'town', 'village', 'hamlet');
    const county = pick('county');
    const state = pick('state');

    const parts = [street, area, district, city, county, state].filter(Boolean);

    const pretty = parts.join('، ');
    const resolvedCity = city || state || '';
    return { pretty, city: resolvedCity };
  }, []);

  const reverseGeocodeNominatim = useCallback(
    async (lat: number, lon: number) => {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ar&addressdetails=1&zoom=18`;

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept-Language': 'ar',
            'User-Agent': 'KhidmatiApp/1.0',
          },
        } as any);
        const data = await res.json();
        return data;
      } finally {
        clearTimeout(t);
      }
    },
    []
  );

  const resolveRegion = useCallback(async (loc: UserLocation) => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        setRegionId(null);
        setRegionName(null);
        setRegionExtraFee(0);
        return;
      }

      const lat = loc.latitude;
      const lng = loc.longitude;

      const res = await supabase
        .from('regions')
        .select('id,name,extra_fee,min_lat,max_lat,min_lng,max_lng')
        .eq('is_active', true)
        .not('min_lat', 'is', null)
        .not('max_lat', 'is', null)
        .not('min_lng', 'is', null)
        .not('max_lng', 'is', null)
        .lte('min_lat', lat)
        .gte('max_lat', lat)
        .lte('min_lng', lng)
        .gte('max_lng', lng)
        .limit(1);

      if (res.error || !res.data || res.data.length === 0) {
        // A2: outside coverage => apply default fee if configured in regions table.
        const fallback = await supabase
          .from('regions')
          .select('name,extra_fee')
          .eq('is_active', true)
          .eq('slug', 'out_of_coverage')
          .maybeSingle();

        setRegionId(null);
        setRegionName(fallback.data?.name || 'خارج نطاق الخدمة');
        setRegionExtraFee(Number(fallback.data?.extra_fee || 0));
        return;
      }

      const r = res.data[0] as any;
      setRegionId(r.id);
      setRegionName(r.name || null);
      setRegionExtraFee(Number(r.extra_fee || 0));
    } catch {
      setRegionId(null);
      setRegionName(null);
      setRegionExtraFee(0);
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (Platform.OS === 'web') {
        // Web geolocation
        if (navigator.geolocation) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          });
          const loc: UserLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            address: 'موقعك الحالي',
            city: 'القاهرة',
          };

          // Nominatim reverse geocode (detailed)
          try {
            const data = await reverseGeocodeNominatim(pos.coords.latitude, pos.coords.longitude);
            const formatted = formatNominatimAddress(data);
            if (formatted.pretty) loc.address = formatted.pretty;
            if (formatted.city) loc.city = formatted.city;
            if ((!loc.address || loc.address === 'موقعك الحالي') && data?.display_name) {
              loc.address = String(data.display_name)
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
                .join('، ');
            }
          } catch {
            // ignore
          }
          setLocation(loc);
          resolveRegion(loc);
          setIsLoading(false);
          return loc;
        } else {
          setLocation(DEFAULT_LOCATION);
          resolveRegion(DEFAULT_LOCATION);
          setIsLoading(false);
          return DEFAULT_LOCATION;
        }
      } else {
        // Mobile: expo-location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('تم رفض الوصول للموقع');
          setLocation(DEFAULT_LOCATION);
          setIsLoading(false);
          return DEFAULT_LOCATION;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const loc: UserLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          address: 'موقعك الحالي',
          city: 'القاهرة',
        };

        // Reverse geocode
        try {
          const [geocoded] = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          if (geocoded) {
            const parts = [
              geocoded.name,
              geocoded.street,
              geocoded.streetNumber,
              geocoded.district,
              geocoded.subregion,
              geocoded.city,
              geocoded.region,
              geocoded.postalCode,
              geocoded.country,
            ].filter(Boolean);
            loc.address = parts.join('، ') || 'موقعك الحالي';
            loc.city = geocoded.city || 'القاهرة';
          }
        } catch {}

        // Richer Arabic address (Nominatim)
        try {
          const data = await reverseGeocodeNominatim(pos.coords.latitude, pos.coords.longitude);
          const formatted = formatNominatimAddress(data);
          if (formatted.pretty) loc.address = formatted.pretty;
          if (formatted.city) loc.city = formatted.city || loc.city;
          if ((!loc.address || loc.address === 'موقعك الحالي') && data?.display_name) {
            loc.address = String(data.display_name)
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
              .join('، ');
          }
        } catch {}

        setLocation(loc);
        resolveRegion(loc);
        setIsLoading(false);
        return loc;
      }
    } catch (err: any) {
      setError('فشل تحديد الموقع');
      setLocation(DEFAULT_LOCATION);
      resolveRegion(DEFAULT_LOCATION);
      setIsLoading(false);
      return DEFAULT_LOCATION;
    }
  }, []);

  const setManualLocation = useCallback((loc: UserLocation) => {
    setLocation(loc);
    setError(null);
    resolveRegion(loc);
  }, []);

  // Auto-request on mount
  useEffect(() => {
    requestLocation();
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        isLoading,
        error,
        requestLocation,
        setManualLocation,
        regionId,
        regionName,
        regionExtraFee,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within LocationProvider');
  return context;
}
