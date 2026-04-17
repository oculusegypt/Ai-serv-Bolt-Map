'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminTopBar } from '@/components/AdminTopBar';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { ChevronDown, Plus, Save } from 'lucide-react';

type FlowRow = {
  id: string;
  service_id: string;
  region_id: string | null;
  flow_json: any;
  updated_at: string;
};

type RegionRow = {
  id: string;
  slug: string;
  name: string;
};

type ServiceRow = {
  id: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
};

function sanitizeFlowJson(input: any): any {
  if (!input || typeof input !== 'object') return {};
  const out: any = { ...input };

  const q = out.quickOptionsByState;
  if (q && typeof q === 'object') {
    const cleaned: any = {};
    Object.keys(q).forEach((k) => {
      const v = q[k];
      if (Array.isArray(v)) {
        if (v.length > 0) cleaned[k] = v;
      } else if (v && typeof v === 'object') {
        cleaned[k] = v;
      }
    });

    if (Object.keys(cleaned).length > 0) out.quickOptionsByState = cleaned;
    else delete out.quickOptionsByState;
  }

  return out;
}

function Card(props: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-black text-slate-900">{props.title}</div>
        {props.right}
      </div>
      {props.children}
    </div>
  );
}

export default function FlowsEditorPage() {
  const { ready } = useAdminGuard();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [flows, setFlows] = useState<FlowRow[]>([]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('global');

  const [jsonText, setJsonText] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const serviceIds = useMemo(() => {
    return services
      .filter((s) => s.is_active)
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id))
      .map((s) => s.id);
  }, [services]);

  const selectedFlow = useMemo(() => {
    if (!selectedServiceId) return null;
    return (
      flows.find(
        (f) =>
          f.service_id === selectedServiceId &&
          ((selectedRegionId === 'global' && f.region_id === null) || f.region_id === selectedRegionId)
      ) || null
    );
  }, [flows, selectedRegionId, selectedServiceId]);

  const loadAll = async () => {
    setError(null);
    setLoading(true);

    const [regionsRes, servicesRes, flowRes] = await Promise.all([
      supabase.from('regions').select('id,slug,name').eq('is_active', true).order('name', { ascending: true }),
      supabase
        .from('services')
        .select('id,name_ar,sort_order,is_active')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true }),
      supabase
        .from('service_chat_flows')
        .select('id, service_id, region_id, flow_json, updated_at')
        .order('service_id', { ascending: true }),
    ]);

    if (regionsRes.error) {
      setError(regionsRes.error.message);
      setLoading(false);
      return;
    }

    if (servicesRes.error) {
      setError(servicesRes.error.message);
      setLoading(false);
      return;
    }

    if (flowRes.error) {
      setError(flowRes.error.message);
      setLoading(false);
      return;
    }

    const nextServices = (servicesRes.data as ServiceRow[]) || [];
    setServices(nextServices);
    setRegions((regionsRes.data as RegionRow[]) || []);
    setFlows((flowRes.data as FlowRow[]) || []);

    const first = nextServices.find((s) => s.is_active)?.id || '';
    setSelectedServiceId((prev) => prev || first);

    setLoading(false);
  };

  useEffect(() => {
    if (!ready) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (serviceIds.length === 0) return;
    if (selectedServiceId && serviceIds.includes(selectedServiceId)) return;
    setSelectedServiceId(serviceIds[0]);
  }, [serviceIds, selectedServiceId]);

  useEffect(() => {
    if (!selectedFlow) {
      setJsonText('');
      return;
    }
    try {
      setJsonText(JSON.stringify(selectedFlow.flow_json, null, 2));
    } catch {
      setJsonText('');
    }
  }, [selectedFlow]);

  const save = async () => {
    setError(null);

    if (!selectedServiceId) {
      setError('اختر خدمة');
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText || '{}');
    } catch {
      setError('JSON غير صالح');
      return;
    }

    parsed = sanitizeFlowJson(parsed);

    setSaving(true);
    const regionIdOrNull = selectedRegionId === 'global' ? null : selectedRegionId;

    const { error } = await supabase
      .from('service_chat_flows')
      .upsert({ service_id: selectedServiceId, region_id: regionIdOrNull, flow_json: parsed }, { onConflict: 'service_id,region_id' });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    const flowRes = await supabase
      .from('service_chat_flows')
      .select('id, service_id, region_id, flow_json, updated_at')
      .order('service_id', { ascending: true });

    if (!flowRes.error) setFlows((flowRes.data as FlowRow[]) || []);
  };

  const createEmptyFlow = async () => {
    setError(null);

    if (!selectedServiceId) {
      setError('اختر خدمة');
      return;
    }

    const regionIdOrNull = selectedRegionId === 'global' ? null : selectedRegionId;

    if (selectedFlow) {
      setError('التدفق موجود بالفعل');
      return;
    }

    setCreating(true);

    const { error } = await supabase
      .from('service_chat_flows')
      .upsert({ service_id: selectedServiceId, region_id: regionIdOrNull, flow_json: {} }, { onConflict: 'service_id,region_id' });

    setCreating(false);

    if (error) {
      setError(error.message);
      return;
    }

    const flowRes = await supabase
      .from('service_chat_flows')
      .select('id, service_id, region_id, flow_json, updated_at')
      .order('service_id', { ascending: true });

    if (!flowRes.error) setFlows((flowRes.data as FlowRow[]) || []);
  };

  if (!ready) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">Loading...</div>;
  }

  return (
    <div>
      <AdminTopBar title={t('flows')} subTitle="محرر تدفقات الشات (JSON) لكل خدمة/منطقة" />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <Card
            title="الخدمات"
            right={
              <a
                href="/dashboard/services"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-900 hover:bg-white"
              >
                إدارة الخدمات
                <ChevronDown className="h-4 w-4 opacity-60" />
              </a>
            }
          >
            {serviceIds.length === 0 ? (
              <div className="text-sm font-semibold text-slate-600">لا توجد خدمات مفعلة</div>
            ) : (
              <div className="flex flex-col gap-2">
                {serviceIds.map((id) => {
                  const row = services.find((s) => s.id === id);
                  const label = row?.name_ar ? `${row.name_ar} (${id})` : id;
                  const active = selectedServiceId === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedServiceId(id)}
                      className={
                        active
                          ? 'rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-right text-sm font-black text-brand-900'
                          : 'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-extrabold text-slate-900 hover:bg-slate-50'
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card
              title="المنطقة + الإجراءات"
              right={
                <div className="flex items-center gap-2">
                  <button
                    onClick={createEmptyFlow}
                    disabled={creating || !!selectedFlow}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {creating ? 'جاري الإنشاء...' : 'إنشاء تدفق'}
                  </button>

                  <button
                    onClick={save}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                </div>
              }
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="text-xs font-extrabold text-slate-600">المنطقة</div>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold outline-none sm:w-[320px]"
                  value={selectedRegionId}
                  onChange={(e) => setSelectedRegionId(e.target.value)}
                >
                  <option value="global">Global (عام)</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.slug})
                    </option>
                  ))}
                </select>

                {!selectedFlow ? (
                  <div className="text-xs font-semibold text-slate-500">لا يوجد تدفق لهذه الخدمة/المنطقة بعد</div>
                ) : (
                  <div className="text-xs font-semibold text-slate-500">آخر تحديث: {new Date(selectedFlow.updated_at).toLocaleString()}</div>
                )}
              </div>
            </Card>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-black text-slate-900">JSON</div>
                <div className="text-xs font-semibold text-slate-500">service_id: {selectedServiceId || '—'}</div>
              </div>
              <textarea
                className="h-[72vh] w-full resize-none rounded-b-2xl bg-white p-4 font-mono text-xs font-semibold text-slate-900 outline-none"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={`{\n  "quickOptionsByState": { ... }\n}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
