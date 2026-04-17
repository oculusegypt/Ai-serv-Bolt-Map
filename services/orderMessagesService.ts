import { supabase } from './supabaseClient';

export type OrderMessageRow = {
  id: string;
  order_id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
};

export async function listOrderMessages(params: {
  orderId: string;
  limit?: number;
}): Promise<{ ok: boolean; messages: OrderMessageRow[]; error?: string }> {
  const { data, error } = await supabase
    .from('order_messages')
    .select('*')
    .eq('order_id', params.orderId)
    .order('created_at', { ascending: true })
    .limit(params.limit ?? 200);

  if (error || !data) return { ok: false, messages: [], error: error?.message || 'failed' };
  return { ok: true, messages: data as OrderMessageRow[] };
}

export async function sendOrderMessage(params: {
  orderId: string;
  senderId: string;
  receiverId: string;
  text: string;
}): Promise<{ ok: boolean; message?: OrderMessageRow; error?: string }> {
  const { data, error } = await supabase
    .from('order_messages')
    .insert({
      order_id: params.orderId,
      sender_id: params.senderId,
      receiver_id: params.receiverId,
      text: params.text,
    })
    .select('*')
    .single<OrderMessageRow>();

  if (error || !data) return { ok: false, error: error?.message || 'failed' };
  return { ok: true, message: data as OrderMessageRow };
}

export async function markMessageRead(params: { messageId: string }): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('order_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', params.messageId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markMessageDelivered(params: { messageId: string }): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('order_messages')
    .update({ delivered_at: new Date().toISOString() })
    .eq('id', params.messageId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
