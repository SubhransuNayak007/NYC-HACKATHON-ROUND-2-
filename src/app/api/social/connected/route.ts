import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/database/db';

export async function GET(req: NextRequest) {
  try {
    const db = await getDB();
    
    // Strip sensitive tokens
    const accounts = (db.socialAccounts || []).map((account: any) => {
      const safeAccount = { ...account };
      delete safeAccount.accessToken;
      delete safeAccount.refreshToken;
      delete safeAccount.whatsappToken;
      return safeAccount;
    });

    const channelsLength = Array.isArray(db.channels) ? db.channels.length : 0;

    return NextResponse.json({
      accounts,
      youtube: {
        connected: channelsLength > 0,
        channels: channelsLength
      }
    });
  } catch (error) {
    console.error('Fetch connected accounts error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
