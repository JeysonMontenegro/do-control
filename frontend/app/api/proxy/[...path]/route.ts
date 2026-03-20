import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.DO_CONTROL_API_URL ?? "http://backend:8000";
const FORWARDED_REQUEST_HEADERS = ["authorization", "content-type", "accept"] as const;
const FORWARDED_RESPONSE_HEADERS = ["content-type", "content-disposition"] as const;
const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

function buildTargetUrl(request: NextRequest, path: string[]) {
  const target = new URL(`${BACKEND_URL.replace(/\/$/, "")}/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });
  return target;
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers();

  for (const headerName of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }

  return headers;
}

function buildResponseHeaders(response: Response) {
  const headers = new Headers();

  for (const headerName of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }

  return headers;
}

async function forwardRequest(request: NextRequest, path: string[]) {
  const targetUrl = buildTargetUrl(request, path);
  const headers = buildForwardHeaders(request);
  const body = BODYLESS_METHODS.has(request.method) ? undefined : await request.arrayBuffer();

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    headers: buildResponseHeaders(response),
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}
