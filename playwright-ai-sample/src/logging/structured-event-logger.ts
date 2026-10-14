export type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
  testName: string;
  stepName?: string;
  stepIndex?: number;
  actionIndex?: number;
  actionType?: string;
  attempt?: number;
  strategyKind?: string;
}

export interface LogEvent extends LogContext {
  timestamp: string;
  level: LogLevel;
  event: string;
  durationMs?: number;
  error?: string;
  [key: string]: unknown;
}

export class StructuredEventLogger {
  constructor(private readonly sink: (event: LogEvent) => void = (event) => console.log(JSON.stringify(event))) {}

  log(level: LogLevel, event: string, context: LogContext, details: Record<string, unknown> = {}): void {
    this.sink({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...context,
      ...details
    });
  }

  info(event: string, context: LogContext, details?: Record<string, unknown>): void {
    this.log('info', event, context, details);
  }

  warn(event: string, context: LogContext, details?: Record<string, unknown>): void {
    this.log('warn', event, context, details);
  }

  error(event: string, context: LogContext, details?: Record<string, unknown>): void {
    this.log('error', event, context, details);
  }
}
