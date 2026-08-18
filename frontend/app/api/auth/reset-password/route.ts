import { NextResponse } from 'next/server';
import { getInternalBackendUrl } from '@/lib/server-backend';

/**
 * POST /api/auth/reset-password
 * Validates the reset token and updates the user's password.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { detail: 'Token and new password are required.' },
        { status: 400 }
      );
    }

    const response = await fetch(`${getInternalBackendUrl()}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: password }),
    });

    // If backend doesn't implement this endpoint yet — return an informative error
    if (response.status === 404 || response.status === 405) {
      return NextResponse.json(
        { detail: 'Password reset is not yet configured on the server. Please contact your administrator.' },
        { status: 503 }
      );
    }

    let data: any = {};
    try {
      data = await response.json();
    } catch {
      data = { message: 'Password updated successfully.' };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Reset Password Proxy Error:', error);
    return NextResponse.json(
      { detail: 'Cannot connect to backend server. Please try again.' },
      { status: 502 }
    );
  }
}
