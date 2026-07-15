import { NextResponse } from "next/server";
import { BusinessCopilot } from "@/backend/intelligence/BusinessCopilot";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body.query || "What should we do next?";
    const response = await BusinessCopilot.query(query);
    return NextResponse.json({ ok: true, ...response });
  } catch (err: any) {
    console.error("[Copilot API Error]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "What should we do next?";
  const response = await BusinessCopilot.query(q);
  return NextResponse.json({ ok: true, ...response });
}
