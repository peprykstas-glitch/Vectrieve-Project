import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// --- Optional: Upstash rate limiting (only active if env vars are set) ---
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '10 s'),
      analytics: true,
    })
  : null;

// Routes that are publicly accessible without a session
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/landing',
  '/privacy',
  '/terms',
  '/forgot-password',
  '/reset-password',
];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Enforce rate limiting on auth API endpoints (bot protection)
  if (path.startsWith('/api/auth/') && ratelimit) {
    const ip =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1';
    const { success, limit, remaining } = await ratelimit.limit(
      `auth_rate_limit_${ip}`
    );

    if (!success) {
      return NextResponse.json(
        {
          error:
            'Rate limit exceeded. Algorithmic bot protection active. Try again later.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
          },
        }
      );
    }
  }

  // 2. Session-based route protection
  const sessionToken = request.cookies.get('vectrieve_session')?.value;

  const isPublicPath =
    PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/')) ||
    path.startsWith('/api/');

  // If no session and accessing a protected page → redirect to /landing
  if (!sessionToken && !isPublicPath) {
    return NextResponse.redirect(new URL('/landing', request.url));
  }

  // If already logged in and accessing login/register → redirect to dashboard
  if (sessionToken && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
