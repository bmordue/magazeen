import { jest } from '@jest/globals';
import { config, getConfig, isDevelopment, isProduction } from '../src/config.js';

describe('Configuration System', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('config object', () => {
    test('should have default values', () => {
      expect(config.paths.contentFile).toBe('out/magazine-content.json');
      expect(config.paths.outputDir).toBe('/tmp/out');
      expect(config.epub.wordsPerPage).toBe(300);
      expect(config.server.port).toBe(3000);
      expect(config.content.maxRecentInterests).toBe(5);
      expect(config.logging.level).toBe('info');
    });

    test('should contain all required sections', () => {
      expect(config).toHaveProperty('paths');
      expect(config).toHaveProperty('epub');
      expect(config).toHaveProperty('server');
      expect(config).toHaveProperty('content');
      expect(config).toHaveProperty('logging');
    });

    test('should have proper path defaults', () => {
      expect(config.paths.templatesDir).toBe('src/templates');
      expect(config.paths.epubStylesFile).toBe('src/epub_styles.css');
    });

    test('should have proper EPUB defaults', () => {
      expect(config.epub.defaults.title).toBe('My Personal Magazine');
      expect(config.epub.defaults.author).toBe('Your Name');
      expect(config.epub.maxFileSize).toBe(10 * 1024 * 1024);
    });

    test('should have proper server defaults', () => {
      expect(config.server.uploadDir).toBe('uploads');
      expect(config.server.sessionTimeout).toBe(900);
      expect(config.server.isDevelopment).toBe(true); // NODE_ENV !== 'production'
    });

    test('should have proper content defaults', () => {
      expect(config.content.maxChatHighlights).toBe(10);
      expect(config.content.defaultCategory).toBe('General');
    });

    test('should have proper logging defaults', () => {
      expect(config.logging.structured).toBe(false);
      expect(config.logging.console).toBe(true);
    });
  });

  describe('environment variable overrides', () => {
    test('should override paths from environment', async () => {
      process.env.CONTENT_FILE = '/custom/content.json';
      process.env.OUTPUT_DIR = '/custom/output';
      process.env.TEMPLATES_DIR = '/custom/templates';

      // Re-import to get updated config
      const { config: newConfig } = await import('../src/config.js?' + Date.now());
      
      expect(newConfig.paths.contentFile).toBe('/custom/content.json');
      expect(newConfig.paths.outputDir).toBe('/custom/output');
      expect(newConfig.paths.templatesDir).toBe('/custom/templates');
    });

    test('should override numeric values from environment', async () => {
      process.env.WORDS_PER_PAGE = '250';
      process.env.PORT = '8080';
      process.env.MAX_RECENT_INTERESTS = '7';

      const { config: newConfig } = await import('../src/config.js?' + Date.now());
      
      expect(newConfig.epub.wordsPerPage).toBe(250);
      expect(newConfig.server.port).toBe(8080);
      expect(newConfig.content.maxRecentInterests).toBe(7);
    });

    test('should handle production environment', async () => {
      process.env.NODE_ENV = 'production';

      const { config: newConfig } = await import('../src/config.js?' + Date.now());
      
      expect(newConfig.server.isDevelopment).toBe(false);
    });

    test('should override logging configuration', async () => {
      process.env.LOG_LEVEL = 'debug';
      process.env.STRUCTURED_LOGGING = 'true';
      process.env.LOG_CONSOLE = 'false';

      const { config: newConfig } = await import('../src/config.js?' + Date.now());
      
      expect(newConfig.logging.level).toBe('debug');
      expect(newConfig.logging.structured).toBe(true);
      expect(newConfig.logging.console).toBe(false);
    });
  });

  describe('getConfig helper', () => {
    test('should get nested config values', () => {
      expect(getConfig('epub.wordsPerPage')).toBe(300);
      expect(getConfig('server.port')).toBe(3000);
      expect(getConfig('paths.contentFile')).toBe('out/magazine-content.json');
    });

    test('should return default value for non-existent paths', () => {
      expect(getConfig('nonexistent.path', 'default')).toBe('default');
      expect(getConfig('epub.nonexistent', 'fallback')).toBe('fallback');
    });

    test('should handle deep nested paths', () => {
      expect(getConfig('epub.defaults.title')).toBe('My Personal Magazine');
      expect(getConfig('epub.defaults.author')).toBe('Your Name');
    });

    test('should return undefined for non-existent paths without default', () => {
      expect(getConfig('nonexistent.path')).toBeUndefined();
    });
  });

  describe('environment helpers', () => {
    test('isDevelopment should return correct value', () => {
      expect(isDevelopment()).toBe(true); // Default
    });

    test('isProduction should return correct value', () => {
      expect(isProduction()).toBe(false); // Default
    });

    test('should reflect environment changes', async () => {
      process.env.NODE_ENV = 'production';
      
      const { isDevelopment: newIsDev, isProduction: newIsProd } = 
        await import('../src/config.js?' + Date.now());
      
      expect(newIsDev()).toBe(false);
      expect(newIsProd()).toBe(true);
    });
  });

  describe('configuration validation', () => {
    test('should handle invalid numeric environment variables', async () => {
      process.env.PORT = 'invalid';
      process.env.WORDS_PER_PAGE = 'not-a-number';

      const { config: newConfig } = await import('../src/config.js?' + Date.now());
      
      // Should fall back to defaults when parseInt fails
      expect(newConfig.server.port).toBe(3000);
      expect(newConfig.epub.wordsPerPage).toBe(300);
    });

    test('should handle missing environment variables gracefully', () => {
      // Delete some env vars to test fallbacks
      delete process.env.CONTENT_FILE;
      delete process.env.PORT;
      
      expect(() => getConfig('paths.contentFile')).not.toThrow();
      expect(() => getConfig('server.port')).not.toThrow();
    });
  });
});