# Node Slack Loger

[![NPM version](https://img.shields.io/npm/v/@eqworks/node-slack-logger.svg)](https://www.npmjs.com/package/@eqworks/node-slack-logger)

Node Slack Logger is a utility to log messages or errors to a Slack channel. It is built around a simple function, `getLogger`, which can be imported in any module in order to access the desired logger, waiving the need to pass around logger objects.

## Installation

```
yarn add @eqworks/node-slack-logger
OR
npm install @eqworks/node-slack-logger
```

## Interface

1. function `getLogger`
- `getLogger(id, config)` - Instantiates/updates logger at `id` with `config` and returns said logger.
- `getLogger(config)` - Instantiates/updates the default logger with `config` and returns said logger.
- `getLogger(id)` - Returns logger at `id` or throws an error if the logger was not previously instantiated.
- `getLogger()` - Returns the default logger or throws an error if the logger was not previously instantiated.

2. Logger config
- `send` - Function - Callback to invoke in order to post to the Slack API
- `format` - Number | string | function, optional, defaults to `1` (SLACK) - API payload formatter
- `appName` - String, optional, defaults to `My App`
- `minLevel` - Number | string, optional, defaults to `3` (WARNING) - Minimum severity which must be achieved for an event to be logged
- `colors`: - Object, optional - Map of log levels (number) to colours (string)

3. `Logger` instance
- `setConfig(config)` - Updates the logger's config
- `log(level, error, context?)` - Logs an error to Slack at the given severity level.
- `log(level, message, context?)` - Logs a message to Slack at the given severity level.
- `log(level, options, context?)` - Logs a message with options to Slack at the given severity level.
- `debug(error | message | options, context?)` - Logs with level `DEBUG`
- `info(error | message | options, context?)` - Logs with level `INFO`
- `warning(error | message | options, context?)` - Logs with level `WARNING`
- `error(error | message | options, context?)` - Logs with level `ERROR`
- `critical(error | message | options, context?)` - Logs with level `CRITICAL`

4. Log event options
- `message` - String
- `stack` - String, optional - Error stack
- `context` - Object, optional - Context object, _e.g. `{ userName: 'paul1234' }`_

## Usage

```
const { getLogger, logLevels } = require('@eqworks/node-slack-logger')

// api - using axios
const axios = require('axios')
const send = (body) => axios.post(
  'https://hooks.slack.com/...',
  body,
  {
    timeout: 5000, // 5 seconds
    maxRedirects: 0,
  },
)

// api - using Slack sdk
const { IncomingWebhook } = require('@slack/webhook')
const webhook = new IncomingWebhook('https://hooks.slack.com/...')
const send = webhook.send.bind(webhook)

// instantiate default logger
const logger = getLogger({
  send,
  appName: 'My Fantastically Magical App',
  minLevel: logLevels.WARNING,
})

// Express.js middleware
const errorHandler = (err, req, res, next) {
  logger.error(err, req.userContext)
}

// Logger can also be accessed by calling getLogger in any module - provided that it was previously instantiated
someJob.then(() => getLogger().info('Job ran successfully')).catch((err) => getLogger().error(err))

// Using multiple loggers
getLogger('abc', {
  send: ...,
  appName: 'ABC not the Alphabet Song',
  minLevel: logLevels.INFO,
})

getLogger('xyz', {
  send: ...,
  appName: 'XYZ more than a TLD',
  minLevel: logLevels.INFO,
})

function authentication(user, product) {
  try {
    // do something
  } catch (err) {
    // assuming product is one of 'abc' or 'xyz'
    getLogger(product).warning(err, { region: user.region })
  }
}

```
