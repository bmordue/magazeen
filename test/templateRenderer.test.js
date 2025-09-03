import { renderTemplate } from '../src/templateRenderer.js';

describe('templateRenderer', () => {
  test('should render home template without variables', () => {
    const result = renderTemplate('home');
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<title>Upload Chat Export - Magazeen</title>');
    expect(result).toContain('<h1>Upload Chat Export</h1>');
    expect(result).toContain('<form action="/upload"');
  });

  test('should render error template with message substitution', () => {
    const testMessage = 'Test error message';
    const result = renderTemplate('error', { message: testMessage });
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<title>Error - Magazeen</title>');
    expect(result).toContain('<h1>An Error Occurred</h1>');
    expect(result).toContain(`<div class="error-message">${testMessage}</div>`);
  });

  test('should render select-chats template with variable substitution', () => {
    const testVars = {
      sessionId: 'test-session-123',
      originalFilename: 'test.json',
      chatList: '<div>Test chat list</div>'
    };
    const result = renderTemplate('select-chats', testVars);
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<title>Select Chats - Magazeen</title>');
    expect(result).toContain(`value="${testVars.sessionId}"`);
    expect(result).toContain(`value="${testVars.originalFilename}"`);
    expect(result).toContain(testVars.chatList);
  });

  test('should throw error for non-existent template', () => {
    expect(() => {
      renderTemplate('non-existent-template');
    }).toThrow('Failed to render template: non-existent-template');
  });
});