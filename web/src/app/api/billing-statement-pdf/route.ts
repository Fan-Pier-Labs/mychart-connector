import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
import { saveStatementPdf } from '@/lib/mychart/bills/bills';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

export async function POST(req: NextRequest) {
  sendTelemetryEvent('api_billing_pdf');
  const { token, encBillingId, statement } = await req.json();

  const mychartRequest = getSession(token);
  if (!mychartRequest) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
  }

  if (!encBillingId || !statement) {
    return NextResponse.json({ error: 'Missing encBillingId or statement' }, { status: 400 });
  }

  try {
    const pdfBuffer = await saveStatementPdf(mychartRequest, encBillingId, statement);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Statement_${statement.DateDisplay || 'unknown'}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
