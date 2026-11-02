import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflow, format = "json" } = body;

    if (!workflow) {
      return NextResponse.json({ error: "Missing workflow definition" }, { status: 400 });
    }

    if (format === "n8n") {
      // Compile to n8n format
      const n8nWorkflow = {
        name: workflow.name,
        nodes: (workflow.nodes || []).map((n: any, idx: number) => ({
          id: n.id,
          name: n.label || n.id,
          type: n.service || "n8n-nodes-base.httpRequest",
          typeVersion: 1,
          position: [100 + idx * 260, 200],
          parameters: n.parameters || {},
        })),
        connections: {},
        active: false,
        settings: { executionOrder: "v1" },
      };

      return NextResponse.json({
        format: "n8n",
        data: n8nWorkflow,
        filename: `${workflow.name.toLowerCase().replace(/\s+/g, "_")}_n8n.json`,
      });
    }

    // Default: native JSON definition
    return NextResponse.json({
      format: "native",
      data: workflow,
      filename: `${workflow.name.toLowerCase().replace(/\s+/g, "_")}.json`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Export compilation failed", details: err?.message },
      { status: 500 }
    );
  }
}
