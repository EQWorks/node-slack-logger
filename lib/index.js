/* eslint-disable no-multiple-empty-lines */
const assert = require('assert')
const path = require('path')

const { logLevels, logLevelNames, _defaultColors } = require('./constants')
const { logFormats, logFormatNames, _defaultFormats } = require('./formats')


/**
 * Log event trail
 * @typedef {Object} LogEventTrail
 * @property {string} [scope]
 * @property {string} [file]
 * @property {number} [line]
 * @property {number} [column]
 *
 * Log event values
 * @typedef {Object} LogEventValues
 * @property {string} appName
 * @property {number} level
 * @property {string} levelName
 * @property {string} color
 * @property {string} [name] - Event name (extracted from error)
 * @property {string} message - Message to be logged
 * @property {string} [stack]
 * @property {LogEventTrail} trail
 * @property {Object} context - Context values to log along with event (e.g. username, email...)
 *
 * Logger config options
 * @typedef {Object} LoggerConfig
 * @property {(string|Object) => Promise<any>} send - Callback function accepting the formatted
 * API payload. Callback should implement proper error handling to avoid application shutdowns.
 * @property {number|string|((LogEventValues) => string|Object)} [format=logFormats.SLACK] -
 * Callback function taking in log event values and returning the API payload. Defaults
 * to Slack payload.
 * @property {string} [appName='My App'] - Application name.
 * @property {string|number} [minLevel=logLevels.WARNING] - Only events with level greater
 * or equal to minLevel will be pushed to Slack.
 * @property {Object} colors - Map of log levels (keys - numbers) to colors (values - strings)
 *
 * Log event options
 * @typedef {Object} LogEventOptions
 * @property {string} message - Message to log.
 * @property {string} [stack] - Error stack.
 * @property {Object} [context] - Context values to log along with event (e.g. username, email...)
 */

// takes string or number and returns number value
const _getLevel = (level) => {
  if (level in logLevelNames) {
    return level
  }
  if (level in logLevels) {
    return logLevels[level]
  }
  throw new Error(`Unknown level: ${level}`)
}

// takes string, number or function and returns function
const _getFormat = (format) => {
  if (format in logFormatNames) {
    return _defaultFormats[format]
  }
  if (format in logFormats) {
    return _defaultFormats[logFormats[format]]
  }
  if (typeof format === 'function') {
    return format
  }
  throw new Error('Invalid format function')
}

const _errorTrailRE = /at(?:\s(\S*))?\s\(?([^\s)]+):(\d+):(\d+)\)?/ // scope, path, line, column

// extracts scope, path, line, column from error stack
const _getTrailFromErrorStack = (stack, excludeCurrentModule = false) => {
  const re = excludeCurrentModule ? RegExp(_errorTrailRE, 'g') : _errorTrailRE
  while (true) {
    const matches = re.exec(stack)
    if (!matches) {
      return {}
    }
    const [, scope, file, line, column] = matches
    if (excludeCurrentModule && file === __filename) {
      continue
    }
    return {
      scope,
      file: path.relative(require.main.path, file),
      line: parseInt(line, 10),
      column: parseInt(column, 10),
    }
  }
}

// extract log values from input
const _getLogValues = ({ appName, level, colors, errorOrMessageOrOptions, context }) => {
  let name
  let message
  let trail
  let stack
  let optionsContext
  if (typeof errorOrMessageOrOptions === 'string') {
    message = errorOrMessageOrOptions
    trail = _getTrailFromErrorStack(Error().stack, true)
  } else {
    ({ name, message, stack, context: optionsContext } = errorOrMessageOrOptions)
    trail = _getTrailFromErrorStack(stack || Error().stack, Boolean(stack))
  }

  return {
    appName,
    level,
    levelName: logLevelNames[level],
    color: (colors && colors[level]) || _defaultColors[level],
    name,
    message,
    stack,
    trail,
    // context takes precedence over errorOrMessageOrOptions.context
    context: context || optionsContext || {},
  }
}

class Logger {
  constructor(config) {
    this.setConfig(config)
  }

  /**
   * Sets the logger config options
   * @param {LoggerConfig} config - Logger setup options
   */
  setConfig(config) {
    let send
    let format
    let appName
    let minLevel
    let colors
    // validate input
    try {
      // will throw if config is not an object or config === null
      ({
        send = this._send,
        format = this._format || logFormats.SLACK,
        appName = this._appName || 'My App',
        minLevel = this._minLevel || logLevels.WARNING,
        colors = this._colors,
      } = config)
      assert(
        typeof send === 'function'
        && (typeof format === 'function' || format in logFormats || format in logFormatNames)
        && (minLevel in logLevels || minLevel in logLevelNames)
        && typeof appName === 'string' && appName
        && ['undefined', 'object'].includes(typeof colors) && colors !== null,
      )
    } catch (_) {
      // eslint-disable-next-line max-len
      throw new Error('Invalid arguments. Required: send (function). Optional: format (string|number|function=1), level (string|number=3), appName (string=\'My App\'), colors (object)')
    }
    this._send = send
    this._format = _getFormat(format)
    this._appName = appName
    this._minLevel = _getLevel(minLevel)
    this._colors = colors
  }

