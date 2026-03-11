import { NextResponse } from 'next/server';
import { demoData } from '@/lib/demoData';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

export async function POST() {
  sendTelemetryEvent('api_demo_load');
  return NextResponse.json(demoData);
}
