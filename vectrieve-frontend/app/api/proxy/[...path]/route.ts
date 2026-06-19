import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function handleProxy(request: Request, pathArray: string[]) {
  const path = pathArray.join('/');
  const url = new URL(request.url);
  const backendUrl = `${BACKEND_URL}/${path}${url.search}`;

  const cookieStore = await cookies();
  const token = cookieStore.get('vectrieve_session')?.value;

  const headers = new Headers(request.headers);
  headers.delete('host'); 
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const options: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      options.body = await request.formData();
      headers.delete('content-type'); 
      headers.delete('content-length');
    } else {
      options.body = await request.blob();
    }
  }

  try {
    const backendResponse = await fetch(backendUrl, options);
    const responseHeaders = new Headers(backendResponse.headers);
    
    // Якщо бекенд каже 401 (токен прострочений або юзера видалено), знищуємо куку
    if (backendResponse.status === 401) {
      responseHeaders.append(
        'Set-Cookie', 
        'vectrieve_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax'
      );
    }
    
    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ error: 'Backend is unreachable' }, { status: 502 });
  }
}

// Next.js 16: params must be awaited
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) { const { path } = await params; return handleProxy(req, path); }
export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) { const { path } = await params; return handleProxy(req, path); }
export async function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) { const { path } = await params; return handleProxy(req, path); }
export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) { const { path } = await params; return handleProxy(req, path); }