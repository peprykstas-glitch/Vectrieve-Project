import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({
  url: redisUrl,
  token: redisToken,
}) : null;

const ratelimit = redis ? new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
  analytics: true,
}) : null;

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Захист від бот-ферм для ендпоінтів авторизації
  if (path.startsWith('/api/auth/') && ratelimit) {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '127.0.0.1';
    const { success, limit, remaining } = await ratelimit.limit(`auth_rate_limit_${ip}`);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Algorithmic bot protection active. Try again later.' },
        { 
          status: 429, 
          headers: { 
            'X-RateLimit-Limit': limit.toString(), 
            'X-RateLimit-Remaining': remaining.toString() 
          } 
        }
      );
    }
  }

  // 2. Сувора перевірка сесії (HttpOnly Cookie)
  const sessionToken = request.cookies.get('vectrieve_session')?.value;
  const isAuthRoute = path === '/login' || path === '/register';

  // Якщо юзер не залогінений і намагається зайти на БУДЬ-ЯКУ закриту сторінку (включно з головною) -> кидаємо на логін
  if (!sessionToken && !isAuthRoute && !path.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Якщо юзер ВЖЕ залогінений і намагається зайти на сторінку логіну чи реєстрації -> кидаємо в дашборд (на головну)
  if (sessionToken && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
