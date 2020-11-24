const _slackFormatter = ({ appName, levelName, name, message, stack, trail, context, color }) => {
  // prepare slack payload
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `[${levelName}] ${appName}`, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: name ? `${name}: ${message}` : message },
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
  Object.entries(context)
    .forEach(([key, value]) => contextBlock.elements.push({
      type: 'plain_text',
      text: `${key}: ${value}`,
      emoji: true,
    }))

  blocks.push(contextBlock)

  return {
    attachments: [
      { color, blocks },
    ],
  }
}

// eslint-disable-next-line object-curly-newline
const logFormats = {
  SLACK: 1,
// eslint-disable-next-line object-curly-newline
}

// eslint-disable-next-line object-curly-newline
const logFormatNames = {
  [logFormats.SLACK]: 'SLACK',
// eslint-disable-next-line object-curly-newline
}

// eslint-disable-next-line object-curly-newline
const _defaultFormats = {
  [logFormats.SLACK]: _slackFormatter,
// eslint-disable-next-line object-curly-newline
}

module.exports = { logFormats, logFormatNames, _defaultFormats }
