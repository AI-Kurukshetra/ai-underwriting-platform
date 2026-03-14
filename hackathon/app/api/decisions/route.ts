import { NextResponse } from "next/server";
import { createDecision } from "@/lib/repository";
import { decisionPayloadSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = decisionPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const decision = await createDecision(parsed.data);
  return NextResponse.json({ data: decision }, { status: 201 });
}
