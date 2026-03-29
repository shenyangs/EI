import { NextResponse } from "next/server";

import { getAiStatusPayload } from "@/lib/ai-status";

export async function GET() {
  return NextResponse.json(await getAiStatusPayload());
}
