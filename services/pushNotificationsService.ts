export async function sendOrderPush(params: {
  orderId: string;
  newStatus: string;
  oldStatus?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) return { ok: false, error: 'Push notification API is not configured.' };

  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/send-order-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      orderId: params.orderId,
      newStatus: params.newStatus,
      oldStatus: params.oldStatus ?? null,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || data?.ok === false) return { ok: false, error: data?.error || 'push_failed' };
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'push_failed' };
  }
}
