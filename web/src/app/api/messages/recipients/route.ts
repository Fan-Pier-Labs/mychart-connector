import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
import { getVerificationToken, getMessageRecipients, getMessageTopics } from '@/lib/mychart/messages/sendMessage';
import { sendTelemetryEvent } from '../../../../../../shared/telemetry';

export async function POST(req: NextRequest) {
  sendTelemetryEvent('api_message_recipients');
  const { token } = await req.json();

  const mychartRequest = getSession(token);
  if (!mychartRequest) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
  }

  try {
    const verificationToken = await getVerificationToken(mychartRequest);
    if (!verificationToken) {
      return NextResponse.json({ error: 'Could not get verification token' }, { status: 500 });
    }

    const [recipients, topics] = await Promise.all([
      getMessageRecipients(mychartRequest, verificationToken),
      getMessageTopics(mychartRequest, verificationToken),
    ]);

    return NextResponse.json({ recipients, topics });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
