import { NextResponse } from "next/server";
import { EpistemicKnowledgeGraph } from "@/backend/intelligence/KnowledgeGraph";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const type = searchParams.get("type") as any;

    const [items, coverage] = await Promise.all([
      EpistemicKnowledgeGraph.queryMemory({ searchQuery: q, epistemicType: type }),
      EpistemicKnowledgeGraph.getKnowledgeCoverage(),
    ]);

    return NextResponse.json({ ok: true, items, coverage });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
