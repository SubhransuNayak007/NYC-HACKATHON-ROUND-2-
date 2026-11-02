import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { WorkflowCompiler } from "@/backend/automation/compiler/WorkflowCompiler";
import { WorkflowSpec, RuntimeTarget } from "@/backend/automation/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/workflows/compile
 * Validates WorkflowSpec v2.0 and compiles it into the designated runtime format.
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";

    const body = await req.json();
    const spec: WorkflowSpec = body.spec;
    const target: RuntimeTarget = body.runtimeTarget || spec.runtimeTarget || "n8n";

    if (!spec) {
      return NextResponse.json(
        { error: "Workflow specification is required." },
        { status: 400 }
      );
    }

    // 1. Static Graph & Schema Validation
    const validation = WorkflowCompiler.validate(spec);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Workflow validation failed.",
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 422 }
      );
    }

    // 2. Target Compilation
    let compiledArtifact: any = null;
    if (target === "n8n") {
      compiledArtifact = WorkflowCompiler.compileToN8n(spec);
    } else if (target === "langgraph") {
      compiledArtifact = WorkflowCompiler.compileToLangGraph(spec);
    } else {
      compiledArtifact = {
        runtime: "native",
        nodes: spec.steps,
        trigger: spec.trigger,
      };
    }

    const syntheticTests = WorkflowCompiler.generateSyntheticTests(spec);

    return NextResponse.json({
      success: true,
      runtimeTarget: target,
      compiledArtifact,
      validation,
      syntheticTests,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Compilation failed." },
      { status: 500 }
    );
  }
}
