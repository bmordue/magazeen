import { ArticleGenerator } from '../src/articleGenerator.js';
import { ContentManager } from '../src/contentManager.js';

describe('ArticleGenerator HTML Sanitization', () => {
    let contentManager;
    let articleGenerator;

    beforeEach(() => {
        contentManager = new ContentManager('/tmp/test-content.json');
        articleGenerator = new ArticleGenerator(contentManager);
    });

    afterEach(() => {
        // Clean up any test files
        try {
            const fs = require('fs');
            if (fs.existsSync('/tmp/test-content.json')) {
                fs.unlinkSync('/tmp/test-content.json');
            }
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('XSS Protection', () => {
        test('should remove script tags from interest topics', () => {
            // Add a malicious interest
            contentManager.addInterest(
                '<script>alert("XSS")</script>Malicious Topic',
                'high',
                'A topic with embedded JavaScript'
            );

            const articleId = articleGenerator.generateInterestArticle();
            const article = contentManager.content.articles.find(a => a.id === articleId);
            
            // Should not contain script tags
            expect(article.content).not.toMatch(/<script.*?>.*?<\/script>/i);
            // Should still contain the safe text
            expect(article.content).toContain('Malicious Topic');
        });

        test('should remove dangerous event handlers', () => {
            contentManager.addInterest(
                'Normal Topic',
                'high', 
                '<img onerror="alert(1)" src="invalid">Dangerous description with event handler'
            );

            const articleId = articleGenerator.generateInterestArticle();
            const article = contentManager.content.articles.find(a => a.id === articleId);
            
            // Should not contain onerror handler
            expect(article.content).not.toMatch(/onerror\s*=/i);
            // Should still contain img tag but sanitized
            expect(article.content).toContain('<img');
            expect(article.content).toContain('Dangerous description with event handler');
        });

        test('should handle CSS-based XSS attempts', () => {
            contentManager.addChatHighlight(
                'XSS Test',
                'security',
                'Testing CSS XSS',
                '<div style="background:url(javascript:alert(1))">CSS XSS attempt</div>'
            );

            const articleId = articleGenerator.generateChatHighlightsArticle();
            const article = contentManager.content.articles.find(a => a.id === articleId);
            
            // Should not contain javascript: URLs in style attributes
            expect(article.content).not.toMatch(/javascript:/i);
            // Should still contain the div but sanitized
            expect(article.content).toContain('CSS XSS attempt');
        });

        test('should preserve safe HTML elements', () => {
            contentManager.addInterest(
                'Safe HTML Topic',
                'medium',
                'This has <strong>bold</strong> and <em>italic</em> text with a <a href="https://example.com">safe link</a>'
            );

            const articleId = articleGenerator.generateInterestArticle();
            const article = contentManager.content.articles.find(a => a.id === articleId);
            
            // Should preserve safe HTML elements
            expect(article.content).toContain('<strong>bold</strong>');
            expect(article.content).toContain('<em>italic</em>');
            expect(article.content).toContain('<a href="https://example.com">safe link</a>');
        });

        test('should handle Unicode-based XSS attempts', () => {
            // Test Unicode encoding that might bypass simple regex filters
            const unicodeXSS = '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e';
            
            contentManager.addInterest(
                'Unicode Test',
                'low',
                unicodeXSS + 'Regular content'
            );

            const articleId = articleGenerator.generateInterestArticle();
            const article = contentManager.content.articles.find(a => a.id === articleId);
            
            // Should not execute or contain actual alert function calls (Unicode should be treated as literal text)
            expect(article.content).not.toMatch(/<script/i);
            expect(article.content).toContain('Regular content');
            // The Unicode should be treated as literal text, not decoded
            expect(article.content).toContain('u003cscript');
        });

        test('should sanitize nested XSS attempts', () => {
            contentManager.addChatHighlight(
                'Nested XSS',
                'test',
                'Testing nested attacks',
                '<div><span onclick="alert(1)"><img onerror="alert(2)" src="x"><script>alert(3)</script></span></div>'
            );

            const articleId = articleGenerator.generateChatHighlightsArticle();
            const article = contentManager.content.articles.find(a => a.id === articleId);
            
            // Should remove all XSS vectors
            expect(article.content).not.toMatch(/onclick/i);
            expect(article.content).not.toMatch(/onerror/i);
            expect(article.content).not.toMatch(/<script/i);
            expect(article.content).not.toMatch(/alert\(/i);
        });
    });

    describe('Backward Compatibility', () => {
        test('should handle normal text without HTML', () => {
            contentManager.addInterest(
                'Normal Topic',
                'high',
                'This is just normal text without any HTML'
            );

            const articleId = articleGenerator.generateInterestArticle();
            const article = contentManager.content.articles.find(a => a.id === articleId);
            
            expect(article.content).toContain('Normal Topic');
            expect(article.content).toContain('This is just normal text without any HTML');
        });

        test('should escape basic HTML entities like the old sanitizer', () => {
            contentManager.addInterest(
                'Topic with & ampersand',
                'medium',
                'Description with < less than and > greater than and "quotes"'
            );

            const articleId = articleGenerator.generateInterestArticle();
            const article = contentManager.content.articles.find(a => a.id === articleId);
            
            // DOMPurify should handle these safely - check that dangerous characters are neutralized
            expect(article.content).toContain('Topic with & ampersand'); // Ampersand is OK in text
            expect(article.content).toContain('less than and &gt; greater than');
            expect(article.content).toContain('"quotes"'); // Quotes are OK in text content
        });
    });
});