  /**
   * Posts a log event to Slack
   * @param {string|number} level - Log event level
   * @param {LogEventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Superceded by errorOrMessageOrOptions.context, if exists.
   * @returns {Promise<undefined>}
   */
  async log(level, errorOrMessageOrOptions, context) {
    try {
      // validate input
      assert(
        (level in logLevels || level in logLevelNames)
        && errorOrMessageOrOptions && (
          typeof errorOrMessageOrOptions === 'string'
          || (
            typeof errorOrMessageOrOptions === 'object'
            && typeof errorOrMessageOrOptions.message === 'string'
            && errorOrMessageOrOptions.message
            && ['undefined', 'string'].includes(typeof errorOrMessageOrOptions.name)
            && ['undefined', 'string'].includes(typeof errorOrMessageOrOptions.stack)
            && ['undefined', 'object'].includes(typeof errorOrMessageOrOptions.context)
            && errorOrMessageOrOptions.context !== null
          )
        )
        && ['undefined', 'object'].includes(typeof context)
        && context !== null,
      )
    } catch (_) {
      // eslint-disable-next-line max-len
      throw new Error('Invalid arguments. Required: level (string|number), errorOrMessageOrOptions (Error|string|object). Optional: context (object)')
    }

    // don't log if less than minimum level for logger
    const safeLevel = _getLevel(level)
    if (safeLevel < this._minLevel) {
      return
    }

    const logValues = _getLogValues({
      appName: this._appName,
      level: safeLevel,
      colors: this._colors,
      errorOrMessageOrOptions,
      context,
      format: this._format,
    })

    let body
    try {
      body = this._format(logValues)
    } catch (err) {
      throw new Error('Failed to format log event body:', err.message)
    }

    // _send() should implement error catching
    return this._send(body)
  }

  /**
   * Posts a 'DEBUG' log event to Slack
   * @param {LogEventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Supercedes errorOrMessageOrOptions.context.
   * @returns {Promise<undefined>}
   */
  debug(errorOrMessageOrOptions, context) {
    return this.log(logLevels.DEBUG, errorOrMessageOrOptions, context)
  }

  /**
   * Posts an 'INFO' log event to Slack
   * @param {LogEventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Supercedes errorOrMessageOrOptions.context.
   * @returns {Promise<undefined>}
   */
  info(errorOrMessageOrOptions, context) {
    return this.log(logLevels.INFO, errorOrMessageOrOptions, context)
  }

  /**
   * Posts a 'WARNING' log event to Slack
   * @param {LogEventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Supercedes errorOrMessageOrOptions.context.
   * @returns {Promise<undefined>}
   */
  warning(errorOrMessageOrOptions, context) {
    return this.log(logLevels.WARNING, errorOrMessageOrOptions, context)
  }

  /**
   * Posts a 'ERROR' log event to Slack
   * @param {LogEventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Supercedes errorOrMessageOrOptions.context.
   * @returns {Promise<undefined>}
   */
  error(errorOrMessageOrOptions, context) {
    return this.log(logLevels.ERROR, errorOrMessageOrOptions, context)
  }

  /**
   * Posts a 'CRITICAL' log event to Slack
   * @param {LogEventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Supercedes errorOrMessageOrOptions.context.
   * @returns {Promise<undefined>}
   */
  critical(errorOrMessageOrOptions, context) {
    return this.log(logLevels.CRITICAL, errorOrMessageOrOptions, context)
  }
}

// references to loggers
const _loggers = {}

/**
 * Returns the logger attached to the id, if provided, otherwise the default logger.
 * A config object must be passed when calling this function for the first time with a set id.
 * Only the id need be provided (or none if using the default logger) with subsequent invocations.
 * @param {string|number|LoggerConfig} [idOrConfig] - Logger identifier or config options.
 * The default logger will be returned if undefined or of type LoggerConfig.
 * @param {LoggerConfig} [config] - Logger config options
 * @returns {Logger} - Logger object
 */
const getLogger = (idOrConfig, config) => {
  const id = ['string', 'number'].includes(typeof idOrConfig) ? idOrConfig : Symbol.for('default')
  const loggerConfig = typeof idOrConfig === 'object' ? idOrConfig : config

  // existing logger
  if (id in _loggers) {
    if (loggerConfig) {
      _loggers[id].setConfig(loggerConfig)
    }
    return _loggers[id]
  }

  // first invocation - need to instantiate logger
  if (!loggerConfig) {
    throw Error(`${(id === Symbol.for('default')
      ? 'The default logger'
      : `Logger id ${id}`
    )} does not yet exist, please supply config.`)
  }
  _loggers[id] = new Logger(loggerConfig)
  return _loggers[id]
}

module.exports = { getLogger, logLevels, logFormats }
