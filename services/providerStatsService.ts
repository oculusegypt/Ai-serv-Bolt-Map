import { supabase } from './supabaseClient';

export type ProviderStats = {
  completedOrders: number;
  ratingAvg: number;
  ratingCount: number;
  experienceYears: number;
};

type ProfileRow = {
  created_at: string | null;
  experience_years?: number | null;
};

type OrderLiteRow = {
  status: string;
  rating: number | null;
};

function safeYearsFromCreatedAt(createdAt: string | null): number {
  if (!createdAt) return 0;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return 0;
  const diffYears = (Date.now() - t) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, Math.floor(diffYears));
}

export async function getProviderStats(providerId: string): Promise<{ ok: boolean; stats?: ProviderStats; error?: string }> {
  if (!providerId) return { ok: false, error: 'missing_provider_id' };

  const [{ data: profile, error: profileError }, { data: orders, error: ordersError }] = await Promise.all([
    supabase.from('profiles').select('created_at,experience_years').eq('id', providerId).maybeSingle<ProfileRow>(),
    supabase.from('orders').select('status,rating').eq('provider_id', providerId) as any,
  ]);

  if (profileError) return { ok: false, error: profileError.message };
  if (ordersError) return { ok: false, error: ordersError.message };

  const list: OrderLiteRow[] = Array.isArray(orders) ? (orders as any) : [];

  const completedOrders = list.filter((o) => o.status === 'paid').length;

  const rated = list.filter((o) => typeof o.rating === 'number' && Number.isFinite(o.rating as any));
  const ratingCount = rated.length;
  const ratingAvg = ratingCount > 0 ? rated.reduce((acc, o) => acc + Number(o.rating), 0) / ratingCount : 0;

  const experienceYearsRaw = typeof (profile as any)?.experience_years === 'number' ? Number((profile as any).experience_years) : null;
  const experienceYears = Number.isFinite(experienceYearsRaw as any)
    ? Math.max(0, Math.floor(experienceYearsRaw as number))
    : safeYearsFromCreatedAt((profile as any)?.created_at ?? null);

  return {
    ok: true,
    stats: {
      completedOrders,
      ratingAvg,
      ratingCount,
      experienceYears,
    },
  };
}
