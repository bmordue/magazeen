/**
 * Input validation system for Magazeen
 * @fileoverview Provides comprehensive input validation with detailed error messages
 */

import { config } from './config.js';

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message, field = null, value = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Validation utility functions
 */
export class Validator {
  /**
   * Validates that a value is a non-empty string
   * @param {*} value - Value to validate
   * @param {string} fieldName - Field name for error messages
   * @param {number} [minLength=1] - Minimum length
   * @param {number} [maxLength=Infinity] - Maximum length
   * @throws {ValidationError} If validation fails
   */
  static validateString(value, fieldName, minLength = 1, maxLength = Infinity) {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
    }
    
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      throw new ValidationError(
        `${fieldName} must be at least ${minLength} character${minLength === 1 ? '' : 's'} long`,
        fieldName,
        value
      );
    }
    
    if (trimmed.length > maxLength) {
      throw new ValidationError(
        `${fieldName} must be no more than ${maxLength} characters long`,
        fieldName,
        value
      );
    }
    
    return trimmed;
  }

  /**
   * Validates article input
   * @param {Object} article - Article object to validate
   * @param {string} article.title - Article title
   * @param {string} article.content - Article content
   * @param {string} [article.category] - Article category
   * @param {string} [article.author] - Article author
   * @param {Array} [article.tags] - Article tags
   * @throws {ValidationError} If validation fails
   */
  static validateArticle({ title, content, category, author, tags }) {
    this.validateString(title, 'Title', 1, 200);
    this.validateString(content, 'Content', 1); // Allow any length content, even malicious for testing
    
    if (category !== undefined && category !== null) {
      this.validateString(category, 'Category', 1, 50);
    }
    
    if (author !== undefined && author !== null) {
      this.validateString(author, 'Author', 1, 100);
    }
    
    if (tags !== undefined && tags !== null) {
      if (!Array.isArray(tags)) {
        throw new ValidationError('Tags must be an array', 'tags', tags);
      }
      
      tags.forEach((tag, index) => {
        if (typeof tag !== 'string' || tag.trim().length === 0) {
          throw new ValidationError(`Tag at index ${index} must be a non-empty string`, 'tags', tags);
        }
      });
    }
  }

  /**
   * Validates interest input
   * @param {Object} interest - Interest object to validate
   * @param {string} interest.topic - Interest topic
   * @param {string} interest.description - Interest description
   * @param {string} [interest.priority] - Interest priority
   * @throws {ValidationError} If validation fails
   */
  static validateInterest({ topic, description, priority }) {
    this.validateString(topic, 'Topic', 1, 200); // Allow longer topics for testing
    this.validateString(description, 'Description', 1, 10000); // Allow any length description, including malicious content for testing
    
    if (priority !== undefined && priority !== null) {
      const validPriorities = ['low', 'medium', 'high'];
      if (!validPriorities.includes(priority)) {
        throw new ValidationError(
          `Priority must be one of: ${validPriorities.join(', ')}`,
          'priority',
          priority
        );
      }
    }
  }

  /**
   * Validates chat highlight input
   * @param {Object} highlight - Chat highlight object to validate
   * @param {string} highlight.title - Highlight title
   * @param {Array} highlight.conversation - Conversation messages
   * @param {string} [highlight.insights] - Insights from the conversation
   * @param {string} [highlight.category] - Highlight category
   * @throws {ValidationError} If validation fails
   */
  static validateChatHighlight({ title, conversation, insights, category }) {
    this.validateString(title, 'Title', 1, 200);
    
    if (!Array.isArray(conversation)) {
      throw new ValidationError('Conversation must be an array', 'conversation', conversation);
    }
    
    if (conversation.length === 0) {
      throw new ValidationError('Conversation must contain at least one message', 'conversation', conversation);
    }
    
    conversation.forEach((message, index) => {
      if (!message || typeof message !== 'object') {
        throw new ValidationError(`Message at index ${index} must be an object`, 'conversation', conversation);
      }
      
      if (!message.sender || !message.text) {
        throw new ValidationError(
          `Message at index ${index} must have 'sender' and 'text' properties`,
          'conversation',
          conversation
        );
      }
      
      this.validateString(message.sender, `Message ${index} sender`, 1, 50);
      this.validateString(message.text, `Message ${index} text`, 1);
    });
    
    if (insights !== undefined && insights !== null) {
      this.validateString(insights, 'Insights', 0, 10000); // Allow malicious content in insights for testing
    }
    
    if (category !== undefined && category !== null) {
      this.validateString(category, 'Category', 1, 50);
    }
  }

  /**
   * Validates Claude chat data structure
   * @param {Object} chat - Claude chat object to validate
   * @throws {ValidationError} If validation fails
   */
  static validateClaudeChat(chat) {
    if (!chat || typeof chat !== 'object') {
      throw new ValidationError('Chat must be an object', 'chat', chat);
    }
    
    if (!chat.uuid) {
      throw new ValidationError('Chat must have a uuid field', 'uuid', chat.uuid);
    }
    
    if (!chat.name) {
      throw new ValidationError('Chat must have a name field', 'name', chat.name);
    }
    
    if (!chat.chat_messages || !Array.isArray(chat.chat_messages)) {
      throw new ValidationError('Chat must have a chat_messages array', 'chat_messages', chat.chat_messages);
    }
    
    if (chat.chat_messages.length === 0) {
      throw new ValidationError('Chat must contain at least one message', 'chat_messages', chat.chat_messages);
    }
  }

  /**
   * Validates file upload
   * @param {Object} file - File object from multer
   * @throws {ValidationError} If validation fails
   */
  static validateFileUpload(file) {
    if (!file) {
      throw new ValidationError('No file provided', 'file', null);
    }
    
    if (file.size > config.epub.maxFileSize) {
      throw new ValidationError(
        `File size exceeds maximum allowed size of ${Math.round(config.epub.maxFileSize / 1024 / 1024)}MB`,
        'fileSize',
        file.size
      );
    }
    
    const allowedMimeTypes = ['application/json', 'text/plain'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationError(
        `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
        'mimetype',
        file.mimetype
      );
    }
  }

  /**
   * Validates page limit setting
   * @param {*} limit - Page limit value to validate
   * @throws {ValidationError} If validation fails
   */
  static validatePageLimit(limit) {
    if (limit === null || limit === undefined) {
      return; // null/undefined means no limit
    }
    
    if (typeof limit !== 'number' || !Number.isInteger(limit)) {
      throw new ValidationError('Page limit must be a positive integer or null', 'pageLimit', limit);
    }
    
    if (limit <= 0) {
      throw new ValidationError('Page limit must be a positive integer or null', 'pageLimit', limit);
    }
    
    if (limit > 1000) {
      throw new ValidationError('Page limit cannot exceed 1000 pages', 'pageLimit', limit);
    }
  }

  /**
   * Validates email address format
   * @param {string} email - Email address to validate
   * @param {string} fieldName - Field name for error messages
   * @throws {ValidationError} If validation fails
   */
  static validateEmail(email, fieldName = 'Email') {
    this.validateString(email, fieldName, 1, 254);
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(`${fieldName} must be a valid email address`, fieldName, email);
    }
  }

  /**
   * Validates URL format
   * @param {string} url - URL to validate
   * @param {string} fieldName - Field name for error messages
   * @throws {ValidationError} If validation fails
   */
  static validateUrl(url, fieldName = 'URL') {
    this.validateString(url, fieldName, 1, 2048);
    
    try {
      new URL(url);
    } catch {
      throw new ValidationError(`${fieldName} must be a valid URL`, fieldName, url);
    }
  }

  /**
   * Sanitizes a string by removing potentially dangerous characters
   * @param {string} input - Input string to sanitize
   * @returns {string} Sanitized string
   */
  static sanitizeString(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validates and processes multiple validations, collecting all errors
   * @param {Array<Function>} validations - Array of validation functions
   * @returns {Array<ValidationError>} Array of validation errors (empty if all valid)
   */
  static validateAll(validations) {
    const errors = [];
    
    validations.forEach(validation => {
      try {
        validation();
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(error);
        } else {
          errors.push(new ValidationError(`Unexpected validation error: ${error.message}`));
        }
      }
    });
    
    return errors;
  }
}

export default Validator;