import { supabase } from './supabaseClient';
import type { Order } from './mockData';

type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  service_name: string;
  status: string;
  total_price: number;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  rating: number | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  refund_status?: string | null;
  refund_amount?: number | null;
  refund_method?: string | null;
  refund_reference?: string | null;
  created_at: string;
};

type OrderRowWithProvider = OrderRow & {
  provider?: {
    name: string | null;
  } | null;
  customer?: {
    name: string | null;
  } | null;
};

function mapRowToOrder(row: OrderRowWithProvider): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    serviceId: row.service_id,
    serviceName: row.service_name,
    customerId: row.customer_id,
    providerId: row.provider_id,
    providerName: row.provider?.name || '',
    status: row.status as any,
    totalPrice: row.total_price,
    address: row.address,
    latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
    longitude: typeof row.longitude === 'number' ? row.longitude : undefined,
    scheduledDate: row.scheduled_date || 'النهاردة',
    scheduledTime: row.scheduled_time || '10:00 ص',
    createdAt: row.created_at,
    rating: row.rating ?? undefined,
    customerName: row.customer?.name || undefined,

    cancelledBy: (row.cancelled_by as any) ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    refundStatus: (row.refund_status as any) ?? undefined,
    refundAmount: typeof row.refund_amount === 'number' ? row.refund_amount : undefined,
    refundMethod: row.refund_method ?? undefined,
    refundReference: row.refund_reference ?? undefined,
  };
}

export async function createOrder(params: {
  orderNumber: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  serviceName: string;
  totalPrice: number;
  address: string;
  latitude?: number;
  longitude?: number;
  scheduledDate: string;
  scheduledTime: string;
}): Promise<{ ok: boolean; order?: Order; error?: string }> {
  const { data: inserted, error } = await supabase
    .from('orders')
    .insert({
      order_number: params.orderNumber,
      customer_id: params.customerId,
      provider_id: params.providerId,
      service_id: params.serviceId,
      service_name: params.serviceName,
      status: 'pending',
      total_price: params.totalPrice,
      address: params.address,
      latitude: typeof params.latitude === 'number' ? params.latitude : null,
      longitude: typeof params.longitude === 'number' ? params.longitude : null,
      scheduled_date: params.scheduledDate,
      scheduled_time: params.scheduledTime,
    })
    .select('*, provider:profiles!orders_provider_id_fkey(name), customer:profiles!orders_customer_id_fkey(name)')
    .single<OrderRowWithProvider>();

  if (error || !inserted) return { ok: false, error: error?.message || 'فشل إنشاء الطلب' };
  return { ok: true, order: mapRowToOrder(inserted) };
}

export async function listOrdersForCustomer(customerId: string): Promise<{ ok: boolean; orders: Order[]; error?: string }> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, provider:profiles!orders_provider_id_fkey(name), customer:profiles!orders_customer_id_fkey(name)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error || !data) return { ok: false, orders: [], error: error?.message || 'فشل تحميل الطلبات' };
  return { ok: true, orders: (data as OrderRowWithProvider[]).map(mapRowToOrder) };
}

export async function listOrdersForProvider(providerId: string): Promise<{ ok: boolean; orders: Order[]; error?: string }> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, provider:profiles!orders_provider_id_fkey(name), customer:profiles!orders_customer_id_fkey(name)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  if (error || !data) return { ok: false, orders: [], error: error?.message || 'فشل تحميل الطلبات' };
  return { ok: true, orders: (data as OrderRowWithProvider[]).map(mapRowToOrder) };
}

export async function listOrdersForAdmin(): Promise<{ ok: boolean; orders: Order[]; error?: string }> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, provider:profiles!orders_provider_id_fkey(name), customer:profiles!orders_customer_id_fkey(name)')
    .order('created_at', { ascending: false });
  if (error || !data) return { ok: false, orders: [], error: error?.message || 'فشل تحميل الطلبات' };
  return { ok: true, orders: (data as OrderRowWithProvider[]).map(mapRowToOrder) };
}

export async function getOrderById(orderId: string): Promise<{ ok: boolean; order?: Order; error?: string }> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, provider:profiles!orders_provider_id_fkey(name), customer:profiles!orders_customer_id_fkey(name)')
    .eq('id', orderId)
    .single<OrderRowWithProvider>();

  if (error || !data) return { ok: false, error: error?.message || 'الطلب غير موجود' };
  return { ok: true, order: mapRowToOrder(data) };
}

export async function updateOrderStatus(params: {
  orderId: string;
  status: Order['status'];
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('orders')
    .update({ status: params.status })
    .eq('id', params.orderId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function cancelOrder(params: {
  orderId: string;
  cancelledBy: NonNullable<Order['cancelledBy']>;
  reason: string;
  refundStatus?: NonNullable<Order['refundStatus']>;
}): Promise<{ ok: boolean; error?: string }> {
  const payload: any = {
    status: 'cancelled',
    cancelled_by: params.cancelledBy,
    cancel_reason: params.reason,
    cancelled_at: new Date().toISOString(),
  };
  if (params.refundStatus) payload.refund_status = params.refundStatus;

  const { error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', params.orderId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function rateOrder(params: { orderId: string; rating: number }): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('orders')
    .update({ rating: params.rating })
    .eq('id', params.orderId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
