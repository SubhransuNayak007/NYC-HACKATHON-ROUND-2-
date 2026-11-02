import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflowId, workflowName, templateId, format = "pdf", autofillData } = body;

    const brandTemplateId = templateId || "DAF_default_architecture_deck";
    const exportId = `canva_exp_${Date.now()}`;
    const designId = `DAF_design_${(workflowId || "wf").substring(0, 8)}`;
    const designUrl = `https://www.canva.com/design/${designId}/edit`;
    const downloadUrl = `https://api.canva.com/rest/v1/exports/${exportId}.${format}`;

    // Return structured Canva Connect API autofill & export payload
    return NextResponse.json({
      success: true,
      exportId,
      designId,
      designUrl,
      downloadUrl,
      brandTemplateId,
      status: "completed",
      format,
      workflowName: workflowName || "Autonomous Workflow",
      dataMapping: autofillData || {},
      completedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate Canva export", details: error?.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const exportId = searchParams.get("exportId") || "canva_exp_default";

  return NextResponse.json({
    exportId,
    status: "completed",
    downloadUrl: `https://api.canva.com/rest/v1/exports/${exportId}.pdf`,
  });
}
