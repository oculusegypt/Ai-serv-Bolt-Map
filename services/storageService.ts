import { supabase } from './supabaseClient';

function extFromUri(uri: string): string {
  const m = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  return (m?.[1] || 'jpg').toLowerCase();
}

export async function uploadUserFile(params: {
  bucket: string;
  path: string;
  uri: string;
  contentType?: string;
}): Promise<{ ok: boolean; publicUrl?: string; error?: string }> {
  try {
    const resp = await fetch(params.uri);
    const blob = await resp.blob();

    const up = await supabase.storage.from(params.bucket).upload(params.path, blob, {
      contentType: params.contentType || (blob as any)?.type,
      upsert: true,
    });

    if (up.error) return { ok: false, error: up.error.message };

    const pub = supabase.storage.from(params.bucket).getPublicUrl(params.path);
    const url = (pub.data as any)?.publicUrl as string | undefined;
    if (!url) return { ok: false, error: 'no_public_url' };

    return { ok: true, publicUrl: url };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'upload_failed' };
  }
}

export async function uploadAvatar(params: {
  userId: string;
  uri: string;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  const ext = extFromUri(params.uri);
  const bucket = 'avatars';
  const path = `${params.userId}/avatar.${ext}`;
  const res = await uploadUserFile({ bucket, path, uri: params.uri });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, url: res.publicUrl };
}

export async function uploadVerificationDoc(params: {
  userId: string;
  uri: string;
  fileName?: string;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  const ext = extFromUri(params.uri);
  const bucket = 'verification_docs';
  const name = params.fileName ? params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_') : `${Date.now()}`;
  const path = `${params.userId}/${name}.${ext}`;
  const res = await uploadUserFile({ bucket, path, uri: params.uri });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, url: res.publicUrl };
}
