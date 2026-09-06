import { NextResponse } from 'next/server';
import { getInternalBackendUrl } from '@/lib/server-backend';
import { verifyTurnstile } from '@/lib/turnstile';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Client IP detection for Turnstile
    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      null;

    // Canonical Turnstile bot verification
    const turnstileToken =
      body['cf-turnstile-response'] ?? body.turnstileToken ?? body.turnstile_token;
    const turnstileResult = await verifyTurnstile(turnstileToken, 'signup', clientIp);

    if (!turnstileResult.success) {
      return NextResponse.json(
        { detail: turnstileResult.error || 'Security verification failed.' },
        { status: 403 }
      );
    }

    // Clean payload for backend (remove captcha token before passing to Pydantic UserCreate)
    const {
      'cf-turnstile-response': _cf,
      turnstileToken: _tt,
      turnstile_token: _tk,
      ...backendPayload
    } = body;

    const response = await fetch(`${getInternalBackendUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
    });

    // Parse backend response (may be JSON or empty)
    let data: any = {};
    try {
      data = await response.json();
    } catch {
      // Non-JSON response from backend — use status text
      data = { detail: response.statusText || 'Server error' };
    }

    if (!response.ok) {
      // Forward the exact backend error to the frontend
      // FastAPI uses {detail: "..."} or {detail: [{loc, msg, type}, ...]} for 422
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Register Proxy Error:', error);
    return NextResponse.json(
      { detail: 'Cannot connect to backend server. Make sure the backend is running.' },
      { status: 502 }
    );
  }
}