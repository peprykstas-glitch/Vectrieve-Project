import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://127.0.0.1:8000';

  try {
    const res = await fetch(`${backendUrl}/api/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to initialize demo sandbox' }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    const token = data.access_token;

    const response = NextResponse.json({ success: true, user: data.user });

    // Set secure session cookie (HttpOnly)
    response.cookies.set('vectrieve_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (err: any) {
    console.error('Demo sandbox initialization error:', err);
    return NextResponse.json(
      { error: err.message || 'Demo backend service is temporarily unavailable' },
      { status: 500 }
    );
  }
}
