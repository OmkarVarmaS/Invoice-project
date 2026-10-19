'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        const hasSession = !!(data && data.session);

        if (isMounted) {
          if (!hasSession) {
            setAuthenticated(false);
            if (typeof window !== 'undefined') {
              window.location.assign('/login');
            } else {
              router.push('/login');
            }
          } else {
            setAuthenticated(true);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setAuthenticated(false);
          router.push('/login');
          setLoading(false);
        }
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (!session && isMounted) {
          setAuthenticated(false);
          if (pathname !== '/login' && pathname !== '/reset-password') {
            router.push('/login');
          }
        } else if (session && isMounted) {
          setAuthenticated(true);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
        <div className="bg-white border border-[#DCE3ED] rounded-3xl p-6 shadow-xl text-center space-y-3 max-w-sm w-full">
          <div className="w-10 h-10 border-4 border-[#0B2A5B] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-[#0B2A5B]">Verifying Administrator Authentication...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
