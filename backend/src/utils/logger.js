const winston = require("winston");

/**
 * Central application logger.
 *
 * - Logs to stdout (cloud friendly)
 * - JSON format for observability systems
 * - Timestamped
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ["error"],
    }),
  ],
});

module.exports = logger;
