import { NextResponse } from 'next/server';

import { getPublicSystemRuntime } from '@/lib/server/admin-governance';

export async function GET() {
  return NextResponse.json({
    ok: true,
    config: getPublicSystemRuntime()
  });
}
