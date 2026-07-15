import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getClientCredentials } from '@/database/db';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionEmail = cookieStore.get('session_email')?.value;

    if (!sessionEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const clientId = creds.clientId;

    if (!clientId) {
      return NextResponse.redirect(new URL("/dashboard/channels?error=missing_credentials&platform=linkedin", req.url));
    }

    const linkedInAuthUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    linkedInAuthUrl.searchParams.set('response_type', 'code');
    linkedInAuthUrl.searchParams.set('client_id', clientId);
    linkedInAuthUrl.searchParams.set('redirect_uri', redirectUri);
    linkedInAuthUrl.searchParams.set('scope', 'openid profile email w_member_social');
    linkedInAuthUrl.searchParams.set('state', nonce);

    return NextResponse.redirect(linkedInAuthUrl.toString());
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
