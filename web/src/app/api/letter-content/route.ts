import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
import { getLetterDetails } from '@/lib/mychart/letters';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

export async function POST(req: NextRequest) {
  sendTelemetryEvent('api_letter_content');
  const { token, hnoId, csn } = await req.json();

  const mychartRequest = getSession(token);
  if (!mychartRequest) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
  }

  if (!hnoId || !csn) {
    return NextResponse.json({ error: 'Missing hnoId or csn' }, { status: 400 });
  }

  try {
    const details = await getLetterDetails(mychartRequest, hnoId, csn);
    return NextResponse.json(details);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
