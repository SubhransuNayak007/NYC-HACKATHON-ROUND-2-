import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB, encryptToken } from '@/database/db';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionEmail = cookieStore.get('session_email')?.value;
  const appOrigin = new URL(request.url).origin;

  if (!sessionEmail) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const storedState = cookieStore.get('twitter_oauth_state')?.value;
  const codeVerifier = cookieStore.get('twitter_code_verifier')?.value;
  
  cookieStore.set('twitter_oauth_state', '', { maxAge: 0 });
  cookieStore.set('twitter_code_verifier', '', { maxAge: 0 });

  if (!code || state !== storedState || !codeVerifier) {
    return NextResponse.redirect(new URL('/dashboard/channels?error=twitter_failed', request.url));
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const redirectUri = `${appOrigin}/api/auth/callback/twitter`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/dashboard/channels?error=twitter_failed', request.url));
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Twitter access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics,username,name', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch Twitter profile');
    }

    const userData = await userResponse.json();
    const user = userData.data;

    let formattedFollowers = '0';
    if (user.public_metrics?.followers_count) {
      const count = user.public_metrics.followers_count;
      if (count >= 1000000) {
        formattedFollowers = (count / 1000000).toFixed(1) + 'M';
      } else if (count >= 1000) {
        formattedFollowers = (count / 1000).toFixed(1) + 'K';
      } else {
        formattedFollowers = count.toString();
      }
    }

    const db = await getDB(sessionEmail);
    const existingIndex = db.socialAccounts?.findIndex((acc: any) => acc.platform === 'twitter' && acc.id === user.id) ?? -1;

    const newAccount = {
      platform: 'twitter' as const,
      id: user.id,
      name: user.name,
      username: '@' + user.username,
      avatar: user.profile_image_url || '',
      accessToken: encryptToken(accessToken),
      refreshToken: refreshToken ? encryptToken(refreshToken) : undefined,
      tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
      followers: formattedFollowers,
      connectedAt: new Date().toISOString(),
      isActive: true,
    };

    if (!db.socialAccounts) {
      db.socialAccounts = [];
    }

    if (existingIndex > -1) {
      db.socialAccounts[existingIndex] = newAccount;
    } else {
      db.socialAccounts.push(newAccount);
    }

    await saveDB(db, sessionEmail);

    return NextResponse.redirect(new URL('/dashboard/channels?success=twitter_connected', request.url));
  } catch (err) {
    console.error('Twitter OAuth error:', err);
    return NextResponse.redirect(new URL('/dashboard/channels?error=twitter_failed', request.url));
  }
}
