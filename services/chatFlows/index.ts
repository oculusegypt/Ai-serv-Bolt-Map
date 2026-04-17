import type { ChatUiState, QuickOption, ServiceChatFlow } from './types';
import { cleaningFlow } from './cleaning';
import { plumbingFlow } from './plumbing';
import { electricalFlow } from './electrical';
import { supabase } from '../supabaseClient';

const FLOWS: Record<string, ServiceChatFlow> = {
  cleaning: cleaningFlow,
  plumbing: plumbingFlow,
  electrical: electricalFlow,
};

type DbFlowRow = {
  service_id: string;
  region_id: string | null;
  flow_json: any;
};

type RuntimeFlow = {
  quickOptionsByState?: Partial<Record<ChatUiState, QuickOption[]>>;
  pricing?: any;
};

const flowCache = new Map<string, RuntimeFlow>();

function normalizeFlowJson(flowJson: any): RuntimeFlow {
  if (!flowJson || typeof flowJson !== 'object') return {};
  return flowJson as RuntimeFlow;
}

function mergeFlows(globalFlow: RuntimeFlow, regionFlow: RuntimeFlow): RuntimeFlow {
  const globalQ = globalFlow.quickOptionsByState || {};
  const regionQ = regionFlow.quickOptionsByState || {};

  // Strategy: region overrides replace the whole state's options.
  const mergedQuick: RuntimeFlow['quickOptionsByState'] = { ...globalQ };
  (Object.keys(regionQ) as ChatUiState[]).forEach((k) => {
    mergedQuick[k] = regionQ[k];
  });

  return {
    ...globalFlow,
    ...regionFlow,
    pricing: {
      ...(globalFlow.pricing || {}),
      ...(regionFlow.pricing || {}),
      extras: {
        ...((globalFlow.pricing && globalFlow.pricing.extras) || {}),
        ...((regionFlow.pricing && regionFlow.pricing.extras) || {}),
      },
    },
    quickOptionsByState: mergedQuick,
  };
}

function cacheKey(serviceId: string, regionId: string | null) {
  return `${serviceId}::${regionId || 'global'}`;
}

async function fetchFlowRow(serviceId: string, regionId: string | null): Promise<DbFlowRow | null> {
  const q = supabase
    .from('service_chat_flows')
    .select('service_id,region_id,flow_json')
    .eq('service_id', serviceId);

  const res = regionId
    ? await q.eq('region_id', regionId).maybeSingle()
    : await q.is('region_id', null).maybeSingle();

  if (res.error || !res.data) return null;
  return res.data as DbFlowRow;
}

export async function warmServiceFlow(serviceId: string, regionId: string | null): Promise<void> {
  // Requires authenticated session due to RLS.
  const globalRow = await fetchFlowRow(serviceId, null);
  const regionRow = regionId ? await fetchFlowRow(serviceId, regionId) : null;

  const globalFlow = normalizeFlowJson(globalRow?.flow_json);
  const regionFlow = normalizeFlowJson(regionRow?.flow_json);
  const merged = mergeFlows(globalFlow, regionFlow);

  flowCache.set(cacheKey(serviceId, null), globalFlow);
  if (regionId) flowCache.set(cacheKey(serviceId, regionId), merged);
}

export function getPricingForRegion(serviceId: string | undefined, regionId: string | null): any {
  if (!serviceId) return null;

  const cachedRegion = regionId ? flowCache.get(cacheKey(serviceId, regionId)) : undefined;
  if (cachedRegion?.pricing) return cachedRegion.pricing;

  const cachedGlobal = flowCache.get(cacheKey(serviceId, null));
  if (cachedGlobal?.pricing) return cachedGlobal.pricing;

  const local = FLOWS[serviceId];
  return (local as any)?.pricing || null;
}

export async function getQuickOptionsAsync(
  serviceId: string | undefined,
  state: ChatUiState,
  regionId: string | null
): Promise<QuickOption[]> {
  if (!serviceId) return [];

  const key = cacheKey(serviceId, regionId);
  if (!flowCache.has(key)) {
    await warmServiceFlow(serviceId, regionId);
  }

  const flow = flowCache.get(key);
  const cached = flow?.quickOptionsByState?.[state];
  if (Array.isArray(cached) && cached.length > 0) return cached;

  // Fallback to local flows
  const local = FLOWS[serviceId];
  return local?.quickOptionsByState[state] || [];
}

export function getQuickOptionsForRegion(
  serviceId: string | undefined,
  state: ChatUiState,
  regionId: string | null
): QuickOption[] {
  if (!serviceId) return [];

  const cachedRegion = regionId ? flowCache.get(cacheKey(serviceId, regionId)) : undefined;
  const regionOpts = cachedRegion?.quickOptionsByState?.[state];
  if (Array.isArray(regionOpts) && regionOpts.length > 0) return regionOpts;

  const cachedGlobal = flowCache.get(cacheKey(serviceId, null));
  const globalOpts = cachedGlobal?.quickOptionsByState?.[state];
  if (Array.isArray(globalOpts) && globalOpts.length > 0) return globalOpts;

  const local = FLOWS[serviceId];
  return local?.quickOptionsByState[state] || [];
}

export function getQuickOptions(serviceId: string | undefined, state: ChatUiState): QuickOption[] {
  if (!serviceId) return [];

  // Sync path: use cached DB flow if present, otherwise local.
  const cachedGlobal = flowCache.get(cacheKey(serviceId, null));
  const cached = cachedGlobal;
  const cachedOpts = cached?.quickOptionsByState?.[state];
  if (Array.isArray(cachedOpts) && cachedOpts.length > 0) return cachedOpts;

  const local = FLOWS[serviceId];
  return local?.quickOptionsByState[state] || [];
}

export type { ChatUiState, QuickOption, ServiceChatFlow };
