import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // FastAPI очікує формат форми (Form Data) для OAuth2
    const formData = new URLSearchParams();
    formData.append('username', email); // email стає username
    formData.append('password', password);

    const response = await fetch(`${BACKEND_URL}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // ХОВАЄМО ТОКЕН У СЕЙФ (HttpOnly Cookie)
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'vectrieve_session',
      value: data.access_token,
      httpOnly: true, // Недоступно для JavaScript (захист від XSS)
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 днів
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login Proxy Error:", error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}