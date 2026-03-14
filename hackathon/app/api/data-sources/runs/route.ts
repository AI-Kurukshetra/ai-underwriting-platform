import { NextResponse } from "next/server";
import { createIngestionRun, ingestApplicationSource } from "@/lib/repository";
import { ingestionRunSchema, sourceIngestionSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const sourceParsed = sourceIngestionSchema.safeParse(payload);

  if (!sourceParsed.success) {
    return NextResponse.json({ error: sourceParsed.error.flatten() }, { status: 400 });
  }

  if (payload.applicationId) {
    const source = await ingestApplicationSource(
      payload.applicationId,
      sourceParsed.data,
      payload.triggeredBy ?? "Partner API",
      payload.organizationId,
    );

    return NextResponse.json({ data: source }, { status: 201 });
  }

  const runParsed = ingestionRunSchema.safeParse({
    applicationId: payload.applicationId,
    sourceType: sourceParsed.data.sourceType,
    providerName: sourceParsed.data.providerName,
    status: sourceParsed.data.status === "ingested" ? "succeeded" : sourceParsed.data.status === "warning" ? "partial" : "failed",
    recordsProcessed: sourceParsed.data.recordsProcessed ?? 1,
    triggeredBy: payload.triggeredBy ?? "Partner API",
    detail: sourceParsed.data.detail,
  });

  if (!runParsed.success) {
    return NextResponse.json({ error: runParsed.error.flatten() }, { status: 400 });
  }

  const run = await createIngestionRun(runParsed.data, payload.organizationId);
  return NextResponse.json({ data: run }, { status: 201 });
}
