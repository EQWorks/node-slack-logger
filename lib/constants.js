const logLevels = {
  DEBUG: 1,
  INFO: 2,
  WARNING: 3,
  ERROR: 4,
  CRITICAL: 5,
}

const logLevelNames = {
  [logLevels.DEBUG]: 'DEBUG',
  [logLevels.INFO]: 'INFO',
  [logLevels.WARNING]: 'WARNING',
  [logLevels.ERROR]: 'ERROR',
  [logLevels.CRITICAL]: 'CRITICAL',
}

const _defaultColors = {
  [logLevels.DEBUG]: '#eee', // gray
  [logLevels.INFO]: '#0f0', // green
  [logLevels.WARNING]: '#ff0', // yellow
  [logLevels.ERROR]: '#f00', // red
  [logLevels.CRITICAL]: '#f00', // red
}

module.exports = {
  logLevels,
  logLevelNames,
  _defaultColors,
}
