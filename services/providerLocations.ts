import { supabase } from './supabaseClient';

export type ProviderLocationRow = {
  provider_id: string;
  latitude: number;
  longitude: number;
  address: string | null;
  is_available: boolean;
  updated_at: string;
};

export async function upsertProviderLocation(params: {
  providerId: string;
  latitude: number;
  longitude: number;
  address?: string;
  isAvailable?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { providerId, latitude, longitude, address, isAvailable } = params;
  const payload: any = {
    provider_id: providerId,
    latitude,
    longitude,
    address: address ?? null,
    updated_at: new Date().toISOString(),
  };
  if (typeof isAvailable === 'boolean') payload.is_available = isAvailable;

  const { error } = await supabase.from('provider_locations').upsert(payload);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setProviderAvailability(params: {
  providerId: string;
  isAvailable: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { providerId, isAvailable } = params;
  const { error } = await supabase
    .from('provider_locations')
    .upsert({ provider_id: providerId, is_available: isAvailable, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getProviderAvailability(providerId: string): Promise<{ ok: boolean; isAvailable?: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('provider_locations')
    .select('is_available')
    .eq('provider_id', providerId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'not_found' };
  return { ok: true, isAvailable: (data as any).is_available === true };
}

export async function getProviderLocations(providerIds: string[]): Promise<Record<string, ProviderLocationRow>> {
  if (providerIds.length === 0) return {};

  const { data, error } = await supabase
    .from('provider_locations')
    .select('*')
    .in('provider_id', providerIds);

  if (error || !data) return {};

  const map: Record<string, ProviderLocationRow> = {};
  for (const row of data as ProviderLocationRow[]) {
    map[row.provider_id] = row;
  }
  return map;
}
