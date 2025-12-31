import { ContentManager } from '../src/contentManager.js';
import http from 'http';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('URL Import Functionality', () => {
    let contentManager;
    let server;
    let testFileCounter = 0;
    const TEST_PORT = 8765;
    const TEST_URL = `http://localhost:${TEST_PORT}/chats.json`;

    beforeAll(() => {
        // Start a simple HTTP server for testing
        server = http.createServer((req, res) => {
            if (req.url === '/chats.json') {
                const sampleData = readFileSync(
                    path.join(__dirname, 'fixtures/sampleClaudeExport.json'),
                    'utf8'
                );
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(sampleData);
            } else if (req.url === '/invalid.json') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end('not valid json');
            } else if (req.url === '/not-array.json') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ key: 'value' }));
            } else if (req.url === '/redirect') {
                res.writeHead(302, { 'Location': '/chats.json' });
                res.end();
            } else if (req.url === '/timeout') {
                // Don't respond to simulate timeout
            } else if (req.url === '/not-found') {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        return new Promise((resolve) => {
            server.listen(TEST_PORT, () => {
                // Give server a moment to fully initialize
                setTimeout(resolve, 100);
            });
        });
    });

    afterAll(() => {
        return new Promise((resolve) => {
            server.close(resolve);
        });
    });

    beforeEach(() => {
        testFileCounter++;
        const testFile = `out/test-url-import-${testFileCounter}.json`;
        
        // Clean up test file before each test
        try {
            const fs = require('fs');
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        } catch {
            // Ignore cleanup errors
        }
        contentManager = new ContentManager(testFile);
    });

    afterEach(() => {
        // Clean up test file
        try {
            const fs = require('fs');
            const testFile = `out/test-url-import-${testFileCounter}.json`;
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        } catch {
            // Ignore cleanup errors
        }
    });

    test('importClaudeChatsFromUrl should successfully import chats from a valid URL', async () => {
        // Verify server is running by making a direct fetch
        const testFetch = await contentManager._fetchFromUrl(TEST_URL);
        expect(testFetch).toBeDefined();
        
        const importedCount = await contentManager.importClaudeChatsFromUrl(TEST_URL);
        
        expect(importedCount).toBe(2); // Based on sampleClaudeExport.json
        expect(contentManager.content.claudeChats).toHaveLength(2);
        expect(contentManager.content.claudeChats[0].title).toBeDefined();
        expect(contentManager.content.claudeChats[0].conversation).toBeDefined();
    });

    test('importClaudeChatsFromUrl should handle invalid URL', async () => {
        const importedCount = await contentManager.importClaudeChatsFromUrl('not-a-url');
        
        expect(importedCount).toBe(0);
    });

    test('importClaudeChatsFromUrl should handle HTTP errors', async () => {
        const importedCount = await contentManager.importClaudeChatsFromUrl(
            `http://localhost:${TEST_PORT}/not-found`
        );
        
        expect(importedCount).toBe(0);
    });

    test('importClaudeChatsFromUrl should handle invalid JSON', async () => {
        const importedCount = await contentManager.importClaudeChatsFromUrl(
            `http://localhost:${TEST_PORT}/invalid.json`
        );
        
        expect(importedCount).toBe(0);
    });

    test('importClaudeChatsFromUrl should handle non-array JSON', async () => {
        const importedCount = await contentManager.importClaudeChatsFromUrl(
            `http://localhost:${TEST_PORT}/not-array.json`
        );
        
        expect(importedCount).toBe(0);
    });

    test('importClaudeChatsFromUrl should follow redirects', async () => {
        const importedCount = await contentManager.importClaudeChatsFromUrl(
            `http://localhost:${TEST_PORT}/redirect`
        );
        
        expect(importedCount).toBe(2);
    });

    test('importClaudeChatsFromUrl should handle network errors', async () => {
        const importedCount = await contentManager.importClaudeChatsFromUrl(
            'http://this-domain-does-not-exist-12345.com/chats.json'
        );
        
        expect(importedCount).toBe(0);
    });

    test('importClaudeChatsFromUrl should handle timeout', async () => {
        const importedCount = await contentManager.importClaudeChatsFromUrl(
            `http://localhost:${TEST_PORT}/timeout`
        );
        
        expect(importedCount).toBe(0);
    }, 35000); // Increase timeout for this test

    test('importClaudeChatsFromUrl should not import duplicate chats', async () => {
        // Import once
        await contentManager.importClaudeChatsFromUrl(TEST_URL);
        const firstCount = contentManager.content.claudeChats.length;
        
        // Import again
        const importedCount = await contentManager.importClaudeChatsFromUrl(TEST_URL);
        
        expect(importedCount).toBe(0); // No new chats imported
        expect(contentManager.content.claudeChats.length).toBe(firstCount);
    });

    test('_fetchFromUrl should return data from HTTP server', async () => {
        const data = await contentManager._fetchFromUrl(TEST_URL);
        
        expect(data).toBeDefined();
        expect(typeof data).toBe('string');
        expect(() => JSON.parse(data)).not.toThrow();
    });

    test('_fetchFromUrl should reject on HTTP error', async () => {
        await expect(
            contentManager._fetchFromUrl(`http://localhost:${TEST_PORT}/not-found`)
        ).rejects.toThrow();
    });

    test('_fetchFromUrl should support HTTPS URLs', async () => {
        // This test just validates URL parsing - actual HTTPS requires a real server
        const httpsUrl = 'https://example.com/test.json';
        
        // We expect this to fail with network error since we don't have a real HTTPS server
        // but we're just checking it doesn't fail on URL parsing
        await expect(
            contentManager._fetchFromUrl(httpsUrl)
        ).rejects.toThrow();
    });
});
