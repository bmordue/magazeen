/**
 * Centralized configuration management for Magazeen
 * @fileoverview Provides centralized configuration with environment variable support
 */

/**
 * Application configuration object with defaults and environment overrides
 * @type {Object}
 */
export const config = {
  // File system paths
  paths: {
    /** Default content file location */
    contentFile: process.env.CONTENT_FILE || 'out/magazine-content.json',
    /** Output directory for generated EPUBs */
    outputDir: process.env.OUTPUT_DIR || '/tmp/out',
    /** Templates directory */
    templatesDir: process.env.TEMPLATES_DIR || 'src/templates',
    /** CSS styles for EPUB */
    epubStylesFile: process.env.EPUB_STYLES_FILE || 'src/epub_styles.css'
  },

  // EPUB generation settings
  epub: {
    /** Average words per EPUB page */
    wordsPerPage: parseInt(process.env.WORDS_PER_PAGE) || 300,
    /** Maximum file size for uploads (bytes) */
    maxFileSize: (v => !isNaN(v) ? v : 10 * 1024 * 1024)(parseInt(process.env.MAX_FILE_SIZE)),
    /** Default EPUB metadata */
    defaults: {
      title: process.env.DEFAULT_TITLE || "My Personal Magazine",
      author: process.env.DEFAULT_AUTHOR || "Your Name",
      description: process.env.DEFAULT_DESCRIPTION || "A monthly compilation of my interests, discoveries, and insights."
    }
  },

  // Web server settings
  server: {
    /** Server port */
    port: (v => !isNaN(v) ? v : 3000)(parseInt(process.env.PORT)),
    /** Upload directory for temporary files */
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    /** Session timeout in seconds */
    sessionTimeout: (v => !isNaN(v) ? v : 900)(parseInt(process.env.SESSION_TIMEOUT)), // 15 minutes
    /** Enable development mode */
    isDevelopment: process.env.NODE_ENV !== 'production'
  },

  // Content processing
  content: {
    /** Maximum number of recent interests to display */
    maxRecentInterests: (v => !isNaN(v) ? v : 5)(parseInt(process.env.MAX_RECENT_INTERESTS)),
    /** Maximum number of chat highlights to display */
    maxChatHighlights: parseInt(process.env.MAX_CHAT_HIGHLIGHTS) || 10,
    /** Default content category */
    defaultCategory: process.env.DEFAULT_CATEGORY || "General",
    /** Enable topic clustering for articles */
    enableClustering: process.env.ENABLE_CLUSTERING !== 'false',
    /** Minimum similarity threshold for clustering (0-100) */
    clusteringSimilarity: (v => !isNaN(v) ? v : 30)(parseInt(process.env.CLUSTERING_SIMILARITY)),
    /** Enable Kindle-optimized EPUB generation */
    kindleOptimized: process.env.KINDLE_OPTIMIZED === 'true'
  },

  // Logging and monitoring
  logging: {
    /** Log level (error, warn, info, debug) */
    level: process.env.LOG_LEVEL || 'info',
    /** Enable structured JSON logging */
    structured: process.env.STRUCTURED_LOGGING === 'true',
    /** Enable console output */
    console: process.env.LOG_CONSOLE !== 'false'
  }
};

/**
 * Validates the configuration and ensures required directories exist
 * @returns {Promise<void>}
 */
export async function validateConfig() {
  const { mkdir } = await import('fs/promises');
  const { dirname } = await import('path');

  try {
    // Ensure output directory exists
    await mkdir(config.paths.outputDir, { recursive: true });
    
    // Ensure content directory exists
    const contentDir = dirname(config.paths.contentFile);
    await mkdir(contentDir, { recursive: true });
    
    // Ensure upload directory exists (for web interface)
    await mkdir(config.server.uploadDir, { recursive: true });
    
  } catch (error) {
    throw new Error(`Configuration validation failed: ${error.message}`);
  }
}

/**
 * Gets configuration value by dot notation path
 * @param {string} path - Dot notation path (e.g., 'epub.wordsPerPage')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Configuration value
 */
export function getConfig(path, defaultValue = undefined) {
  return path.split('.').reduce((obj, key) => obj?.[key], config) ?? defaultValue;
}

/**
 * Environment-specific configuration getters
 */
export const isDevelopment = () => config.server.isDevelopment;
export const isProduction = () => !config.server.isDevelopment;

export default config;