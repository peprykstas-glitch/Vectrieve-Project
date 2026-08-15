'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Routes that do NOT require authentication
const PUBLIC_ROUTES = [
  '/landing',
  '/login',
  '/register',
  '/privacy',
  '/terms',
  '/forgot-password',
  '/reset-password',
];

/**
 * AuthGuard — Client-side session verification layer.
 *
 * Auth Strategy:
 *  - The session token is stored in an HttpOnly Cookie (`vectrieve_session`),
 *    which is NOT accessible to JavaScript by design (XSS protection).
 *  - Therefore, we CANNOT read the token directly in the browser.
 *  - Instead, we call `/api/proxy/auth/me` — the BFF proxy automatically
 *    attaches the cookie to the backend request. If the backend returns 200,
 *    the session is valid. If 401, the session has expired or is invalid.
 *  - The Next.js middleware (`proxy.ts`) also independently enforces
 *    redirect-to-login for unauthenticated users at the server level,
 *    providing defense-in-depth.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = React.useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  React.useEffect(() => {
    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname?.startsWith(route + '/')
    );

    if (isPublicRoute) {
      // On public routes, verify if the user is ALREADY logged in.
      // If yes, redirect to the app so they don't sit on the login page.
      fetch('/api/proxy/auth/me', { method: 'GET' })
        .then((res) => {
          if (res.ok) {
            // Already authenticated — send to dashboard
            router.push('/');
          } else {
            // Not authenticated — let them access the public page
            setStatus('unauthenticated');
          }
        })
        .catch(() => {
          setStatus('unauthenticated');
        });
    } else {
      // On protected routes, verify session via BFF proxy
      fetch('/api/proxy/auth/me', { method: 'GET' })
        .then((res) => {
          if (res.ok) {
            setStatus('authenticated');
          } else {
            // Session expired or invalid — redirect to landing page
            setStatus('unauthenticated');
            router.push('/landing');
          }
        })
        .catch(() => {
          setStatus('unauthenticated');
          router.push('/landing');
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (status === 'checking') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#09090b] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
          <span className="text-sm font-medium tracking-wide">Verifying session...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
