// Mock Provider locations for map display (around Cairo)
import { ServiceId } from '../constants/config';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getProviderLocations } from './providerLocations';

export interface MapProvider {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  services: ServiceId[];
  isAvailable: boolean;
  avatar: string;
  phone: string;
  latitude: number;
  longitude: number;
  priceModifier: number;
  responseTime: string;
}

// Providers spread around Cairo
export const MAP_PROVIDERS: MapProvider[] = [
  {
    id: 'mp1',
    name: 'أحمد محمد',
    rating: 4.9,
    reviewCount: 342,
    completedJobs: 1250,
    services: ['cleaning', 'carpet'],
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    phone: '+201011111111',
    latitude: 30.0500,
    longitude: 31.2400,
    priceModifier: 1.0,
    responseTime: '5 دقائق',
  },
  {
    id: 'mp2',
    name: 'محمد عبد الرحمن',
    rating: 4.8,
    reviewCount: 215,
    completedJobs: 890,
    services: ['plumbing', 'handyman'],
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    phone: '+201022222222',
    latitude: 30.0390,
    longitude: 31.2290,
    priceModifier: 0.95,
    responseTime: '8 دقائق',
  },
  {
    id: 'mp3',
    name: 'عمرو حسن',
    rating: 4.7,
    reviewCount: 189,
    completedJobs: 620,
    services: ['electrical', 'ac', 'handyman'],
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    phone: '+201033333333',
    latitude: 30.0560,
    longitude: 31.2500,
    priceModifier: 1.05,
    responseTime: '12 دقيقة',
  },
  {
    id: 'mp4',
    name: 'حسام الدين',
    rating: 4.9,
    reviewCount: 456,
    completedJobs: 1800,
    services: ['ac', 'appliance'],
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
    phone: '+201044444444',
    latitude: 30.0350,
    longitude: 31.2150,
    priceModifier: 1.1,
    responseTime: '3 دقائق',
  },
  {
    id: 'mp5',
    name: 'كريم سعيد',
    rating: 4.6,
    reviewCount: 134,
    completedJobs: 430,
    services: ['painting', 'carpentry'],
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop',
    phone: '+201055555555',
    latitude: 30.0610,
    longitude: 31.2190,
    priceModifier: 0.9,
    responseTime: '15 دقيقة',
  },
  {
    id: 'mp6',
    name: 'طارق عبد الله',
    rating: 4.8,
    reviewCount: 278,
    completedJobs: 960,
    services: ['pest', 'cleaning'],
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop',
    phone: '+201066666666',
    latitude: 30.0470,
    longitude: 31.2550,
    priceModifier: 1.0,
    responseTime: '7 دقائق',
  },
  {
    id: 'mp7',
    name: 'إبراهيم فؤاد',
    rating: 4.5,
    reviewCount: 98,
    completedJobs: 310,
    services: ['carpentry', 'handyman', 'painting'],
    isAvailable: false,
    avatar: 'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=200&h=200&fit=crop',
    phone: '+201077777777',
    latitude: 30.0300,
    longitude: 31.2450,
    priceModifier: 0.85,
    responseTime: '20 دقيقة',
  },
  {
    id: 'mp8',
    name: 'ياسر عادل',
    rating: 4.9,
    reviewCount: 512,
    completedJobs: 2100,
    services: ['electrical', 'appliance', 'ac'],
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=200&h=200&fit=crop',
    phone: '+201088888888',
    latitude: 30.0520,
    longitude: 31.2100,
    priceModifier: 1.15,
    responseTime: '6 دقائق',
  },
  {
    id: 'mp9',
    name: 'مصطفى نور',
    rating: 4.7,
    reviewCount: 167,
    completedJobs: 540,
    services: ['plumbing', 'handyman'],
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop',
    phone: '+201099999999',
    latitude: 30.0420,
    longitude: 31.2620,
    priceModifier: 0.95,
    responseTime: '10 دقائق',
  },
  {
    id: 'mp10',
    name: 'سامي رشاد',
    rating: 4.8,
    reviewCount: 301,
    completedJobs: 1100,
    services: ['carpet', 'cleaning', 'pest'],
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop',
    phone: '+201012121212',
    latitude: 30.0580,
    longitude: 31.2330,
    priceModifier: 1.0,
    responseTime: '4 دقائق',
  },
  {
    id: 'mp11',
    name: 'علي حسين',
    rating: 4.6,
    reviewCount: 220,
    completedJobs: 780,
    services: ['cleaning', 'handyman', 'carpet'],
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop',
    phone: '+201013131313',
    latitude: 30.0440,
    longitude: 31.2680,
    priceModifier: 0.92,
    responseTime: '9 دقائق',
  },
  {
    id: 'mp12',
    name: 'خالد إسماعيل',
    rating: 4.8,
    reviewCount: 390,
    completedJobs: 1450,
    services: ['electrical', 'ac', 'appliance'],
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=200&h=200&fit=crop',
    phone: '+201014141414',
    latitude: 30.0320,
    longitude: 31.2380,
    priceModifier: 1.08,
    responseTime: '5 دقائق',
  },
];

export function getMapProvidersForService(serviceId: ServiceId): MapProvider[] {
  return MAP_PROVIDERS.filter((p) => p.services.includes(serviceId) && p.isAvailable)
    .sort((a, b) => b.rating - a.rating);
}

function fallbackCoord(i: number) {
  const baseLat = 30.0444;
  const baseLng = 31.2357;
  const dLat = ((i % 5) - 2) * 0.006;
  const dLng = (((i * 3) % 5) - 2) * 0.006;
  return { latitude: baseLat + dLat, longitude: baseLng + dLng };
}

type ProfileProviderRow = {
  id: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  services: string[] | null;
  role: string | null;
};

const PROVIDER_OFFLINE_AFTER_MS = 3 * 60 * 1000;

function isFresh(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return false;
  const t = new Date(updatedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= PROVIDER_OFFLINE_AFTER_MS;
}

export async function getMapProvidersForServiceAsync(serviceId: ServiceId): Promise<MapProvider[]> {
  if (!isSupabaseConfigured) {
    return getMapProvidersForService(serviceId);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,phone,avatar,services,role')
    .eq('role', 'provider')
    .contains('services', [serviceId]);

  if (error || !data) {
    return getMapProvidersForService(serviceId);
  }

  const providers = data as ProfileProviderRow[];
  const ids = providers.map((p) => p.id);
  const locationsById = await getProviderLocations(ids);

  return providers
    .map((p, i) => {
      const loc = locationsById[p.id];
      const fallback = fallbackCoord(i);

      const available = !!loc?.is_available && isFresh(loc?.updated_at);

      return {
        id: p.id,
        name: p.name || 'مقدم خدمة',
        rating: 4.7,
        reviewCount: 120,
        completedJobs: 300,
        services: ((p.services || []) as ServiceId[]),
        isAvailable: available,
        avatar: p.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
        phone: p.phone || '',
        latitude: loc?.latitude ?? fallback.latitude,
        longitude: loc?.longitude ?? fallback.longitude,
        priceModifier: 1.0,
        responseTime: '10 دقائق',
      };
    })
    .filter((p) => p.isAvailable)
    .sort((a, b) => b.rating - a.rating);
}

export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
