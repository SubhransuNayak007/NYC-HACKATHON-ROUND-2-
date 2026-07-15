import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB, encryptToken, SocialAccount } from '@/database/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionEmail = cookieStore.get('session_email')?.value;

    if (!sessionEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { token, phoneNumberId, businessAccountId } = body;

    if (!token || !phoneNumberId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify token
    const verifyResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${token}`);
    
    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('WhatsApp token verification failed:', errorText);
      return NextResponse.json({ error: 'Invalid token or phone number ID' }, { status: 400 });
    }

    const phoneData = await verifyResponse.json();
    const displayName = phoneData.verified_name || 'WhatsApp Account';
    const displayPhone = phoneData.display_phone_number || phoneNumberId;

    const webhookVerifyToken = crypto.randomBytes(16).toString('hex');

    const db = await getDB();
    if (!db.socialAccounts) db.socialAccounts = [];

    const existingIndex = db.socialAccounts.findIndex((a: any) => a.platform === 'whatsapp' && a.id === phoneNumberId);

    const account: SocialAccount = {
      platform: 'whatsapp',
      id: phoneNumberId,
      name: displayName,
      username: displayPhone,
      phoneNumberId,
      whatsappToken: encryptToken(token),
      webhookVerifyToken,
      connectedAt: new Date().toISOString(),
      isActive: true,
      ...(businessAccountId && { businessAccountId })
    } as SocialAccount;

    if (existingIndex >= 0) {
      db.socialAccounts[existingIndex] = account;
    } else {
      db.socialAccounts.push(account);
    }

    await saveDB(db);

    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    return NextResponse.json({
      success: true,
      account: {
        name: displayName,
        username: displayPhone,
        webhookVerifyToken,
        webhookUrl: `${appOrigin}/api/social/whatsapp/webhook`,
      }
    });

  } catch (error) {
    console.error('WhatsApp auth error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
