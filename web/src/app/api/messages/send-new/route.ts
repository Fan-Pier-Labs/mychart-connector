import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
import { sendNewMessage } from '@/lib/mychart/messages/sendMessage';
import type { MessageRecipient, MessageTopic } from '@/lib/mychart/messages/sendMessage';
import { sendTelemetryEvent } from '../../../../../../shared/telemetry';

export async function POST(req: NextRequest) {
  sendTelemetryEvent('api_message_send_new');
  const { token, recipient, topic, subject, messageBody } = await req.json() as {
    token: string;
    recipient: MessageRecipient;
    topic: MessageTopic;
    subject: string;
    messageBody: string;
  };

  const mychartRequest = getSession(token);
  if (!mychartRequest) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
  }

  if (!recipient || !topic || !subject || !messageBody) {
    return NextResponse.json({ error: 'Missing required fields: recipient, topic, subject, messageBody' }, { status: 400 });
  }

  try {
    const result = await sendNewMessage(mychartRequest, { recipient, topic, subject, messageBody });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
