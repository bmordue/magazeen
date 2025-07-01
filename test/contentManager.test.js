import { ContentManager } from '../src/contentManager.js';
import { jest } from '@jest/globals';

// No jest.mock('fs') or direct fs import needed here anymore for mocking purposes.

describe('ContentManager - Claude Chat Import', () => {
    let contentManager;
    let mockFsUtils;
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
        mockFsUtils = {
            existsSync: jest.fn(),
            readFileSync: jest.fn(),
            writeFileSync: jest.fn(),
        };
        jest.clearAllMocks(); // Clear all mocks, including those in mockFsUtils if they were somehow set elsewhere.

        // Configure the mock implementations for mockFsUtils
        mockFsUtils.existsSync.mockImplementation(filePath => {
            if (filePath === mockContentFile) return false;
            if (filePath === sampleClaudeExportPath) return true;
            return false;
        });
        mockFsUtils.readFileSync.mockImplementation(filePath => {
            if (filePath === sampleClaudeExportPath) {
                return fixtureData;
            }
            return '';
        });
        mockFsUtils.writeFileSync.mockImplementation(() => {});

        contentManager = new ContentManager(mockContentFile, mockFsUtils);
        contentManager.content.claudeChats = [];
    });

    test('should initialize with an empty claudeChats array', () => {
        expect(contentManager.content.claudeChats).toEqual([]);
    });

    test('should import Claude chats from a valid JSON file', () => {
        const importCount = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath);

        expect(mockFsUtils.readFileSync).toHaveBeenCalledWith(sampleClaudeExportPath, 'utf8');
        expect(importCount).toBe(2);
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

        expect(mockFsUtils.writeFileSync).toHaveBeenCalledTimes(1); // saveContent should be called
    });

    test('should not import duplicate chats', () => {
        contentManager.importClaudeChatsFromFile(sampleClaudeExportPath); // First import
        const importCountSecond = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath); // Second import

        expect(contentManager.content.claudeChats.length).toBe(2);
        expect(importCountSecond).toBe(0);
        expect(mockFsUtils.writeFileSync).toHaveBeenCalledTimes(1);
    });

    test('should handle file not found for import', () => {
        mockFsUtils.existsSync.mockReturnValue(false);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const importCount = contentManager.importClaudeChatsFromFile('nonexistent/path.json');

        expect(importCount).toBe(0);
        expect(contentManager.content.claudeChats.length).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error: File not found at nonexistent/path.json");
        expect(mockFsUtils.writeFileSync).not.toHaveBeenCalled(); // Use mockFsUtils
        consoleErrorSpy.mockRestore();
    });

    test('should handle invalid JSON format in import file', () => {
        mockFsUtils.readFileSync.mockImplementation(filePath => { // Use mockFsUtils
            if (filePath === sampleClaudeExportPath) return "This is not JSON";
            return '';
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const importCount = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath);

        expect(importCount).toBe(0);
        expect(contentManager.content.claudeChats.length).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalledWith(`Error importing Claude chats from ${sampleClaudeExportPath}:`, expect.any(SyntaxError));
        expect(mockFsUtils.writeFileSync).not.toHaveBeenCalled(); // Use mockFsUtils
        consoleErrorSpy.mockRestore();
    });

    test('should handle JSON that is not an array', () => {
        mockFsUtils.readFileSync.mockImplementation(filePath => { // Use mockFsUtils
            if (filePath === sampleClaudeExportPath) return JSON.stringify({ "not": "an array" });
            return '';
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const importCount = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath);

        expect(importCount).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Expected an array of chats from the JSON file.');
        expect(mockFsUtils.writeFileSync).not.toHaveBeenCalled(); // Use mockFsUtils
        consoleErrorSpy.mockRestore();
    });


    test('should skip chats with missing essential fields and log a warning', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const importCount = contentManager.importClaudeChatsFromFile(sampleClaudeExportPath);

        expect(importCount).toBe(2);
        expect(contentManager.content.claudeChats.length).toBe(2);
        expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
        expect(consoleWarnSpy).toHaveBeenCalledWith('Skipping chat due to missing essential fields (uuid, name, or chat_messages):', expect.objectContaining({ name: "Malformed Chat - No Messages" }));
        expect(consoleWarnSpy).toHaveBeenCalledWith('Skipping chat due to missing essential fields (uuid, name, or chat_messages):', expect.objectContaining({ name: "Malformed Chat - No UUID" }));
        consoleWarnSpy.mockRestore();
    });

    test('should create claudeChats array in content if it does not exist (backward compatibility)', () => {
        const localMockFsUtils = {
            existsSync: jest.fn().mockImplementation(filePath => filePath === mockContentFile),
            readFileSync: jest.fn().mockImplementation(filePath => {
                if (filePath === mockContentFile) {
                    return JSON.stringify({
                        metadata: {}, articles: [], interests: [], chatHighlights: []
                    });
                }
                return '';
            }),
            writeFileSync: jest.fn(),
        };
        const cm = new ContentManager(mockContentFile, localMockFsUtils);
        expect(cm.content.claudeChats).toEqual([]);
    });
});

