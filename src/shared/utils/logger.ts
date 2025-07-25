import { env } from '../config/environment.js';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Logger simples com níveis e cores
 * Mantém simplicidade sem dependências externas
 */
class Logger {
  private readonly logLevel: LogLevel;
  
  private readonly colors = {
    error: '\x1b[31m', // Red
    warn: '\x1b[33m',  // Yellow  
    info: '\x1b[36m',  // Cyan
    debug: '\x1b[90m', // Gray
    reset: '\x1b[0m'   // Reset
  };

  private readonly levels = {
    error: 0,
    warn: 1, 
    info: 2,
    debug: 3
  };

  constructor(logLevel: LogLevel = env.LOG_LEVEL) {
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const color = this.colors[level];
    const levelText = level.toUpperCase().padEnd(5);
    
    console.log(
      `${color}[${timestamp}] ${levelText}${this.colors.reset} ${message}`,
      ...args
    );
  }

  error(message: string, ...args: unknown[]): void {
    this.formatMessage('error', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.formatMessage('warn', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.formatMessage('info', message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.formatMessage('debug', message, ...args);
  }
}

export const logger = new Logger(); 