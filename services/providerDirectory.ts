import { supabase } from './supabaseClient';
import type { ServiceId } from '../constants/config';
import type { Provider } from './mockData';

type UserCoord = { latitude: number; longitude: number };

type ProfileProviderRow = {
  id: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  services: string[] | null;
  role: string | null;
};

type ProviderLocationRow = {
  provider_id: string;
  latitude: number;
  longitude: number;
  address: string | null;
  is_available?: boolean;
  updated_at: string;
};

const PROVIDER_OFFLINE_AFTER_MS = 3 * 60 * 1000;

function isFresh(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return false;
  const t = new Date(updatedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= PROVIDER_OFFLINE_AFTER_MS;
}

const cache: {
  byService: Partial<Record<ServiceId, Provider[]>>;
  lastLoadedAt: Partial<Record<ServiceId, number>>;
} = {
  byService: {},
  lastLoadedAt: {},
};

function haversineKm(a: UserCoord, b: UserCoord): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function formatKm(km: number): string {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

function estimateResponseTime(km: number): string {
  if (!Number.isFinite(km)) return '10 دقائق';
  const minutes = Math.max(3, Math.min(25, Math.round(3 + km * 3)));
  return `${minutes} دقائق`;
}

export function getCachedProvidersForService(serviceId: ServiceId): Provider[] {
  return cache.byService[serviceId] || [];
}

export async function refreshProvidersCache(params: {
  serviceId: ServiceId;
  userCoord?: UserCoord | null;
}): Promise<{ ok: boolean; error?: string; count?: number }> {
  const { serviceId, userCoord } = params;

  const fetchProfiles = async (sid: string) => {
    return await supabase
      .from('profiles')
      .select('id,name,phone,avatar,services,role')
      .eq('role', 'provider')
      .contains('services', [sid]);
  };

  let { data: profiles, error: profilesErr } = await fetchProfiles(serviceId);

  // Backward-compat alias: some DBs store electrical service id as 'electricity'.
  if ((!profilesErr && Array.isArray(profiles) && profiles.length === 0) && serviceId === 'electrical') {
    const alt = await fetchProfiles('electricity');
    profiles = alt.data;
    profilesErr = alt.error;
  }

  if (profilesErr || !profiles) {
    cache.byService[serviceId] = [];
    cache.lastLoadedAt[serviceId] = Date.now();
    return { ok: false, error: profilesErr?.message || 'فشل تحميل الفنيين' };
  }

  const providers = profiles as ProfileProviderRow[];
  const ids = providers.map((p) => p.id);

  const { data: locRows, error: locErr } = await supabase
    .from('provider_locations')
    .select('*')
    .in('provider_id', ids);

  if (locErr) {
    cache.byService[serviceId] = [];
    cache.lastLoadedAt[serviceId] = Date.now();
    return { ok: false, error: locErr.message };
  }

  const locById: Record<string, ProviderLocationRow> = {};
  for (const row of (locRows || []) as ProviderLocationRow[]) {
    locById[row.provider_id] = row;
  }

  // Busy logic (initial version): provider is considered busy if they have ANY open order
  // where status is not paid/cancelled.
  const busyProviderIds = new Set<string>();
  try {
    const { data: orderRows, error: ordersErr } = await supabase
      .from('orders')
      .select('provider_id,status')
      .in('provider_id', ids);

    if (!ordersErr && Array.isArray(orderRows)) {
      for (const r of orderRows as any[]) {
        const pid = String(r?.provider_id || '');
        const status = String(r?.status || '');
        if (!pid) continue;
        if (status !== 'paid' && status !== 'cancelled') {
          busyProviderIds.add(pid);
        }
      }
    }
  } catch {
    // ignore - if orders query fails, fallback to location availability only
  }

  const normalized: Provider[] = providers
    .map((p) => {
      const loc = locById[p.id];
      if (!loc) return null;

      const available = (loc as any).is_available === true && isFresh(loc.updated_at);
      if (!available) return null;

      // Exclude busy providers (has open order)
      if (busyProviderIds.has(p.id)) return null;

      const km = userCoord ? haversineKm(userCoord, { latitude: loc.latitude, longitude: loc.longitude }) : NaN;

      const item: Provider = {
        id: p.id,
        name: p.name || 'مقدم خدمة',
        rating: 4.7,
        reviewCount: 0,
        distance: userCoord ? formatKm(km) : '',
        responseTime: estimateResponseTime(km),
        completedJobs: 0,
        services: (p.services || []) as string[],
        isAvailable: true,
        priceModifier: 1.0,
        avatar:
          p.avatar ||
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
        latitude: loc.latitude,
        longitude: loc.longitude,
      };
      return item;
    })
    .filter(Boolean) as Provider[];

  // Sort: nearest if we have distance, otherwise by name.
  const sorted = [...normalized].sort((a, b) => {
    const akm = userCoord && a.distance.includes('كم') ? Number(a.distance.replace(' كم', '')) : NaN;
    const bkm = userCoord && b.distance.includes('كم') ? Number(b.distance.replace(' كم', '')) : NaN;
    if (Number.isFinite(akm) && Number.isFinite(bkm)) return akm - bkm;
    return b.name.localeCompare(a.name, 'ar');
  });

  cache.byService[serviceId] = sorted;
  cache.lastLoadedAt[serviceId] = Date.now();
  return { ok: true, count: sorted.length };
}
