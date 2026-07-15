import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getClientCredentials } from '@/database/db';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionEmail = cookieStore.get('session_email');

  if (!sessionEmail) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  cookieStore.set('ig_oauth_state', state, { httpOnly: true, secure: true, maxAge: 60 * 10 });

  const creds = await getClientCredentials("instagram");
  const clientId = creds.clientId;
  if (!clientId) {
    return NextResponse.redirect(new URL("/dashboard/channels?error=missing_credentials&platform=instagram", request.url));
  }

  const appOrigin = new URL(request.url).origin;
  const redirectUri = `${appOrigin}/api/auth/callback/instagram`;

  const authUrl = new URL('https://api.instagram.com/oauth/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', 'user_profile,user_media,instagram_manage_comments');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);

  return NextResponse.redirect(authUrl.toString());
}
