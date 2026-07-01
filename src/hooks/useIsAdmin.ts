import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_EMAIL = 'duttasayan947595@gdbuddy.com';

export const useIsAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    const check = async () => {
      if (!user) { setIsAdmin(false); setLoading(false); return; }
      // Strict double-check: email match AND role row present
      if (user.email !== ADMIN_EMAIL) {
        if (!cancel) { setIsAdmin(false); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (!cancel) {
        setIsAdmin(!!data);
        setLoading(false);
      }
    };
    check();
    return () => { cancel = true; };
  }, [user]);

  return { isAdmin, loading };
};

export const ADMIN_EMAIL_CONST = ADMIN_EMAIL;
