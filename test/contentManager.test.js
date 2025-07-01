import { ContentManager } from '../src/contentManager.js';
import { jest } from '@jest/globals';
import fs from 'fs';

// Mock the fs module using a factory to provide mock functions for named exports
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

describe('ContentManager - Claude Chat Import', () => {
    let contentManager;
    const mockContentFile = 'out/test-magazine-content.json';
    const sampleClaudeExportPath = 'test/fixtures/sampleClaudeExport.json';

    const fixtureData = `[
    {
        "uuid": "2b147e30-8e5e-4646-b70e-cbda3d1fbaf6",
        "name": "Trouble attaching file to Mastodon post with Node.js script",
        "created_at": "2023-08-28T12:12:59.569801Z",
        "chat_messages": [
            { "sender": "human", "text": "This script is posting a message to Mastodon, but the file attachment is not included. Can you see what the problem is?", "created_at": "2023-08-28T12:13:10.809320Z" },
            { "sender": "assistant", "text": "The issue is that the script is not properly attaching the media file when posting the status.", "created_at": "2023-08-28T12:13:10.871894Z" }
        ]
    },
    {
        "uuid": "a1b2c3d4-e5f6-7890-1234-abcdef123456",
        "name": "Second Chat Example",
        "created_at": "2023-09-15T10:00:00.000000Z",
        "chat_messages": [
            { "sender": "human", "text": "What's the weather like?", "created_at": "2023-09-15T10:00:05.000000Z" },
            { "sender": "assistant", "text": "It's sunny in California!", "created_at": "2023-09-15T10:00:10.000000Z" }
        ]
    },
    {
        "uuid": "malformed-chat-no-messages",
        "name": "Malformed Chat - No Messages",
        "created_at": "2023-09-16T10:00:00.000000Z"
    },
    {
        "name": "Malformed Chat - No UUID",
        "created_at": "2023-09-17T10:00:00.000000Z",
        "chat_messages": []
    }
]`;

    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks before each test

        // Configure the mock implementations for fs functions provided by jest.mock factory
        fs.existsSync.mockImplementation(filePath => {
            if (filePath === mockContentFile) return false;
            if (filePath === sampleClaudeExportPath) return true;
            return false;
        });
        // Default readFileSync mock
        fs.readFileSync.mockImplementation(filePath => {
            if (filePath === sampleClaudeExportPath) {
                return fixtureData;
            }
            return '';
        });
        fs.writeFileSync.mockImplementation(() => {});

        // Initialize ContentManager for each test
        // Ensure that the constructor does not try to read a non-existent mock file during setup
        // by ensuring existsSync for mockContentFile returns false initially (handled by mock above).
        // by ensuring existsSync for mockContentFile returns false initially.
        contentManager = new ContentManager(mockContentFile);
        // Clear any claudeChats that might have been loaded if a mock file was somehow present
        contentManager.content.claudeChats = [];
    });

    test('should initialize with an empty claudeChats array', () => {
        expect(contentManager.content.claudeChats).toEqual([]);
    });

    test('should import Claude chats from a valid JSON file', () => {
        // The beforeEach setup already configures readFileSync to return fixtureData for sampleClaudeExportPath
        const importCount = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath);

        expect(fs.readFileSync).toHaveBeenCalledWith(sampleClaudeExportPath, 'utf8');
        expect(importCount).toBe(2); // Two valid chats in the fixtureData
        expect(contentManager.content.claudeChats.length).toBe(2);

        const firstChat = contentManager.content.claudeChats[0];
        expect(firstChat.id).toBe("2b147e30-8e5e-4646-b70e-cbda3d1fbaf6");
        expect(firstChat.title).toBe("Trouble attaching file to Mastodon post with Node.js script");
        expect(firstChat.conversation.length).toBe(2);
        expect(firstChat.conversation[0].sender).toBe("human");
        expect(firstChat.conversation[0].text).toBe("This script is posting a message to Mastodon, but the file attachment is not included. Can you see what the problem is?");
        expect(firstChat.category).toBe("Claude Import");
        expect(firstChat.dateAdded).toBe("2023-08-28T12:12:59.569801Z");

        const secondChat = contentManager.content.claudeChats[1];
        expect(secondChat.id).toBe("a1b2c3d4-e5f6-7890-1234-abcdef123456");
        expect(secondChat.title).toBe("Second Chat Example");

        expect(fs.writeFileSync).toHaveBeenCalledTimes(1); // saveContent should be called
    });

    test('should not import duplicate chats', () => {
        // beforeEach sets up readFileSync to return fixtureData
        contentManager.importClaudeChatsFromFile(sampleClaudeExportPath); // First import
        const importCountSecond = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath); // Second import

        expect(contentManager.content.claudeChats.length).toBe(2); // Still 2, not 4
        expect(importCountSecond).toBe(0); // 0 new chats imported
        expect(fs.writeFileSync).toHaveBeenCalledTimes(1); // saveContent called only for the first import
    });

    test('should handle file not found for import', () => {
        fs.existsSync.mockReturnValue(false); // Simulate file does not exist

        // Suppress console.error for this test
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const importCount = contentManager.importClaudeChatsFromFile('nonexistent/path.json');

        expect(importCount).toBe(0);
        expect(contentManager.content.claudeChats.length).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error: File not found at nonexistent/path.json");
        expect(fs.writeFileSync).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    test('should handle invalid JSON format in import file', () => {
        // Override the default readFileSync mock for this specific test case
        fs.readFileSync.mockImplementation(filePath => {
            if (filePath === sampleClaudeExportPath) {
                return "This is not JSON";
            }
            return '';
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const importCount = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath);

        expect(importCount).toBe(0);
        expect(contentManager.content.claudeChats.length).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalledWith(`Error importing Claude chats from ${sampleClaudeExportPath}:`, expect.any(SyntaxError));
        expect(fs.writeFileSync).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    test('should handle JSON that is not an array', () => {
        // Override the default readFileSync mock
        fs.readFileSync.mockImplementation(filePath => {
            if (filePath === sampleClaudeExportPath) {
                return JSON.stringify({ "not": "an array" });
            }
            return '';
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const importCount = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath);

        expect(importCount).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Expected an array of chats from the JSON file.');
        expect(fs.writeFileSync).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });


    test('should skip chats with missing essential fields and log a warning', () => {
        // beforeEach ensures fixtureData (which includes malformed chats) is used by readFileSync
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const importCount = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath);

        expect(importCount).toBe(2); // Only 2 valid chats should be imported
        expect(contentManager.content.claudeChats.length).toBe(2);
        expect(consoleWarnSpy).toHaveBeenCalledTimes(2); // Two malformed chats
        expect(consoleWarnSpy).toHaveBeenCalledWith('Skipping chat due to missing essential fields (uuid, name, or chat_messages):', expect.objectContaining({ name: "Malformed Chat - No Messages" }));
        expect(consoleWarnSpy).toHaveBeenCalledWith('Skipping chat due to missing essential fields (uuid, name, or chat_messages):', expect.objectContaining({ name: "Malformed Chat - No UUID" }));

        consoleWarnSpy.mockRestore();
    });

    test('should create claudeChats array in content if it does not exist (backward compatibility)', () => {
        // Specific mock setup for this test
        fs.existsSync.mockImplementation(filePath => filePath === mockContentFile);
        fs.readFileSync.mockImplementation(filePath => {
            if (filePath === mockContentFile) {
                return JSON.stringify({
                    metadata: {},
                    articles: [],
                    interests: [],
                    chatHighlights: []
                });
            }
            return '';
        });

        const cm = new ContentManager(mockContentFile);
        expect(cm.content.claudeChats).toEqual([]);
    });
});
