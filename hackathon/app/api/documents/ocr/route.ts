import { NextResponse } from "next/server";
import { analyzeDocumentDescriptors } from "@/lib/document-intelligence";
import { z } from "zod";

const ocrRequestSchema = z.object({
  documents: z.array(
    z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      size: z.number().int().min(0),
    }),
  ),
});

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = ocrRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const analysis = analyzeDocumentDescriptors(parsed.data.documents);
  return NextResponse.json({ data: analysis });
}
