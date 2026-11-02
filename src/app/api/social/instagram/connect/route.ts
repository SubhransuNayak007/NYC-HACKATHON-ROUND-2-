/**
 * ============================================================
 *  POST /api/social/instagram/connect
 *
 *  Real Meta Graph API v19.0 Verification Endpoint:
 *  - Verifies token directly against graph.facebook.com
 *  - Discovers associated Instagram Professional / Business account
 *  - Persists real credentials with encrypted storage
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB, encryptToken, type SocialAccount } from "@/database/db";
import { GRAPH_API_BASE } from "@/channels/instagram/MetaApiClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, username } = body;

    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);
    if (!db.socialAccounts) db.socialAccounts = [];

    const cleanToken = (accessToken || "").trim();
    if (!cleanToken) {
      return NextResponse.json({ error: "Meta Access Token is required." }, { status: 400 });
    }

    // Query Meta Graph API to discover Instagram Business accounts or direct user profile
    let discoveredAccount: any = null;

    try {
      // 1. Try discovering via Page Accounts (/me/accounts)
      const accountsRes = await fetch(`${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${encodeURIComponent(cleanToken)}`);
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        for (const page of accountsData.data || []) {
          if (page.instagram_business_account) {
            const ig = page.instagram_business_account;
            discoveredAccount = {
              id: ig.id,
              username: ig.username,
              name: ig.name || page.name,
              avatar: ig.profile_picture_url || "",
              followers: ig.followers_count ? String(ig.followers_count) : "0",
              pageAccessToken: page.access_token || cleanToken,
            };
            break;
          }
        }
      }

      // 2. If not found via pages, try direct /me profile
      if (!discoveredAccount) {
        const meRes = await fetch(`${GRAPH_API_BASE}/me?fields=id,name,username,profile_picture_url,followers_count&access_token=${encodeURIComponent(cleanToken)}`);
        if (meRes.ok) {
          const meData = await meRes.json();
          discoveredAccount = {
            id: meData.id,
            username: meData.username || username || meData.name || "instagram_user",
            name: meData.name || "Instagram Account",
            avatar: meData.profile_picture_url || "",
            followers: meData.followers_count ? String(meData.followers_count) : "0",
            pageAccessToken: cleanToken,
          };
        } else {
          const errorData = await meRes.json();
          return NextResponse.json({
            error: errorData.error?.message || "Invalid Meta Access Token. Could not verify with Meta Graph API.",
          }, { status: 400 });
        }
      }
    } catch (apiErr: any) {
      return NextResponse.json({
        error: `Meta Graph API request failed: ${apiErr.message}`,
      }, { status: 502 });
    }

    if (!discoveredAccount) {
      return NextResponse.json({
        error: "No Instagram Professional (Business or Creator) account found attached to this Meta token. Please ensure your Instagram account is linked to a Facebook Page in Meta Business Suite.",
      }, { status: 400 });
    }

    const finalToken = discoveredAccount.pageAccessToken || cleanToken;
    const newAccount: SocialAccount = {
      id: `ig_${discoveredAccount.id || uuidv4().substring(0, 8)}`,
      platform: "instagram",
      name: discoveredAccount.name,
      username: `@${discoveredAccount.username.replace(/^@/, '')}`,
      avatar: discoveredAccount.avatar,
      followers: discoveredAccount.followers,
      connectedAt: new Date().toISOString(),
      isActive: true,
      status: "connected",
      lastSyncAt: new Date().toISOString(),
      dailyReplies: 0,
      totalReplies: 0,
      webhookVerifyToken: `ig_wh_${uuidv4().substring(0, 8)}`,
      accessToken: encryptToken(finalToken),
    };

    db.socialAccounts = db.socialAccounts.filter((a) => a.platform !== "instagram");
    db.socialAccounts.unshift(newAccount);
    await saveDB(db, sessionEmail);

    return NextResponse.json({
      success: true,
      account: newAccount,
      message: `Connected to real Instagram Professional account: ${newAccount.username}!`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to connect Instagram" },
      { status: 500 }
    );
  }
}
