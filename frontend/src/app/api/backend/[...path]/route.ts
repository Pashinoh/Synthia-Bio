import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  'http://localhost:5000'
).replace(/\/+$/, '');

const ALLOWED_GET_PATHS = new Set(['pathogens', 'benchmarks']);
const ALLOWED_POST_PATHS = new Set([
  'generate',
  'generate-batch',
  'optimize',
  'validate-stability',
  'benchmarks/compare'
]);

const TIMEOUT_BY_PATH_MS: Record<string, number> = {
  'generate-batch': 26000,
  generate: 20000
};

const PASSTHROUGH_HEADERS = [
  'retry-after',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset'
] as const;

function isSameOriginBrowserRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin.replace(/\/+$/, '') === request.nextUrl.origin.replace(/\/+$/, '');
}

function extractClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first && /^[0-9a-fA-F:.]{2,45}$/.test(first)) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp && /^[0-9a-fA-F:.]{2,45}$/.test(realIp)) return realIp;
  return null;
}

function buildBackendHeaders(request: NextRequest, hasJsonBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasJsonBody) {
    headers['Content-Type'] = 'application/json';
  }
  const apiKey = process.env.SYNTHIA_API_KEY?.trim();
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  const clientIp = extractClientIp(request);
  if (clientIp) {
    headers['X-Client-IP'] = clientIp;
  }
  return headers;
}

async function forwardToBackend(
  request: NextRequest,
  method: 'GET' | 'POST',
  joinedPath: string
): Promise<NextResponse> {
  if (!isSameOriginBrowserRequest(request)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: cross-origin proxy request rejected' },
      { status: 403 }
    );
  }

  const allowed =
    method === 'GET' ? ALLOWED_GET_PATHS.has(joinedPath) : ALLOWED_POST_PATHS.has(joinedPath);
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Endpoint not found' }, { status: 404 });
  }

  let rawBody: string | undefined;
  if (method === 'POST') {
    rawBody = await request.text();
  }

  const timeoutMs = TIMEOUT_BY_PATH_MS[joinedPath] ?? 12000;

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/${joinedPath}`, {
      method,
      headers: buildBackendHeaders(request, method === 'POST'),
      body: rawBody,
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store'
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const responseBody = await upstream.text();
    const responseHeaders = new Headers({ 'Content-Type': contentType });

    for (const headerName of PASSTHROUGH_HEADERS) {
      const value = upstream.headers.get(headerName);
      if (value) responseHeaders.set(headerName, value);
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Backend API is unreachable' },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  return forwardToBackend(request, 'GET', path.join('/'));
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  return forwardToBackend(request, 'POST', path.join('/'));
}
