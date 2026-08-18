import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInternalBackendUrl } from '@/lib/server-backend';

async function handleProxy(request: Request, pathArray: string[]) {
  const path = pathArray.join('/');
  const url = new URL(request.url);
  const backendUrl = `${getInternalBackendUrl()}/${path}${url.search}`;

  console.log(`[BFF Proxy] Requesting: ${request.method} ${backendUrl}`);

  const cookieStore = await cookies();
  const token = cookieStore.get('vectrieve_session')?.value;

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const k = key.toLowerCase();
    if (
      k !== 'connection' &&
      k !== 'upgrade' &&
      k !== 'keep-alive' &&
      k !== 'host' &&
      k !== 'content-length' &&
      k !== 'transfer-encoding' &&
      k !== 'te'
    ) {
      headers.set(key, value);
    }
  }

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
export async function PATCH(req: Request, { params }: { params: Promise<{ path: string[] }> }) { const { path } = await params; return handleProxy(req, path); }
export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) { const { path } = await params; return handleProxy(req, path); }