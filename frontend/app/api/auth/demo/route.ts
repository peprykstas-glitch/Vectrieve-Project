import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInternalBackendUrl } from '@/lib/server-backend';

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${getInternalBackendUrl()}/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = { detail: res.statusText || 'Server error' };
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Set secure session cookie (HttpOnly)
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'vectrieve_session',
      value: data.access_token,
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true, user: data.user });
  } catch (err: any) {
    console.error('Demo sandbox initialization error:', err);
    return NextResponse.json(
      { detail: err.message || 'Demo backend service is temporarily unavailable' },
      { status: 500 }
    );
  }
}
