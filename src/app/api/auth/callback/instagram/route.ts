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
  const error = searchParams.get('error');

  const storedState = cookieStore.get('ig_oauth_state')?.value;
  
  // Clear state cookie
  cookieStore.set('ig_oauth_state', '', { maxAge: 0 });

  if (error || !code || state !== storedState) {
    return NextResponse.redirect(new URL('/dashboard/channels?error=instagram_failed', request.url));
  }

  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const redirectUri = `${appOrigin}/api/auth/callback/instagram`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/dashboard/channels?error=instagram_failed', request.url));
  }

  try {
    const tokenFormData = new FormData();
    tokenFormData.append('client_id', clientId);
    tokenFormData.append('client_secret', clientSecret);
    tokenFormData.append('grant_type', 'authorization_code');
    tokenFormData.append('redirect_uri', redirectUri);
    tokenFormData.append('code', code);

    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: tokenFormData,
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get short-lived token');
    }

    const tokenData = await tokenResponse.json();
    const shortToken = tokenData.access_token;

    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortToken}`
    );

    if (!longLivedResponse.ok) {
      throw new Error('Failed to get long-lived token');
    }

    const longLivedData = await longLivedResponse.json();
    const longToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in;

    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,profile_picture_url,followers_count&access_token=${longToken}`
    );

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch profile');
    }

    const profile = await profileResponse.json();

    const db = await getDB(sessionEmail);
    const existingIndex = db.socialAccounts?.findIndex((acc: any) => acc.platform === 'instagram' && acc.id === profile.id) ?? -1;

    const newAccount = {
      platform: 'instagram' as const,
      id: profile.id,
      name: profile.username,
      username: '@' + profile.username,
      avatar: profile.profile_picture_url || '',
      accessToken: encryptToken(longToken),
      tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
      followers: profile.followers_count?.toString() || '0',
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

    return NextResponse.redirect(new URL('/dashboard/channels?success=instagram_connected', request.url));
  } catch (err) {
    console.error('Instagram OAuth error:', err);
    return NextResponse.redirect(new URL('/dashboard/channels?error=instagram_failed', request.url));
  }
}
