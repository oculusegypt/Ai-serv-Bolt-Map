import { supabase } from './supabaseClient';

export type ProfileRow = {
  id: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  role: string | null;
};

export async function getProfileById(profileId: string): Promise<{ ok: boolean; profile?: ProfileRow; error?: string }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,phone,avatar,role')
    .eq('id', profileId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'not_found' };
  return { ok: true, profile: data as ProfileRow };
}

export async function updateMyProfile(params: {
  userId: string;
  name?: string;
  phone?: string;
  avatar?: string | null;
  documents?: string[] | null;
}): Promise<{ ok: boolean; error?: string }> {
  const payload: any = {};
  if (typeof params.name === 'string') payload.name = params.name;
  if (typeof params.phone === 'string') payload.phone = params.phone;
  if (params.avatar === null || typeof params.avatar === 'string') payload.avatar = params.avatar;
  if (params.documents === null || Array.isArray(params.documents)) payload.documents = params.documents;

  const { error } = await supabase.from('profiles').update(payload).eq('id', params.userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
