import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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