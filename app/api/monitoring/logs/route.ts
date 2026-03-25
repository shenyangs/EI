import { NextRequest, NextResponse } from 'next/server';
import { logger, errorTracker } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '100');
    const level = searchParams.get('level') as any;
    const type = searchParams.get('type') || 'logs'; // 'logs' or 'errors'
    
    if (type === 'errors') {
      const errors = errorTracker.getRecentErrors(count);
      return NextResponse.json({ errors });
    }
    
    const logs = logger.getRecentLogs(count, level);
    const stats = logger.getLogStats();
    
    return NextResponse.json({
      logs,
      stats,
      count: logs.length
    });
  } catch (error) {
    logger.error('Failed to get logs', error instanceof Error ? error : undefined);
    
    return NextResponse.json(
      { error: 'Failed to get logs' },
      { status: 500 }
    );
  }
}
