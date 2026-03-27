import { NextRequest, NextResponse } from 'next/server';
import { decodeOAuthState, exchangeCodeForTokens } from '@/lib/fhir/oauth';
import { createFhirConnection } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    if (error) {
      const errorDescription = req.nextUrl.searchParams.get('error_description') || error;
      console.error('[fhir/callback] OAuth error:', errorDescription);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/home?fhir_error=${encodeURIComponent(errorDescription)}`
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      );
    }

    // Decode the encrypted state to get userId and fhirBaseUrl
    const { userId, fhirBaseUrl, organizationName } = await decodeOAuthState(state);

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(fhirBaseUrl, code);

    if (!tokens.patient) {
      return NextResponse.json(
        { error: 'Token response did not include a patient ID' },
        { status: 500 }
      );
    }

    // Store the FHIR connection
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await createFhirConnection(userId, {
      fhirServerUrl: fhirBaseUrl,
      organizationName,
      patientId: tokens.patient,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scopes: tokens.scope,
    });

    // Redirect back to home page with success indicator
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/home?fhir_connected=true`);
  } catch (err: unknown) {
    console.error('[fhir/callback] Error:', err);

    // Handle duplicate connection (unique constraint violation)
    if (err instanceof Error && err.message.includes('unique constraint')) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/home?fhir_error=${encodeURIComponent('This FHIR connection already exists')}`
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${baseUrl}/home?fhir_error=${encodeURIComponent('Failed to complete FHIR connection')}`
    );
  }
}
