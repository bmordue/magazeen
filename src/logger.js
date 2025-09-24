/**
 * Structured logging system for Magazeen
 * @fileoverview Provides centralized logging with levels, structure, and metadata support
 */

import { config } from './config.js';

// Performance measurement utilities
const getTimestamp = () => {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
};

/**
 * Log levels in order of severity
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Current log level threshold
 */
const currentLogLevel = LOG_LEVELS[config.logging.level] ?? LOG_LEVELS.info;

/**
 * Logger class providing structured logging capabilities
 */
export class Logger {
  /**
   * Creates a timestamp in ISO format
   * @returns {string} ISO timestamp
   */
  static _getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Formats log entry based on configuration
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @param {Error} [error] - Error object for error logs
   * @returns {string} Formatted log entry
   */
  static _formatLog(level, message, meta = {}, error = null) {
    const logEntry = {
      timestamp: this._getTimestamp(),
      level,
      message,
      ...meta
    };

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    return config.logging.structured 
      ? JSON.stringify(logEntry)
      : `[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}${error ? ` - ${error.message}` : ''}`;
  }

  /**
   * Internal logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @param {Error} [error] - Error object
   */
  static _log(level, message, meta = {}, error = null) {
    if (LOG_LEVELS[level] > currentLogLevel || !config.logging.console) {
      return;
    }

    const formattedLog = this._formatLog(level, message, meta, error);
    
    switch (level) {
      case 'error':
        console.error(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      case 'debug':
        console.debug(formattedLog);
        break;
      default:
        console.log(formattedLog);
    }
  }

  /**
   * Log error messages
   * @param {string} message - Error message
   * @param {Error} [error] - Error object
   * @param {Object} [meta={}] - Additional metadata
   */
  static error(message, error = null, meta = {}) {
    this._log('error', message, meta, error);
  }

  /**
   * Log warning messages
   * @param {string} message - Warning message
   * @param {Object} [meta={}] - Additional metadata
   */
  static warn(message, meta = {}) {
    this._log('warn', message, meta);
  }

  /**
   * Log info messages
   * @param {string} message - Info message
   * @param {Object} [meta={}] - Additional metadata
   */
  static info(message, meta = {}) {
    this._log('info', message, meta);
  }

  /**
   * Log debug messages
   * @param {string} message - Debug message
   * @param {Object} [meta={}] - Additional metadata
   */
  static debug(message, meta = {}) {
    this._log('debug', message, meta);
  }

  /**
   * Creates a child logger with preset metadata
   * @param {Object} metadata - Metadata to include in all logs
   * @returns {Object} Child logger
   */
  static child(metadata) {
    return {
      error: (message, error = null, meta = {}) => 
        this.error(message, error, { ...metadata, ...meta }),
      warn: (message, meta = {}) => 
        this.warn(message, { ...metadata, ...meta }),
      info: (message, meta = {}) => 
        this.info(message, { ...metadata, ...meta }),
      debug: (message, meta = {}) => 
        this.debug(message, { ...metadata, ...meta })
    };
  }

  /**
   * Logs performance timing
   * @param {string} operation - Operation name
   * @param {number} startTime - Start time from getTimestamp()
   * @param {Object} [meta={}] - Additional metadata
   */
  static timing(operation, startTime, meta = {}) {
    const endTime = getTimestamp();
    const duration = endTime - startTime;
    this.info(`Operation completed: ${operation}`, {
      operation,
      duration: `${duration.toFixed(2)}ms`,
      ...meta
    });
  }

  /**
   * Creates a performance timing wrapper
   * @param {string} operation - Operation name
   * @returns {Function} Timer function that logs when called
   */
  static timer(operation) {
    const startTime = getTimestamp();
    return (meta = {}) => this.timing(operation, startTime, meta);
  }
}

/**
 * Convenience methods for common logging scenarios
 */

/**
 * Logs application startup
 * @param {Object} meta - Startup metadata
 */
export function logStartup(meta = {}) {
  Logger.info('Application starting', {
    node_version: process.version,
    environment: config.server.isDevelopment ? 'development' : 'production',
    ...meta
  });
}

/**
 * Logs application shutdown
 * @param {Object} meta - Shutdown metadata
 */
export function logShutdown(meta = {}) {
  Logger.info('Application shutting down', meta);
}

/**
 * Logs request information (for web server)
 * @param {Object} req - Express request object
 * @param {Object} [meta={}] - Additional metadata
 */
export function logRequest(req, meta = {}) {
  Logger.info('HTTP request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...meta
  });
}

/**
 * Logs operation results
 * @param {string} operation - Operation name
 * @param {boolean} success - Whether operation succeeded
 * @param {Object} [meta={}] - Additional metadata
 */
export function logOperation(operation, success, meta = {}) {
  const level = success ? 'info' : 'error';
  const message = `Operation ${success ? 'succeeded' : 'failed'}: ${operation}`;
  Logger[level](message, meta);
}

export default Logger;