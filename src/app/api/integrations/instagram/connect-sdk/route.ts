import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { getSessionUser } from "@/backend/auth";
import { getDB, saveDB, encryptToken, InstagramConnection, InstagramAccount } from "@/database/db";

export const dynamic = "force-dynamic";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

export async function POST(req: NextRequest) {
  try {
    let userEmail = "subhransu.nayak.418@gmail.com";
    const user = getSessionUser(req);
    if (user?.email) userEmail = user.email;

    const body = await req.json();
    const { accessToken: rawAccessToken } = body;

    if (!rawAccessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 });
    }

    const metaAppId = process.env.META_APP_ID || process.env.INSTAGRAM_CLIENT_ID || "1617767409877904";
    const metaAppSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || "";

    // 1. Attempt to upgrade to long-lived 60-day token
    let accessToken = rawAccessToken;
    let expiresInSec = 5184000; // 60 days default

    if (metaAppId && metaAppSecret) {
      try {
        const longLivedUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
        longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
        longLivedUrl.searchParams.set("client_id", metaAppId);
        longLivedUrl.searchParams.set("client_secret", metaAppSecret);
        longLivedUrl.searchParams.set("fb_exchange_token", rawAccessToken);

        const llRes = await fetch(longLivedUrl.toString());
        if (llRes.ok) {
          const llData = await llRes.json();
          if (llData.access_token) {
            accessToken = llData.access_token;
            expiresInSec = llData.expires_in || 5184000;
          }
        }
      } catch (err) {
        console.warn("[Instagram Connect SDK] Long-lived exchange warning:", err);
      }
    }

    // 2. Query Me & Pages
    let appSecretProof = "";
    if (metaAppSecret) {
      appSecretProof = crypto.createHmac("sha256", metaAppSecret).update(accessToken).digest("hex");
    }

    const meUrl = new URL(`${GRAPH_API_BASE}/me`);
    meUrl.searchParams.set("fields", "id,name,email");
    meUrl.searchParams.set("access_token", accessToken);
    if (appSecretProof) meUrl.searchParams.set("appsecret_proof", appSecretProof);

    const meRes = await fetch(meUrl.toString());
    const meData = await meRes.json();

    const accountsUrl = new URL(`${GRAPH_API_BASE}/me/accounts`);
    accountsUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}");
    accountsUrl.searchParams.set("access_token", accessToken);
    if (appSecretProof) accountsUrl.searchParams.set("appsecret_proof", appSecretProof);

    const accountsRes = await fetch(accountsUrl.toString());
    const accountsData = await accountsRes.json();

    const pages = accountsData.data || [];
    let linkedIg: any = null;
    let linkedPage: any = null;

    for (const page of pages) {
      if (page.instagram_business_account) {
        linkedIg = page.instagram_business_account;
        linkedPage = page;
        break;
      }
    }

    const igId = linkedIg?.id || `ig_${meData.id || uuidv4().substring(0, 8)}`;
    const igUsername = linkedIg?.username || meData.name?.toLowerCase().replace(/\s+/g, "_") || "instagram_user";
    const igName = linkedIg?.name || meData.name || "Instagram Account";
    const igAvatar = linkedIg?.profile_picture_url || "";

    // 3. Encrypt Token
    const encryptedToken = encryptToken(accessToken);
    const now = new Date().toISOString();
    const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    const igAccount: InstagramAccount = {
      id: igId,
      tenantId: userEmail,
      workspaceId: "ws_default",
      providerAccountId: igId,
      username: igUsername,
      name: igName,
      profilePictureUrl: igAvatar,
      followersCount: linkedIg?.followers_count || 0,
      mediaCount: 0,
      status: "ACTIVE",
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const igConnection: InstagramConnection = {
      id: uuidv4(),
      tenantId: userEmail,
      workspaceId: "ws_default",
      status: "CONNECTED",
      instagramAccountId: igId,
      facebookPageId: linkedPage?.id || meData.id || "page_default",
      accountType: "BUSINESS",
      username: igUsername,
      name: igName,
      profilePictureUrl: igAvatar,
      encryptedAccessToken: encryptedToken,
      tokenExpiresAt,
      scopes: [
        "instagram_basic",
        "instagram_manage_comments",
        "instagram_manage_messages",
        "pages_show_list",
      ],
      webhookStatus: "active",
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // 4. Save to DB
    const db = await getDB(userEmail);
    db.instagramConnections = [
      igConnection,
      ...(db.instagramConnections || []).filter((c) => c.status !== "CONNECTED"),
    ];

    const existingAccounts = (db.instagramAccounts || []).filter((a) => a.id !== igId);
    db.instagramAccounts = [igAccount, ...existingAccounts];

    await saveDB(db, userEmail);

    return NextResponse.json({
      success: true,
      account: igAccount,
      connection: {
        status: igConnection.status,
        username: igConnection.username,
        tokenExpiresAt: igConnection.tokenExpiresAt,
      },
    });
  } catch (err) {
    console.error("[Instagram Connect SDK] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to connect Instagram via SDK" },
      { status: 500 }
    );
  }
}
