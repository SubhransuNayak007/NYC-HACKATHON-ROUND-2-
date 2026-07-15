import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB, encryptToken, SocialAccount } from '@/database/db';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionEmail = cookieStore.get('session_email')?.value;

    if (!sessionEmail) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('LinkedIn auth error returned:', error);
      return NextResponse.redirect(new URL('/dashboard/channels?error=linkedin_auth_failed', req.url));
    }

    const storedState = cookieStore.get('linkedin_oauth_state')?.value;
    if (!code || !state || state !== storedState) {
      return NextResponse.redirect(new URL('/dashboard/channels?error=invalid_state', req.url));
    }

    cookieStore.delete('linkedin_oauth_state');

    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const redirectUri = `${appOrigin}/api/auth/callback/linkedin`;
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'LinkedIn configuration missing' }, { status: 500 });
    }

    // Get Access Token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('LinkedIn token error:', errorText);
      return NextResponse.redirect(new URL('/dashboard/channels?error=linkedin_token_failed', req.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    // Fetch Profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('LinkedIn profile error:', await profileResponse.text());
      return NextResponse.redirect(new URL('/dashboard/channels?error=linkedin_profile_failed', req.url));
    }

    const profile = await profileResponse.json();

    // Fetch Followers
    let followerCount = 'N/A';
    try {
      const networkResponse = await fetch(`https://api.linkedin.com/v2/networkSizes/urn:li:person:${profile.sub}?edgeType=CreatedByYou`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });
      if (networkResponse.ok) {
        const networkData = await networkResponse.json();
        followerCount = networkData.first?.size?.toString() || 'N/A';
      }
    } catch (e) {
      console.warn('Could not fetch LinkedIn followers:', e);
    }

    const db = await getDB();
    if (!db.socialAccounts) db.socialAccounts = [];
    
    const existingIndex = db.socialAccounts.findIndex((a: any) => a.platform === 'linkedin' && a.id === profile.sub);

    const account: SocialAccount = {
      platform: 'linkedin',
      id: profile.sub,
      name: profile.name,
      username: profile.email,
      avatar: profile.picture,
      accessToken: encryptToken(accessToken),
      tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
      followers: followerCount,
      connectedAt: new Date().toISOString(),
      isActive: true,
    };

    if (existingIndex >= 0) {
      db.socialAccounts[existingIndex] = account;
    } else {
      db.socialAccounts.push(account);
    }

    await saveDB(db);

    return NextResponse.redirect(new URL('/dashboard/channels?success=linkedin_connected', req.url));
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
