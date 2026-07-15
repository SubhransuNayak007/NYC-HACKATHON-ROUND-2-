import { NextResponse } from "next/server";
import { FeedbackClusteringEngine } from "@/backend/intelligence/FeedbackClusteringEngine";
import { MultimodalVideoEngine } from "@/backend/intelligence/MultimodalVideoEngine";

export const runtime = "nodejs";

export async function GET() {
  try {
    const clusters = await FeedbackClusteringEngine.getClusters();
    const contentGaps = await MultimodalVideoEngine.getContentGaps();
    return NextResponse.json({ ok: true, clusters, contentGaps });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
