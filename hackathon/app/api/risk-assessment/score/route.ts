import { NextResponse } from "next/server";
import { assessApplication } from "@/lib/risk-engine";
import { riskInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = riskInputSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const assessment = assessApplication(parsed.data);
  return NextResponse.json({ data: assessment });
}
