# Node Slack Loger

Node Slack Logger is a utility to log messages or errors to a Slack channel. It is built around a simple function, `getLogger`, which can be imported in any module in order to access the desired logger, waiving the need to pass around logger objects.

## Installation
```
yarn add @eqworks/node-slack-logger
OR
npm install @eqworks/node-slack-logger
```

## Interface
1. function `getLogger`
- `getLogger(id, options)` - Instantiates/updates logger at `id` with `options` and returns said logger.
- `getLogger(options)` - Instantiates/updates the default logger with `options` and returns said logger.
- `getLogger(id)` - Returns logger at `id` or throws an error if the logger was not previously instantiated.
- `getLogger()` - Returns the default logger or throws an error if the logger was not previously instantiated.

2. `Logger` instance
- `setOptions(options)` - Updates the logger's config
- `log(level, error, context?)` - Logs an error to Slack at the given severity level.
- `log(level, message, context?)` - Logs a message to Slack at the given severity level.
- `log(level, options, context?)` - Logs a message with options to Slack at the given severity level.
- `debug(error | message | options, context?)` - Logs with level `DEBUG`
- `info(error | message | options, context?)` - Logs with level `INFO`
- `warning(error | message | options, context?)` - Logs with level `WARNING`
- `error(error | message | options, context?)` - Logs with level `ERROR`
- `critical(error | message | options, context?)` - Logs with level `CRITICAL`

## Usage
```
const { getLogger, levels } = require('@eqworks/node-slack-logger')

// instantiate default logger
const logger = getLogger({
  slackHook: 'https://hooks.slack.com/...',
  appName: 'My Fantastically Magical App',
  minLevel: levels.WARNING,
})

// Express.js middleware
const errorHandler = (err, req, res, next) {
  logger.error(err, req.userContext)
}

// Logger can also be accessed by calling getLogger in any module - provided that it was previously instantiated
someJob.then(() => getLogger().info('Job ran successfully')).catch((err) => getLogger().error(err))

// Using multiple loggers
getLogger('abc', {
  slackHook: 'https://hooks.slack.com/...abc-hook...',
  appName: 'ABC not the Alphabet Song',
  minLevel: levels.INFO,
})

getLogger('xyz', {
  slackHook: 'https://hooks.slack.com/...xyz-hook...',
  appName: 'XYZ more than a TLD',
  minLevel: levels.INFO,
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

## Dependencies
- Axios