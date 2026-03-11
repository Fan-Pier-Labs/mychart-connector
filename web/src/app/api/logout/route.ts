import { NextResponse } from 'next/server';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

export async function POST() {
  sendTelemetryEvent('api_logout');
  // BetterAuth handles session cleanup via its own signOut endpoint.
  // MyChart sessions in memory expire naturally.
  return NextResponse.json({ success: true });
}
