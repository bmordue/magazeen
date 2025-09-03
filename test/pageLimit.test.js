import { ContentManager } from '../src/contentManager.js';
import { jest } from '@jest/globals';

describe('Page Limit Functionality', () => {
    let contentManager;
    let mockFsUtils;
    const mockContentFile = 'test-page-limit-content.json';

    beforeEach(() => {
        mockFsUtils = {
            existsSync: jest.fn().mockReturnValue(false),
            readFileSync: jest.fn(),
            writeFileSync: jest.fn(),
        };
        contentManager = new ContentManager(mockContentFile, mockFsUtils);
    });

    test('should initialize with default page limit settings', () => {
        expect(contentManager.content.metadata.pageLimit).toBeNull();
        expect(contentManager.content.metadata.wordsPerPage).toBe(300);
    });

    test('should set and get page limit', () => {
        contentManager.setPageLimit(10);
        expect(contentManager.content.metadata.pageLimit).toBe(10);
        
        contentManager.setPageLimit(0);
        expect(contentManager.content.metadata.pageLimit).toBeNull();
    });

    test('should calculate word count correctly', () => {
        expect(contentManager.countWords('Hello world')).toBe(2);
        expect(contentManager.countWords('<p>Hello <b>world</b>!</p>')).toBe(3); // HTML stripped, includes punctuation
        expect(contentManager.countWords('')).toBe(0);
    });

    test('should calculate total word count from articles', () => {
        contentManager.addArticle('Article 1', 'Hello world test content', 'Test');
        contentManager.addArticle('Article 2', 'More test content here', 'Test');
        
        expect(contentManager.getTotalWordCount()).toBe(8); // 4 + 4 words
    });

    test('should calculate estimated pages correctly', () => {
        // Add 600 words of content (should be 2 pages at 300 words/page)
        const content = Array(600).fill('word').join(' ');
        contentManager.addArticle('Long Article', content, 'Test');
        
        expect(contentManager.getEstimatedPages()).toBe(2);
    });

    test('should detect when page limit would be exceeded', () => {
        contentManager.setPageLimit(1); // 1 page = 300 words max
        
        expect(contentManager.wouldExceedPageLimit(200)).toBe(false);
        expect(contentManager.wouldExceedPageLimit(400)).toBe(true);
    });

    test('should prevent adding articles when page limit exceeded', () => {
        contentManager.setPageLimit(1); // 1 page = 300 words max
        
        // Add content that fills up to the limit
        const result1 = contentManager.addArticle('Small Article', Array(250).fill('word').join(' '), 'Test');
        expect(result1).toBeTruthy();
        
        // Try to add more content that would exceed the limit
        const result2 = contentManager.addArticle('Big Article', Array(100).fill('word').join(' '), 'Test');
        expect(result2).toBeNull(); // Should fail
        
        // Should only have one article
        expect(contentManager.content.articles.length).toBe(1);
    });

    test('should provide comprehensive page limit info', () => {
        contentManager.setPageLimit(5);
        contentManager.addArticle('Test Article', Array(600).fill('word').join(' '), 'Test'); // 2 pages
        
        const info = contentManager.getPageLimitInfo();
        expect(info.currentPages).toBe(2);
        expect(info.pageLimit).toBe(5);
        expect(info.totalWords).toBe(600);
        expect(info.wordsPerPage).toBe(300);
        expect(info.hasLimit).toBe(true);
        expect(info.isAtLimit).toBe(false);
    });

    test('should handle Claude chats in page calculations', () => {
        // Mock a selected Claude chat
        contentManager.content.claudeChats = [{
            id: 'test-chat',
            selected: true,
            conversation: [
                { sender: 'human', text: 'Hello world' }, // 2 words
                { sender: 'ai', text: 'How are you today?' } // 4 words
            ]
        }];
        
        expect(contentManager.getTotalWordCount()).toBe(6);
    });

    test('should ignore unselected Claude chats in page calculations', () => {
        contentManager.content.claudeChats = [{
            id: 'test-chat',
            selected: false,
            conversation: [
                { sender: 'human', text: 'This should be ignored' }
            ]
        }];
        
        expect(contentManager.getTotalWordCount()).toBe(0);
    });

    test('should maintain backward compatibility with old content files', () => {
        // Simulate loading old content without page limit metadata
        mockFsUtils.existsSync.mockReturnValue(true);
        mockFsUtils.readFileSync.mockReturnValue(JSON.stringify({
            metadata: {
                title: "Old Magazine",
                author: "Old Author"
                // No pageLimit or wordsPerPage
            },
            articles: [],
            interests: [],
            chatHighlights: []
            // No claudeChats
        }));
        
        const oldContentManager = new ContentManager(mockContentFile, mockFsUtils);
        
        expect(oldContentManager.content.metadata.pageLimit).toBeNull();
        expect(oldContentManager.content.metadata.wordsPerPage).toBe(300);
        expect(oldContentManager.content.claudeChats).toEqual([]);
    });
});