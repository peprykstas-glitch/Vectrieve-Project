import { NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  '1077219353292-43iph4lcgf8fouradbi9esuo4tov1s2m.apps.googleusercontent.com';

function getOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  if (host.includes('vectrieve.duckdns.org')) {
    return 'https://vectrieve.duckdns.org';
  }
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'http://localhost:3000';
  }
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const origin = getOrigin(request);
  const redirectUri = `${origin}/api/auth/callback/google`;
  const scope = 'openid email profile';
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}
