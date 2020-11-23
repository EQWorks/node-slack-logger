
export type LogLevels = 1 | 2 | 3 | 4 | 5;

export const enum logLevels {
  DEBUG = 1,
  INFO,
  WARNING,
  ERROR,
  CRITICAL,
}

export type LogLevelNames = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogEventTrail {
  scope?: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface LogEventValues {
  appName: string;
  level: LogLevels;
  levelName: string;
  color: string;
  name?: string;
  message: string;
  stack?: string;
  trail: LogEventTrail;
  context: LogEventContext;
}

export type LogFormats = 1

export const enum logFormats {
  SLACK = 1,
}

export type LogFormatNames = 'SLACK'

export interface LoggerConfig {
  send: (body: string | Object) => Promise<any>;
  format?: LogFormats | LogFormatNames | ((logValues: LogEventValues) => string | Object);
  appName?: string;
  minLevel?: LogLevels | LogLevelNames;
  colors?: Record<LogLevels, string>;
}

export type LogEventContext = Record<string | number, any>

export interface LogEventOptions {
  message: string;
  stack?: string;
  context?: LogEventContext;
}

export interface Logger {
  setConfig(config: LoggerConfig): void;
  log(
    level: LogLevels | LogLevelNames,
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

export function getLogger(idOrConfig: string | number, config: LoggerConfig): Logger;
export function getLogger(idOrConfig?: string | number | LoggerConfig): Logger;
