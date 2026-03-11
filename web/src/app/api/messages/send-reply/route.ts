import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
import { sendReply } from '@/lib/mychart/messages/sendReply';
import { sendTelemetryEvent } from '../../../../../../shared/telemetry';

export async function POST(req: NextRequest) {
  sendTelemetryEvent('api_message_send_reply');
  const { token, conversationId, messageBody } = await req.json();

  const mychartRequest = getSession(token);
  if (!mychartRequest) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
  }

  if (!conversationId || !messageBody) {
    return NextResponse.json({ error: 'Missing conversationId or messageBody' }, { status: 400 });
  }

  try {
    const result = await sendReply(mychartRequest, { conversationId, messageBody });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
