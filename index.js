/* eslint-disable no-multiple-empty-lines */
const assert = require('assert')
const path = require('path')

const axios = require('axios')


const levels = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4,
}

const levelNames = {
  [levels.DEBUG]: 'DEBUG',
  [levels.INFO]: 'INFO',
  [levels.WARNING]: 'WARNING',
  [levels.ERROR]: 'ERROR',
  [levels.CRITICAL]: 'CRITICAL',
}

const defaultColors = {
  [levels.DEBUG]: '#eee', // gray
  [levels.INFO]: '#0f0', // green
  [levels.WARNING]: '#ff0', // yellow
  [levels.ERROR]: '#f00', // red
  [levels.CRITICAL]: '#f00', // red
}

// takes string or number and returns number value
const _getLevel = (level) => {
  if (level in levelNames) {
    return level
  }
  if (level in levels) {
    return levels[level]
  }
  throw Error(`unknown level: ${level}`)
}


const _errorTrailRE = /at(?:\s(\S*))?\s\(?([^\s\)]+):(\d+):(\d+)\)?/ // scope, path, line, column

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
      column: parseInt(column, 10)
    }
  }
}

// builds Slack payload and posts to webhook
const _putToSlack = async ({ slackHook, appName, level, colors, errorOrMessageOrOptions, context }) => {
  try {
    let message
    let trail
    let stack
    if (typeof errorOrMessageOrOptions === 'string') {
      message = errorOrMessageOrOptions
      trail = _getTrailFromErrorStack(Error().stack, true)
    } else {
      ({ message, stack } = errorOrMessageOrOptions)
      if (errorOrMessageOrOptions.name) {
        message = `${errorOrMessageOrOptions.name}: ${message}`
      }
      trail = _getTrailFromErrorStack(stack || Error().stack, Boolean(stack))
    }

    // prepare slack payload
    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `[${levelNames[level]}] ${appName}`, emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: message },
      },
    ]

    // stack trace
    if (stack) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `\`\`\`${stack}\`\`\`` },
      })
    }

    // time context
    const ts = Math.floor(Date.now() / 1000)
    const contextBlock = {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `<!date^${ts}^{date_num} {time_secs}|2014-02-18 6:39:42 AM EST>`,
        },
      ],
    }

    // trail context
    if (Object.keys(trail).length) {
      const { scope, file, line, column } = trail
      contextBlock.elements.push({
        type: 'plain_text',
        text: `:feelsobserve: ${file}${scope ? `/${scope}` : ''} line ${line}:${column}`,
        emoji: true,
      })
    }

    // custom context fields
    // context object takes precedence over context prop in errorOrMessageOrOptions
    Object.entries(context || errorOrMessageOrOptions.context || {})
      .forEach(([key, value]) => contextBlock.elements.push({
        type: 'plain_text',
        text: `${key}: ${value}`,
        emoji: true,
      }))

    blocks.push(contextBlock)

    const body = {
      attachments: [
        { color: (colors && colors[level]) || defaultColors[level], blocks },
      ],
    }

    // responds with ok if success
    const { data } = await axios.post(slackHook, body)
    if (data !== 'ok') {
      throw Error(`Request to Slack was unsuccessful for message: ${message}`)
    }
  } catch (err) {
    // don't crash app if can't log
    console.log('Failed to log to Slack:', err.message)
  }
}

/**
 * Logger setup options
 * @typedef {Object} loggerOptions
 * @property {string} slackHook - Slack webhook.
 * @property {string|number} [minLevel=levels.WARNING] - Only events with level greater
 * or equal to minLevel will be pushed to Slack.
 * @property {string} [appName='myApp'] - Application name.
 * @property {Object} colors - Map of log levels (keys - numbers) to colors (values - strings)
 *
 * Log event options
 * @typedef {Object} eventOptions
 * @property {string} message - Slack webhook.
 * @property {string} [stack] - Slack webhook.
 * @property {Object} [context] - Context values to log along with event (e.g. username, email...)
 */

class Logger {
  constructor(options) {
    this.setOptions(options)
  }

