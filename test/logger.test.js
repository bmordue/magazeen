import { jest } from '@jest/globals';
import { Logger, logStartup, logShutdown, logOperation } from '../src/logger.js';

// Mock console methods
const originalConsole = { ...console };

describe('Logger System', () => {
  let mockConsole;

  beforeEach(() => {
    mockConsole = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    
    // Replace console methods
    console.log = mockConsole.log;
    console.error = mockConsole.error;
    console.warn = mockConsole.warn;
    console.debug = mockConsole.debug;
  });

  afterEach(() => {
    // Restore original console
    Object.assign(console, originalConsole);
    jest.clearAllMocks();
  });

  describe('Logger class', () => {
    test('should log info messages', () => {
      Logger.info('Test info message');
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info message')
      );
    });

    test('should log error messages with error object', () => {
      const error = new Error('Test error');
      Logger.error('Test error message', error);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error message - Test error')
      );
    });

    test('should log warning messages', () => {
      Logger.warn('Test warning message');
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Test warning message')
      );
    });

    test('should include metadata in logs', () => {
      Logger.info('Test message', { userId: '123', action: 'test' });
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Test message')
      );
    });

    test('should create child logger with preset metadata', () => {
      const childLogger = Logger.child({ component: 'TestComponent' });
      childLogger.info('Child log message');
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Child log message')
      );
    });
  });

  describe('Convenience functions', () => {
    test('logStartup should log application startup', () => {
      logStartup({ version: '1.0.0' });
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Application starting')
      );
    });

    test('logShutdown should log application shutdown', () => {
      logShutdown({ reason: 'manual' });
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Application shutting down')
      );
    });

    test('logOperation should log successful operation', () => {
      logOperation('test-operation', true, { result: 'success' });
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Operation succeeded: test-operation')
      );
    });

    test('logOperation should log failed operation', () => {
      logOperation('test-operation', false, { error: 'failed' });
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed: test-operation')
      );
    });
  });

  describe('Log formatting', () => {
    test('should format timestamp correctly', () => {
      Logger.info('Test message');
      const logCall = mockConsole.log.mock.calls[0][0];
      
      // Should contain timestamp in ISO format
      expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    test('should include log level in output', () => {
      Logger.error('Error message');
      const logCall = mockConsole.error.mock.calls[0][0];
      
      expect(logCall).toContain('ERROR:');
    });
  });
});