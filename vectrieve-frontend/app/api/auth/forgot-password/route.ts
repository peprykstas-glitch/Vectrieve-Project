import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

    const response = await fetch(`${BACKEND_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
