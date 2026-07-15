import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authModule = await import("@/backend/auth");
    const auth = authModule.getUserFromCookies(req.headers.get("cookie"));
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbModule = await import("@/database/db");
    const db = await dbModule.getDB(auth.sub);

    return NextResponse.json({ settings: db.waSettings || null });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authModule = await import("@/backend/auth");
    const auth = authModule.getUserFromCookies(req.headers.get("cookie"));
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const dbModule = await import("@/database/db");
    const db = await dbModule.getDB(auth.sub);

    db.waSettings = { ...(db.waSettings || {}), ...body } as typeof db.waSettings;
    await dbModule.saveDB(db, auth.sub);

    return NextResponse.json({ settings: db.waSettings });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