  /**
   * Sets the logger options
   * @param {loggerOptions} options - Logger setup options
   */
  setOptions(options) {
    let slackHook
    let appName
    let minLevel
    let colors
    // validate input
    try {
      // will throw if options is not an object or options === null
      ({ slackHook, appName = 'myApp', minLevel = levels.WARNING, colors } = options)
      assert(
        typeof slackHook === 'string' && slackHook
        && (minLevel in levels || minLevel in levelNames)
        && typeof appName === 'string' && appName
        && ['undefined', 'object'].includes(typeof colors) && colors !== null,
      )
    } catch (_) {
      // eslint-disable-next-line max-len
      throw new Error('Invalid arguments. Required: slackHook (string). Optional: level (string|number=2), appName (string=myApp), colors (object)')
    }
    this._slackHook = slackHook
    this._minLevel = _getLevel(minLevel)
    this._appName = appName
    this._colors = colors
  }

  /**
   * Posts a log event to Slack
   * @param {string|number} level - Log event level
   * @param {eventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Superceded by errorOrMessageOrOptions.context, if exists.
   * @returns {Promise<undefined>}
   */
  log(level, errorOrMessageOrOptions, context) {
    try {
      // validate input
      assert(
        level in levels || level in levelNames
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
        && context !== null
      )
    } catch (_) {
      throw new Error('Invalid arguments. Required: level (string|number), errorOrMessageOrOptions (Error|string|object). Optional: context (object)')
    }

    // don't log if less than minimum level for logger
    const safeLevel = _getLevel(level)
    if (safeLevel < this._minLevel) {
      return Promise.resolve()
    }

    return _putToSlack({
      slackHook: this._slackHook,
      appName: this._appName,
      level: safeLevel,
      colors: this._colors,
      errorOrMessageOrOptions,
      context,
    })
  }

  /**
   * Posts a 'DEBUG' log event to Slack
   * @param {eventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Supercedes errorOrMessageOrOptions.context.
   * @returns {Promise<undefined>}
   */
  debug(errorOrMessageOrOptions, context) {
    return this.log(levels.DEBUG, errorOrMessageOrOptions, context)
  }

  /**
   * Posts an 'INFO' log event to Slack
   * @param {eventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Supercedes errorOrMessageOrOptions.context.
   * @returns {Promise<undefined>}
   */
  info(errorOrMessageOrOptions, context) {
    return this.log(levels.INFO, errorOrMessageOrOptions, context)
  }

  /**
   * Posts a 'WARNING' log event to Slack
   * @param {eventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Supercedes errorOrMessageOrOptions.context.
   * @returns {Promise<undefined>}
   */
  warning(errorOrMessageOrOptions, context) {
    return this.log(levels.WARNING, errorOrMessageOrOptions, context)
  }

  /**
   * Posts a 'ERROR' log event to Slack
   * @param {eventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Supercedes errorOrMessageOrOptions.context.
   * @returns {Promise<undefined>}
   */
  error(errorOrMessageOrOptions, context) {
    return this.log(levels.ERROR, errorOrMessageOrOptions, context)
  }

  /**
   * Posts a 'CRITICAL' log event to Slack
   * @param {eventOptions} errorOrMessageOrOptions Log event options
   * @param {Object} [context] - Context values to log along with event (e.g. username, email...).
   * Supercedes errorOrMessageOrOptions.context.
   * @returns {Promise<undefined>}
   */
  critical(errorOrMessageOrOptions, context) {
    return this.log(levels.CRITICAL, errorOrMessageOrOptions, context)
  }
}

// references to loggers
const _loggers = {}

/**
 * Returns the logger attached to the id, if provided, otherwise the default logger.
 * Options must be passed when calling thisfunction for the first time with a set id.
 * Only the id need be provided (or none if using the default logger) with subsequent invocations.
 * @param {string|number|loggerOptions} [idOrOptions] - Logger identifier or setup options.
 * The default logger will be returned if undefined or of type loggerOptions.
 * @param {loggerOptions} [options] - Logger setup options
 * @returns {Logger} - Logger object
 */
const getLogger = (idOrOptions, options) => {
  const id = ['string', 'number'].includes(typeof idOrOptions) ? idOrOptions : Symbol.for('default')
  const loggerOptions = typeof idOrOptions === 'object' ? idOrOptions : options

  // existing logger
  if (id in _loggers) {
    if (loggerOptions) {
      _loggers[id].setOptions(loggerOptions)
    }
    return _loggers[id]
  }

  // first invocation - need to instantiate logger
  if (!loggerOptions) {
    throw Error(`${(id === Symbol.for('default')
      ? 'The default logger'
      : `Logger id ${id}`
    )} does not yet exist, please supply setup options`)
  }
  _loggers[id] = new Logger(loggerOptions)
  return _loggers[id]
}

module.exports = { getLogger, levels }