describe('ContentManager - Claude Chat Selection', () => {
    let contentManager;
    let mockFsUtils; // Changed from direct fs to mockFsUtils
    const mockContentFile = 'out/test-select-content.json';

    beforeEach(() => {
        mockFsUtils = { // Initialize mockFsUtils for this suite
            existsSync: jest.fn(),
            readFileSync: jest.fn(),
            writeFileSync: jest.fn(),
        };
        jest.clearAllMocks();

        mockFsUtils.existsSync.mockReturnValue(false);
        mockFsUtils.readFileSync.mockReturnValue('');
        mockFsUtils.writeFileSync.mockImplementation(() => {});

        contentManager = new ContentManager(mockContentFile, mockFsUtils); // Pass mockFsUtils
        // Add some mock chats for testing selection
        contentManager.content.claudeChats = [
            { id: 'chat1', title: 'Chat 1', conversation: [], selected: false },
            { id: 'chat2', title: 'Chat 2', conversation: [], selected: true },
            { id: 'chat3', title: 'Chat 3', conversation: [], selected: false },
        ];
        // Mock saveContent to prevent actual file writes during these specific tests,
        // but allow us to spy on it.
        jest.spyOn(contentManager, 'saveContent').mockImplementation(() => {});
    });

    test('should select a chat', () => {
        contentManager.selectClaudeChat('chat1');
        const chat = contentManager.content.claudeChats.find(c => c.id === 'chat1');
        expect(chat.selected).toBe(true);
        expect(contentManager.saveContent).toHaveBeenCalled();
    });

    test('should deselect a chat', () => {
        contentManager.deselectClaudeChat('chat2');
        const chat = contentManager.content.claudeChats.find(c => c.id === 'chat2');
        expect(chat.selected).toBe(false);
        expect(contentManager.saveContent).toHaveBeenCalled();
    });

    test('should toggle chat selection', () => {
        // Toggle chat1 (false -> true)
        contentManager.toggleClaudeChatSelection('chat1');
        let chat1 = contentManager.content.claudeChats.find(c => c.id === 'chat1');
        expect(chat1.selected).toBe(true);
        expect(contentManager.saveContent).toHaveBeenCalledTimes(1);

        // Toggle chat1 again (true -> false)
        contentManager.toggleClaudeChatSelection('chat1');
        chat1 = contentManager.content.claudeChats.find(c => c.id === 'chat1');
        expect(chat1.selected).toBe(false);
        expect(contentManager.saveContent).toHaveBeenCalledTimes(2);

        // Toggle chat2 (true -> false)
        contentManager.toggleClaudeChatSelection('chat2');
        const chat2 = contentManager.content.claudeChats.find(c => c.id === 'chat2');
        expect(chat2.selected).toBe(false);
        expect(contentManager.saveContent).toHaveBeenCalledTimes(3);
    });

    test('should log an error if trying to select/deselect a non-existent chat', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        contentManager.selectClaudeChat('nonexistent');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Chat with ID nonexistent not found.');

        contentManager.deselectClaudeChat('nonexistent');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Chat with ID nonexistent not found.');

        contentManager.toggleClaudeChatSelection('nonexistent');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Chat with ID nonexistent not found.');

        expect(contentManager.saveContent).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    test('loadContent should initialize selected field to false if missing', () => {
        // Use a local mockFsUtils for this specific test case if it needs different fs behavior
        const localMockFsUtils = {
            existsSync: jest.fn().mockReturnValue(true),
            readFileSync: jest.fn().mockReturnValue(JSON.stringify({
                claudeChats: [
                    { id: 'chat1', title: 'Chat 1' }, // selected is missing
                    { id: 'chat2', title: 'Chat 2', selected: true }
                ]
            })),
            writeFileSync: jest.fn(),
        };

        const cm = new ContentManager(mockContentFile, localMockFsUtils);
        expect(cm.content.claudeChats.find(c => c.id === 'chat1').selected).toBe(false);
        expect(cm.content.claudeChats.find(c => c.id === 'chat2').selected).toBe(true);
    });

    test('importClaudeChatsFromFile should initialize new chats with selected=false and preserve for existing', () => {
        // Initial state with one chat already selected (using the contentManager from beforeEach)
        contentManager.content.claudeChats = [
            { id: 'existing1', title: 'Existing Chat 1', conversation: [], selected: true, originalImportDate: new Date().toISOString(), dateAdded: new Date().toISOString() },
        ];
        contentManager.saveContent.mockClear(); // Clear previous calls to saveContent spy

        const newChatData = `[
            { "uuid": "new1", "name": "New Chat 1", "chat_messages": [] },
            { "uuid": "existing1", "name": "Existing Chat 1 Updated", "chat_messages": [{ "sender": "human", "text": "updated"}] }
        ]`;

        // Configure the main mockFsUtils (from beforeEach) for this specific import path
        mockFsUtils.existsSync.mockImplementation(filePath => filePath === 'import/path.json');
        mockFsUtils.readFileSync.mockImplementation(filePath => {
            if (filePath === 'import/path.json') return newChatData;
            return ''; // Default for other paths
        });

        contentManager.importClaudeChatsFromFile('import/path.json');

        const newChat = contentManager.content.claudeChats.find(c => c.id === 'new1');
        expect(newChat.selected).toBe(false);

        const existingChat = contentManager.content.claudeChats.find(c => c.id === 'existing1');
        expect(existingChat.selected).toBe(true); // Selection preserved
        expect(existingChat.title).toBe("Existing Chat 1 Updated"); // Other details updated
        expect(existingChat.conversation[0].text).toBe("updated");

        expect(contentManager.saveContent).toHaveBeenCalled();
    });
});
