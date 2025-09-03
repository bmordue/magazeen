import { ContentManager } from '../src/contentManager.js';
import { jest } from '@jest/globals';
// import fs from 'fs'; // fs is effectively not used directly in this test file anymore.

// The global jest.mock('fs', ...) is removed.
// Mocks are injected directly into ContentManager.

describe('ContentManager - Claude Chat Import', () => {
    let contentManager;
    let mockExistsSync;
    let mockReadFileSync;
    let mockWriteFileSync;
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
        // jest.clearAllMocks(); // Not strictly needed if we re-assign mocks, but good practice if any global mocks were used.
                                // However, since we are creating new jest.fn() each time, this is less critical for these specific mocks.
                                // Let's clear any *other* mocks that might exist.
        jest.clearAllMocks();


        mockExistsSync = jest.fn();
        mockReadFileSync = jest.fn();
        mockWriteFileSync = jest.fn();

        // Configure the mock implementations for fs functions
        mockExistsSync.mockImplementation(filePath => {
            if (filePath === mockContentFile) return false;
            if (filePath === sampleClaudeExportPath) return true;
            return false;
        });
        // Default readFileSync mock
        mockReadFileSync.mockImplementation(filePath => {
            if (filePath === sampleClaudeExportPath) {
                return fixtureData;
            }
            return '';
        });
        mockWriteFileSync.mockImplementation(() => {});

        // Initialize ContentManager for each test, injecting the mocks
        contentManager = new ContentManager(mockContentFile, {
            existsSync: mockExistsSync,
            readFileSync: mockReadFileSync,
            writeFileSync: mockWriteFileSync,
        });
        // Clear any claudeChats that might have been loaded if a mock file was somehow present
        // This logic might be redundant if mocks correctly prevent loading, but safe to keep.
        contentManager.content.claudeChats = [];
    });

    test('should initialize with an empty claudeChats array', () => {
        expect(contentManager.content.claudeChats).toEqual([]);
    });

    test('should import Claude chats from a valid JSON file', () => {
        // The beforeEach setup already configures readFileSync to return fixtureData for sampleClaudeExportPath
        const importCount = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath);

        expect(mockReadFileSync).toHaveBeenCalledWith(sampleClaudeExportPath, 'utf8');
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

        expect(mockWriteFileSync).toHaveBeenCalledTimes(1); // saveContent should be called
    });

    test('should not import duplicate chats', () => {
        // beforeEach sets up readFileSync to return fixtureData
        contentManager.importClaudeChatsFromFile(sampleClaudeExportPath); // First import
        const importCountSecond = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath); // Second import

        expect(contentManager.content.claudeChats.length).toBe(2); // Still 2, not 4
        expect(importCountSecond).toBe(0); // 0 new chats imported
        // writeFileSync is called once in the first import, and not in the second.
        // So it should still be called once in total for this test.
        expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    });

    test('should handle file not found for import', () => {
        mockExistsSync.mockReturnValue(false); // Simulate file does not exist

        // Suppress console.error for this test
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const importCount = contentManager.importClaudeChatsFromFile('nonexistent/path.json');

        expect(importCount).toBe(0);
        expect(contentManager.content.claudeChats.length).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error: File not found at nonexistent/path.json");
        expect(mockWriteFileSync).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    test('should handle invalid JSON format in import file', () => {
        // Override the default readFileSync mock for this specific test case
        mockReadFileSync.mockImplementation(filePath => {
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
        expect(mockWriteFileSync).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    test('should handle JSON that is not an array', () => {
        // Override the default readFileSync mock
        mockReadFileSync.mockImplementation(filePath => {
            if (filePath === sampleClaudeExportPath) {
                return JSON.stringify({ "not": "an array" });
            }
            return '';
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const importCount = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath);

        expect(importCount).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Expected an array of chats from the JSON file.');
        expect(mockWriteFileSync).not.toHaveBeenCalled();
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

    test('should gracefully handle chats with empty or invalid chat_messages array', () => {
        const malformedData = JSON.stringify([
            {
                "uuid": "valid-uuid-1",
                "name": "Chat with Empty Messages",
                "created_at": "2023-01-01T12:00:00Z",
                "chat_messages": []
            },
            {
                "uuid": "valid-uuid-2",
                "name": "Chat with Invalid Messages",
                "created_at": "2023-01-02T12:00:00Z",
                "chat_messages": "not-an-array"
            }
        ]);
        mockReadFileSync.mockReturnValue(malformedData);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const importCount = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath);

        // Expects the chat with an empty message array to be imported (as it's valid)
        // and the one with a non-array `chat_messages` to be skipped.
        expect(importCount).toBe(1);
        expect(contentManager.content.claudeChats.length).toBe(1);
        expect(contentManager.content.claudeChats[0].title).toBe("Chat with Empty Messages");

        // Check that a warning was logged for the invalid chat structure.
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Skipping chat due to missing essential fields (uuid, name, or chat_messages):',
            expect.objectContaining({ name: "Chat with Invalid Messages" })
        );
        consoleWarnSpy.mockRestore();
    });


    test('should create claudeChats array in content if it does not exist (backward compatibility)', () => {
        // Specific mock setup for this test
        const localMockExistsSync = jest.fn(filePath => filePath === mockContentFile);
        const localMockReadFileSync = jest.fn(filePath => {
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
        const localMockWriteFileSync = jest.fn(); // Not expected to be called during construction load

        const cm = new ContentManager(mockContentFile, {
            existsSync: localMockExistsSync,
            readFileSync: localMockReadFileSync,
            writeFileSync: localMockWriteFileSync,
        });
        expect(cm.content.claudeChats).toEqual([]);
        expect(localMockExistsSync).toHaveBeenCalledWith(mockContentFile);
        expect(localMockReadFileSync).toHaveBeenCalledWith(mockContentFile, 'utf8');
        // writeFileSync should not be called just by loading content
        expect(localMockWriteFileSync).not.toHaveBeenCalled();
    });
});

describe('ContentManager - Claude Chat Selection', () => {
    let contentManager;
    let mockWriteFileSync;
    const mockContentFile = 'out/test-magazine-content.json';

    beforeEach(() => {
        jest.clearAllMocks();

        const mockExistsSync = jest.fn(() => false);
        const mockReadFileSync = jest.fn(() => '');
        mockWriteFileSync = jest.fn();

        contentManager = new ContentManager(mockContentFile, {
            existsSync: mockExistsSync,
            readFileSync: mockReadFileSync,
            writeFileSync: mockWriteFileSync,
        });

        // Add sample chats for testing
        contentManager.content.claudeChats = [
            {
                id: 'chat-1',
                title: 'Test Chat 1',
                selected: false,
                conversation: [],
                category: 'Test'
            },
            {
                id: 'chat-2',
                title: 'Test Chat 2',
                selected: true,
                conversation: [],
                category: 'Test'
            }
        ];
    });

    describe('selectClaudeChat', () => {
        test('should select a chat that exists', () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            contentManager.selectClaudeChat('chat-1');
            
            expect(contentManager.content.claudeChats[0].selected).toBe(true);
            expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith('Chat "Test Chat 1" selected.');
            
            consoleLogSpy.mockRestore();
        });

        test('should handle selecting non-existent chat', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            contentManager.selectClaudeChat('non-existent');
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Chat with ID non-existent not found.');
            expect(mockWriteFileSync).not.toHaveBeenCalled();
            
            consoleErrorSpy.mockRestore();
        });
    });

    describe('deselectClaudeChat', () => {
        test('should deselect a chat that exists', () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            contentManager.deselectClaudeChat('chat-2');
            
            expect(contentManager.content.claudeChats[1].selected).toBe(false);
            expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith('Chat "Test Chat 2" deselected.');
            
            consoleLogSpy.mockRestore();
        });

        test('should handle deselecting non-existent chat', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            contentManager.deselectClaudeChat('non-existent');
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Chat with ID non-existent not found.');
            expect(mockWriteFileSync).not.toHaveBeenCalled();
            
            consoleErrorSpy.mockRestore();
        });
    });

    describe('toggleClaudeChatSelection', () => {
        test('should toggle chat selection from false to true', () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            contentManager.toggleClaudeChatSelection('chat-1');
            
            expect(contentManager.content.claudeChats[0].selected).toBe(true);
            expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith('Chat "Test Chat 1" selection toggled to: true.');
            
            consoleLogSpy.mockRestore();
        });

        test('should toggle chat selection from true to false', () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            contentManager.toggleClaudeChatSelection('chat-2');
            
            expect(contentManager.content.claudeChats[1].selected).toBe(false);
            expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith('Chat "Test Chat 2" selection toggled to: false.');
            
            consoleLogSpy.mockRestore();
        });

        test('should handle toggling non-existent chat', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            contentManager.toggleClaudeChatSelection('non-existent');
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Chat with ID non-existent not found.');
            expect(mockWriteFileSync).not.toHaveBeenCalled();
            
            consoleErrorSpy.mockRestore();
        });
    });
});
