// 日志系统
// 支持多种日志级别和输出方式

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logFilePath?: string;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private maxLogsInMemory = 1000;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: config.minLevel || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile || false,
      logFilePath: config.logFilePath || './logs/app.log',
      enableRemote: config.enableRemote || false,
      remoteEndpoint: config.remoteEndpoint
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    let message = `[${timestamp}] ${level} ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      message += ` | Context: ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.error) {
      message += ` | Error: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\n${entry.error.stack}`;
      }
    }
    
    return message;
  }

  private async writeToConsole(entry: LogEntry): Promise<void> {
    const formattedMessage = this.formatLogEntry(entry);
    
    switch (entry.level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
      case 'fatal':
        console.error(formattedMessage);
        break;
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    // 在实际应用中，这里应该写入文件
    // 由于我们使用的是内存存储，这里只记录到内存中
    this.logs.push(entry);
    
    // 限制内存中的日志数量
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs = this.logs.slice(-this.maxLogsInMemory);
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) {
      return;
    }

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.error('Failed to send log to remote endpoint:', error);
    }
  }

  private async log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    };

    // 并行写入所有启用的输出
    const promises: Promise<void>[] = [];

    if (this.config.enableConsole) {
      promises.push(this.writeToConsole(entry));
    }

    if (this.config.enableFile) {
      promises.push(this.writeToFile(entry));
    }

    if (this.config.enableRemote) {
      promises.push(this.sendToRemote(entry));
    }

    await Promise.all(promises);
  }

  // 公共日志方法
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('error', message, context, error);
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('fatal', message, context, error);
  }

  // 获取最近的日志
  getRecentLogs(count: number = 100, level?: LogLevel): LogEntry[] {
    let logs = this.logs;
    
    if (level) {
      logs = logs.filter(log => LOG_LEVELS[log.level] >= LOG_LEVELS[level]);
    }
    
    return logs.slice(-count);
  }

  // 清除日志
  clearLogs(): void {
    this.logs = [];
  }

  // 获取日志统计
  getLogStats(): Record<LogLevel, number> {
    const stats: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0
    };

    this.logs.forEach(log => {
      stats[log.level]++;
    });

    return stats;
  }
}

// 创建全局日志实例
export const logger = new Logger({
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableConsole: true,
  enableFile: true,
  enableRemote: false
});

// 请求日志中间件
export function requestLogger(request: Request, response: Response, duration: number): void {
  const url = new URL(request.url);
  const context = {
    method: request.method,
    path: url.pathname,
    query: url.search,
    status: response.status,
    duration: `${duration}ms`,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  };

  if (response.status >= 500) {
    logger.error('Request failed', undefined, context);
  } else if (response.status >= 400) {
    logger.warn('Request warning', context);
  } else {
    logger.info('Request completed', context);
  }
}

// 性能监控
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // 只保留最近1000个值
    if (values.length > 1000) {
      values.shift();
    }
  }

  getMetricStats(name: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { avg, min, max, count: values.length };
  }

  getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [name] of this.metrics) {
      const stats = this.getMetricStats(name);
      if (stats) {
        result[name] = stats;
      }
    }
    
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// 错误追踪
export class ErrorTracker {
  private errors: Array<{
    timestamp: string;
    message: string;
    stack?: string;
    context?: Record<string, any>;
  }> = [];
  private maxErrors = 100;

  trackError(error: Error, context?: Record<string, any>): void {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context
    };

    this.errors.push(errorEntry);

    // 限制错误数量
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // 记录到日志
    logger.error(error.message, error, context);
  }

  getRecentErrors(count: number = 10): Array<{
    timestamp: string;
    message: string;
    stack?: string;
    context?: Record<string, any>;
  }> {
    return this.errors.slice(-count);
  }

  getErrorStats(): {
    total: number;
    uniqueMessages: number;
    byHour: Record<string, number>;
  } {
    const uniqueMessages = new Set(this.errors.map(e => e.message));
    
    const byHour: Record<string, number> = {};
    this.errors.forEach(error => {
      const hour = error.timestamp.substring(0, 13); // YYYY-MM-DDTHH
      byHour[hour] = (byHour[hour] || 0) + 1;
    });

    return {
      total: this.errors.length,
      uniqueMessages: uniqueMessages.size,
      byHour
    };
  }

  clearErrors(): void {
    this.errors = [];
  }
}

// 创建全局错误追踪实例
export const errorTracker = new ErrorTracker();

// 健康检查
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: 'pass' | 'fail'; message?: string }>;
}> {
  const checks: Record<string, { status: 'pass' | 'fail'; message?: string }> = {};

  // 检查内存使用
  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  if (memoryUsagePercent > 90) {
    checks.memory = { status: 'fail', message: `Memory usage is ${memoryUsagePercent.toFixed(1)}%` };
  } else if (memoryUsagePercent > 70) {
    checks.memory = { status: 'pass', message: `Memory usage is ${memoryUsagePercent.toFixed(1)}% (high)` };
  } else {
    checks.memory = { status: 'pass', message: `Memory usage is ${memoryUsagePercent.toFixed(1)}%` };
  }

  // 检查错误率
  const errorStats = errorTracker.getErrorStats();
  const recentErrors = errorStats.byHour[Object.keys(errorStats.byHour).pop() || ''] || 0;
  
  if (recentErrors > 10) {
    checks.errors = { status: 'fail', message: `${recentErrors} errors in the last hour` };
  } else if (recentErrors > 5) {
    checks.errors = { status: 'pass', message: `${recentErrors} errors in the last hour (elevated)` };
  } else {
    checks.errors = { status: 'pass', message: `${recentErrors} errors in the last hour` };
  }

  // 确定整体状态
  const failedChecks = Object.values(checks).filter(c => c.status === 'fail').length;
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (failedChecks > 0) {
    status = 'degraded';
  }
  if (failedChecks > 1) {
    status = 'unhealthy';
  }

  return { status, checks };
}
