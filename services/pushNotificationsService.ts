import { supabase } from './supabaseClient';
import Constants from 'expo-constants';

export async function sendOrderPush(params: {
  orderId: string;
  newStatus: string;
  oldStatus?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const functionSecret =
    (Constants as any)?.expoConfig?.extra?.FUNCTION_SECRET ||
    (Constants as any)?.expoConfig?.extra?.functionSecret ||
    (Constants as any)?.extra?.FUNCTION_SECRET ||
    '';

  const { data, error } = await supabase.functions.invoke('send-order-push', {
    body: {
      orderId: params.orderId,
      newStatus: params.newStatus,
      oldStatus: params.oldStatus ?? null,
    },
    headers: functionSecret ? { 'x-function-secret': functionSecret } : undefined,
  });

  if (error) return { ok: false, error: error.message };
  if ((data as any)?.ok === false) return { ok: false, error: (data as any)?.error || 'push_failed' };
  return { ok: true };
}
