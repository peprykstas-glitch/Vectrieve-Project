import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInternalBackendUrl } from '@/lib/server-backend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // FastAPI OAuth2 expects form-encoded data
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${getInternalBackendUrl()}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    let data: any = {};
    try {
      data = await response.json();
    } catch {
      data = { detail: response.statusText || 'Server error' };
    }

    if (!response.ok) {
      // Forward FastAPI error details to the frontend
      return NextResponse.json(data, { status: response.status });
    }

    // Store JWT in secure HttpOnly cookie (not accessible to JS — XSS protection)
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'vectrieve_session',
      value: data.access_token,
      secure: process.env.COOKIE_SECURE === 'true', // Allow HTTP access over IP
      path: '/',
      maxAge: 60 * 60 * 24 * 60, // 60 days persistent session
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login Proxy Error:', error);
    return NextResponse.json(
      { detail: 'Cannot connect to backend server. Make sure the backend is running.' },
      { status: 502 }
    );
  }
}