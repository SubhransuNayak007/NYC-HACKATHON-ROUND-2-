import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB } from '@/database/db';

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionEmail = cookieStore.get('session_email')?.value;

    if (!sessionEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { platform, accountId } = body;

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    const db = await getDB();
    let dbUpdated = false;

    if (platform === 'youtube' && accountId) {
      if (db.channels) {
        const initialLen = db.channels.length;
        db.channels = db.channels.filter((ch: any) => ch.id !== accountId);
        if (db.channels.length !== initialLen) dbUpdated = true;
      }
    } else {
      if (db.socialAccounts) {
        const initialLen = db.socialAccounts.length;
        if (accountId) {
          db.socialAccounts = db.socialAccounts.filter((a: any) => !(a.platform === platform && a.id === accountId));
        } else {
          db.socialAccounts = db.socialAccounts.filter((a: any) => a.platform !== platform);
        }
        if (db.socialAccounts.length !== initialLen) dbUpdated = true;
      }
    }

    if (dbUpdated) {
      await saveDB(db);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect account error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
