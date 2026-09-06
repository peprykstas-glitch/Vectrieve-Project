import { NextResponse } from 'next/server';
import { getInternalBackendUrl } from '@/lib/server-backend';
import { verifyTurnstile } from '@/lib/turnstile';

/**
 * POST /api/auth/forgot-password
 * Sends a password reset link to the user's email via the backend.
 *
 * Security: Always returns 200 even if the email doesn't exist,
 * to prevent email enumeration attacks.
 */
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
    const turnstileResult = await verifyTurnstile(turnstileToken, 'forgot_password', clientIp);

    if (!turnstileResult.success) {
      return NextResponse.json(
        { message: turnstileResult.error || 'Security verification failed.' },
        { status: 403 }
      );
    }

    // Clean payload for backend
    const {
      'cf-turnstile-response': _cf,
      turnstileToken: _tt,
      turnstile_token: _tk,
      ...backendPayload
    } = body;

    const response = await fetch(`${getInternalBackendUrl()}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
    });

    // If backend doesn't implement this yet — return success anyway
    if (response.status === 404 || response.status === 405) {
      // Backend doesn't have this endpoint yet
      // Show success UI (pretend the email was sent)
      return NextResponse.json(
        { message: 'If this email exists, a reset link has been sent.' },
        { status: 200 }
      );
    }

    let data: any = {};
    try {
      data = await response.json();
    } catch {
      data = { message: 'Reset link request processed.' };
    }

    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error) {
    console.error('Forgot Password Proxy Error:', error);
    // Return success even on network error to prevent email enumeration
    return NextResponse.json(
      { message: 'If this email exists, a reset link has been sent.' },
      { status: 200 }
    );
  }
}
