import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, Channel } from "@/database/db";

export async function GET() {
  const db = await getDB();
  return NextResponse.json(db.channels);
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { channelId, automatedVideos } = body;

    if (!channelId || !Array.isArray(automatedVideos)) {
      return NextResponse.json({ error: "Missing channelId or automatedVideos array" }, { status: 400 });
    }

    const db = await getDB();
    const chIdx = db.channels.findIndex((c) => c.id === channelId);

    if (chIdx === -1) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    db.channels[chIdx].automatedVideos = automatedVideos;
    await saveDB(db);
    
    await logActivity(db.userSession?.name || "Creator", `Updated automated videos selection for channel '${db.channels[chIdx].name}'`);

    return NextResponse.json({ success: true, channel: db.channels[chIdx] });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to update channel videos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, handle } = body;
    
    if (!name || !handle) {
      return NextResponse.json({ error: "Missing name or handle" }, { status: 400 });
    }

    const db = await getDB();
    
    // Generate a unique channel ID
    const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
    const id = `ch-${Date.now()}`;
    const subsNum = Math.floor(Math.random() * 500) + 10; // 10K to 509K
    
    const newChannel: Channel = {
      id,
      name,
      handle: cleanHandle,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=150`,
      status: "active",
      subscribers: `${subsNum}K`,
      automatedVideos: []
    };

    db.channels.push(newChannel);
    await saveDB(db);
    
    await logActivity(db.userSession?.name || "Creator", `Connected channel ${name} (${cleanHandle})`);
    
    return NextResponse.json(newChannel, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to connect channel" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { channelId } = body;

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    const db = await getDB();
    const chIdx = db.channels.findIndex((c) => c.id === channelId);

    if (chIdx === -1) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const channelName = db.channels[chIdx].name;
    db.channels.splice(chIdx, 1);
    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", `Disconnected YouTube channel: ${channelName}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to disconnect channel" }, { status: 500 });
  }
}
