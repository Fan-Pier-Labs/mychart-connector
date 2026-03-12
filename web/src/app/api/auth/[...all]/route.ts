import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/auth';

let handler: { GET: (req: Request) => Promise<Response>; POST: (req: Request) => Promise<Response> } | null = null;

async function ensureHandler() {
  if (!handler) {
    const auth = await getAuth();
    handler = toNextJsHandler(auth);
  }
  return handler;
}

export async function GET(req: Request) {
  try {
    const h = await ensureHandler();
    return h.GET(req);
  } catch (err) {
    console.error(`[Auth Route] GET error:`, err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  console.log(`[Auth Route] POST ${url.pathname} origin=${req.headers.get('origin')}`);
  const h = await ensureHandler();
  try {
    const res = await h.POST(req);
    console.log(`[Auth Route] POST ${url.pathname} => ${res.status}`);
    return res;
  } catch (err) {
    console.error(`[Auth Route] POST ${url.pathname} error:`, err);
    throw err;
  }
}
