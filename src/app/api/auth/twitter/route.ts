import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getClientCredentials } from '@/database/db';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionEmail = cookieStore.get('session_email');

  if (!sessionEmail) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const creds = await getClientCredentials("twitter");
  const clientId = creds.clientId;
  if (!clientId) {
    return NextResponse.redirect(new URL("/dashboard/channels?error=missing_credentials&platform=twitter", request.url));
  }

  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  cookieStore.set('twitter_code_verifier', codeVerifier, { httpOnly: true, secure: true, maxAge: 60 * 10 });
  cookieStore.set('twitter_oauth_state', state, { httpOnly: true, secure: true, maxAge: 60 * 10 });

  const appOrigin = new URL(request.url).origin;
  const redirectUri = `${appOrigin}/api/auth/callback/twitter`;

  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', 'tweet.read tweet.write users.read offline.access');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  return NextResponse.redirect(authUrl.toString());
}
