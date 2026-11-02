import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getClientCredentials, getDB, saveDB, encryptToken, type SocialAccount } from '@/database/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionEmail = cookieStore.get('session_email')?.value || "subhransu.nayak.418@gmail.com";

    const nonce = crypto.randomUUID();
    cookieStore.set('linkedin_oauth_state', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    });

    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const redirectUri = `${appOrigin}/api/auth/callback/linkedin`;
    const creds = await getClientCredentials("linkedin");
    const clientId = creds.clientId || process.env.LINKEDIN_CLIENT_ID;

    // If LinkedIn Client ID is configured, redirect to live LinkedIn OAuth dialog
    if (clientId) {
      const linkedInAuthUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
      linkedInAuthUrl.searchParams.set('response_type', 'code');
      linkedInAuthUrl.searchParams.set('client_id', clientId);
      linkedInAuthUrl.searchParams.set('redirect_uri', redirectUri);
      linkedInAuthUrl.searchParams.set('scope', 'openid profile email w_member_social');
      linkedInAuthUrl.searchParams.set('state', nonce);

      return NextResponse.redirect(linkedInAuthUrl.toString());
    }

    // Direct user to connect via LinkedIn Token if LinkedIn App OAuth credentials are not yet configured
    return NextResponse.redirect(new URL("/dashboard/channels?open=linkedin&notice=linkedin_token_needed", req.url));
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    return NextResponse.redirect(new URL("/dashboard/channels?open=linkedin&error=auth_failed", req.url));
  }
}
