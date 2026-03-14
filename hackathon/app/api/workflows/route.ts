import { NextResponse } from "next/server";
import { listWorkflows, updateWorkflowDefinition } from "@/lib/repository";
import { workflowUpdateSchema } from "@/lib/validators";

export async function GET() {
  const workflows = await listWorkflows();
  return NextResponse.json({ data: workflows });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const parsed = workflowUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workflow = await updateWorkflowDefinition(parsed.data.workflowId, {
    name: parsed.data.name,
    config: parsed.data.config,
  });

  return NextResponse.json({ data: workflow });
}
