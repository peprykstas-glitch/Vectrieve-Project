import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=oauth_cancelled', request.url));
  }

  try {
    // Construct the exact redirect_uri that was sent to Google
    const redirect_uri = `${url.origin}/api/auth/callback/google`;

    const response = await fetch(`${BACKEND_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirect_uri }),
    });

    let data: any = {};
    try {
      data = await response.json();
    } catch {
      data = { detail: response.statusText || 'Google Authentication failed' };
    }

    if (!response.ok) {
      console.error('Google Auth backend error:', data);
      const errMsg = encodeURIComponent(data.detail || 'Google sign-in failed');
      return NextResponse.redirect(new URL(`/login?error=${errMsg}`, request.url));
    }

    // Set secure HttpOnly session cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'vectrieve_session',
      value: data.access_token,
      secure: process.env.COOKIE_SECURE === 'true' || url.protocol === 'https:',
      path: '/',
      maxAge: 60 * 60 * 24 * 60, // 60 days persistent session
    });

    // Successful login -> Redirect directly to the dashboard
    return NextResponse.redirect(new URL('/', request.url));
  } catch (err) {
    console.error('Google OAuth route error:', err);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
