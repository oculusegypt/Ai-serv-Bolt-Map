import { supabase } from './supabaseClient';

export async function upsertPushToken(params: {
  userId: string;
  expoPushToken: string;
  platform: 'android' | 'ios' | 'web';
  deviceId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: params.userId,
      expo_push_token: params.expoPushToken,
      platform: params.platform,
      device_id: params.deviceId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,expo_push_token' }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
