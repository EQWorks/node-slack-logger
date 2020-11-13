
export type Levels = 0 | 1 | 2 | 3 |4;

export const enum levels {
  DEBUG = 0,
  INFO,
  WARNING,
  ERROR,
  CRITICAL,
}

export type LevelNames = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LoggerOptions {
  slackHook: string;
  appName?: string;
  minLevel?: Levels | LevelNames;
  colors?: Record<Levels, string>;
}

export type LogEventContext = Record<string | number, any>

export interface LogEventOptions {
  message: string;
  stack?: string;
  context?: LogEventContext;
}

export interface Logger {
  setOptions(options: LoggerOptions): void;
  log(
    level: Levels | LevelNames,
    errorOrMessageOrOptions: Error | string | LogEventOptions,
    context?: LogEventContext,
  ): Promise<void>;
  debug(
    errorOrMessageOrOptions: Error | string | LogEventOptions,
    context?: LogEventContext,
  ): Promise<void>;
  info(
    errorOrMessageOrOptions: Error | string | LogEventOptions,
    context?: LogEventContext,
  ): Promise<void>;
  warning(
    errorOrMessageOrOptions: Error | string | LogEventOptions,
    context?: LogEventContext,
  ): Promise<void>;
  error(
    errorOrMessageOrOptions: Error | string | LogEventOptions,
    context?: LogEventContext,
  ): Promise<void>;
  critical(
    errorOrMessageOrOptions: Error | string | LogEventOptions,
    context?: LogEventContext,
  ): Promise<void>;
}

function getLogger(idOrOptions: string | number, options: LoggerOptions): Logger;
export function getLogger(idOrOptions?: string | number | LoggerOptions): Logger;
