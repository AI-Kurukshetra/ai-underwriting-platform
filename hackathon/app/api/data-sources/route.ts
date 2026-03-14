import { NextResponse } from "next/server";
import { createDataSourceConnection, listDataSourceConnections, listIngestionRuns } from "@/lib/repository";
import { dataSourceConnectionSchema } from "@/lib/validators";

export async function GET() {
  const [connections, runs] = await Promise.all([listDataSourceConnections(), listIngestionRuns()]);
  return NextResponse.json({ data: { connections, runs } });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = dataSourceConnectionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const connection = await createDataSourceConnection(parsed.data, payload.organizationId);
  return NextResponse.json({ data: connection }, { status: 201 });
}
