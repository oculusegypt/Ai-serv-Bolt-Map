'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function useAdminGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id || null;
      if (!uid) {
        router.replace('/login');
        return;
      }

      const profileRes = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle();
      if (profileRes.error || profileRes.data?.role !== 'admin') {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      if (!cancelled) {
        setUserId(uid);
        setReady(true);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { ready, userId };
}
