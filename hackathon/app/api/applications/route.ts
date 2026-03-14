import { NextResponse } from "next/server";
import { createScoredApplication, listApplications } from "@/lib/repository";
import { applicationPayloadSchema } from "@/lib/validators";

export async function GET() {
  const applications = await listApplications();
  return NextResponse.json({ data: applications });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = applicationPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sourceInputs = [], ...applicationPayload } = parsed.data;
  const { application, assessment } = await createScoredApplication(applicationPayload, "Partner API", {
    sourceInputs,
  });

  return NextResponse.json({ data: { application, assessment } }, { status: 201 });
}
