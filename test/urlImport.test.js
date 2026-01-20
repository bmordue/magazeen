import { ContentManager } from '../src/contentManager.js';
import http from 'http';
import { readFileSync, existsSync, unlinkSync } from 'fs';
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
    const connections = new Set();

    beforeAll((done) => {
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

        // Track connections so we can close them all
        server.on('connection', (conn) => {
            connections.add(conn);
            conn.on('close', () => {
                connections.delete(conn);
            });
        });

        server.listen(TEST_PORT, done);
    });

    afterAll((done) => {
        // Close all active connections
        for (const conn of connections) {
            conn.destroy();
        }
        connections.clear();
        
        server.close(done);
    });

    beforeEach(() => {
        testFileCounter++;
        const testFile = `out/test-url-import-${testFileCounter}.json`;
        
        // Clean up test file before each test
        try {
            if (existsSync(testFile)) {
                unlinkSync(testFile);
            }
        } catch {
            // Ignore cleanup errors
        }
        contentManager = new ContentManager(testFile);
    });

    afterEach(() => {
        // Clean up test file
        try {
            const testFile = `out/test-url-import-${testFileCounter}.json`;
            if (existsSync(testFile)) {
                unlinkSync(testFile);
            }
        } catch {
            // Ignore cleanup errors
        }
    });

    test('importClaudeChatsFromUrl should successfully import chats from a valid URL', async () => {
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

    test('importClaudeChatsFromUrl should successfully fetch and import from HTTP server', async () => {
        const importedCount = await contentManager.importClaudeChatsFromUrl(TEST_URL);
        
        expect(importedCount).toBeGreaterThan(0);
        expect(contentManager.content.claudeChats.length).toBeGreaterThan(0);
    });

    test('importClaudeChatsFromUrl should handle HTTP error status codes', async () => {
        const importedCount = await contentManager.importClaudeChatsFromUrl(
            `http://localhost:${TEST_PORT}/not-found`
        );
        
        expect(importedCount).toBe(0);
    });

    test('importClaudeChatsFromUrl should support HTTPS URLs', async () => {
        // This test validates that HTTPS URLs are accepted and errors are handled gracefully
        const httpsUrl = 'https://example.com/test.json';
        
        const importedCount = await contentManager.importClaudeChatsFromUrl(httpsUrl);
        
        // We don't expect any chats to be imported from this URL in tests,
        // but the call should complete without throwing synchronously.
        expect(importedCount).toBe(0);
    });
});
