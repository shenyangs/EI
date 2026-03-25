import { NextRequest, NextResponse } from 'next/server';
import { healthCheck, logger, performanceMonitor, errorTracker } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  try {
    const health = await healthCheck();
    const metrics = performanceMonitor.getAllMetrics();
    const errorStats = errorTracker.getErrorStats();
    
    return NextResponse.json({
      status: health.status,
      timestamp: new Date().toISOString(),
      checks: health.checks,
      metrics,
      errors: errorStats
    });
  } catch (error) {
    logger.error('Health check failed', error instanceof Error ? error : undefined);
    
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}
