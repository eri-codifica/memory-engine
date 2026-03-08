import pino from 'pino';

// Initialize the Pino logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // GCP Cloud Logging looks for a 'severity' field to color-code logs correctly
  formatters: {
    level: (label) => {
      return { severity: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Apply the unified branding
  base: { service: 'memory-engine' }
});

export default logger;