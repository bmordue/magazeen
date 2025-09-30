import { Validator, ValidationError } from '../src/validation.js';

describe('Validation System', () => {
  describe('validateArticle', () => {
    test('should validate valid article data', () => {
      const validArticle = {
        title: 'Test Article',
        content: 'This is a valid article content',
        category: 'Technology',
        author: 'Test Author',
        tags: ['test', 'article']
      };

      expect(() => Validator.validateArticle(validArticle)).not.toThrow();
    });

    test('should throw ValidationError for empty title', () => {
      const invalidArticle = {
        title: '',
        content: 'Valid content',
        category: 'Technology'
      };

      expect(() => Validator.validateArticle(invalidArticle))
        .toThrow(ValidationError);
    });

    test('should allow short content for testing purposes', () => {
      const validArticle = {
        title: 'Valid Title',
        content: 'Short',
        category: 'Technology'
      };

      expect(() => Validator.validateArticle(validArticle))
        .not.toThrow();
    });

    test('should throw ValidationError for invalid tags', () => {
      const invalidArticle = {
        title: 'Valid Title',
        content: 'Valid content for article',
        category: 'Technology',
        tags: ['valid', '', 'another']
      };

      expect(() => Validator.validateArticle(invalidArticle))
        .toThrow(ValidationError);
    });
  });

  describe('validateInterest', () => {
    test('should validate valid interest data', () => {
      const validInterest = {
        topic: 'Machine Learning',
        description: 'Learning about neural networks',
        priority: 'high'
      };

      expect(() => Validator.validateInterest(validInterest)).not.toThrow();
    });

    test('should throw ValidationError for invalid priority', () => {
      const invalidInterest = {
        topic: 'Valid Topic',
        description: 'Valid description',
        priority: 'invalid'
      };

      expect(() => Validator.validateInterest(invalidInterest))
        .toThrow(ValidationError);
    });
  });

  describe('validateString', () => {
    test('should validate valid string', () => {
      expect(() => Validator.validateString('Valid String', 'TestField'))
        .not.toThrow();
    });

    test('should throw ValidationError for non-string', () => {
      expect(() => Validator.validateString(123, 'TestField'))
        .toThrow(ValidationError);
    });

    test('should throw ValidationError for empty string', () => {
      expect(() => Validator.validateString('', 'TestField'))
        .toThrow(ValidationError);
    });

    test('should respect length limits', () => {
      expect(() => Validator.validateString('abc', 'TestField', 5, 10))
        .toThrow(ValidationError);
      
      expect(() => Validator.validateString('abcdefghijk', 'TestField', 5, 10))
        .toThrow(ValidationError);
      
      expect(() => Validator.validateString('abcdef', 'TestField', 5, 10))
        .not.toThrow();
    });
  });

  describe('validatePageLimit', () => {
    test('should allow null/undefined for no limit', () => {
      expect(() => Validator.validatePageLimit(null)).not.toThrow();
      expect(() => Validator.validatePageLimit(undefined)).not.toThrow();
    });

    test('should validate positive integers', () => {
      expect(() => Validator.validatePageLimit(5)).not.toThrow();
      expect(() => Validator.validatePageLimit(100)).not.toThrow();
    });

    test('should throw ValidationError for invalid values', () => {
      expect(() => Validator.validatePageLimit(-1))
        .toThrow(ValidationError);
      
      expect(() => Validator.validatePageLimit(0))
        .toThrow(ValidationError);
      
      expect(() => Validator.validatePageLimit(1.5))
        .toThrow(ValidationError);
      
      expect(() => Validator.validatePageLimit('5'))
        .toThrow(ValidationError);
      
      expect(() => Validator.validatePageLimit(1001))
        .toThrow(ValidationError);
    });
  });

  describe('sanitizeString', () => {
    test('should remove dangerous characters', () => {
      const dangerous = '<script>alert("xss")</script>';
      const sanitized = Validator.sanitizeString(dangerous);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    test('should remove javascript protocol', () => {
      const dangerous = 'javascript:alert("xss")';
      const sanitized = Validator.sanitizeString(dangerous);
      expect(sanitized).not.toContain('javascript:');
    });

    test('should remove event handlers', () => {
      const dangerous = 'onclick=alert("xss")';
      const sanitized = Validator.sanitizeString(dangerous);
      expect(sanitized).not.toContain('onclick=');
    });

    test('should handle non-string inputs', () => {
      expect(Validator.sanitizeString(null)).toBe('');
      expect(Validator.sanitizeString(undefined)).toBe('');
      expect(Validator.sanitizeString(123)).toBe('');
    });
  });

  describe('ValidationError', () => {
    test('should create error with field and value', () => {
      const error = new ValidationError('Test message', 'testField', 'testValue');
      
      expect(error.message).toBe('Test message');
      expect(error.name).toBe('ValidationError');
      expect(error.field).toBe('testField');
      expect(error.value).toBe('testValue');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
    });
  });
});