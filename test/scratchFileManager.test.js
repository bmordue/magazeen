import { ScratchFileManager } from '../src/scratchFileManager.js';
import { ContentManager } from '../src/contentManager.js';
import { jest } from '@jest/globals';

describe('ScratchFileManager', () => {
    let scratchFileManager;
    let contentManager;
    let mockExistsSync;
    let mockReadFileSync;
    let mockWriteFileSync;
    let mockSavedContent;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock file system utilities
        mockExistsSync = jest.fn();
        mockReadFileSync = jest.fn();
        mockWriteFileSync = jest.fn();
        mockSavedContent = null;

        // Configure mocks
        mockExistsSync.mockImplementation(() => false);
        mockReadFileSync.mockImplementation(() => '');
        mockWriteFileSync.mockImplementation((path, content) => {
            mockSavedContent = content;
        });

        // Create content manager with sample data
        contentManager = new ContentManager('out/test-content.json', {
            existsSync: mockExistsSync,
            readFileSync: mockReadFileSync,
            writeFileSync: mockWriteFileSync,
        });

        // Add sample chats
        contentManager.content.claudeChats = [
            {
                id: '12345678-1234-1234-1234-123456789abc',
                title: 'First Chat - Selected',
                conversation: [{ sender: 'human', text: 'Hello' }],
                selected: true,
                category: 'General',
                dateAdded: '2023-01-01T00:00:00.000Z'
            },
            {
                id: '87654321-4321-4321-4321-cba987654321',
                title: 'Second Chat - Not Selected',
                conversation: [{ sender: 'human', text: 'Hi there' }],
                selected: false,
                category: 'General',
                dateAdded: '2023-01-02T00:00:00.000Z'
            },
            {
                id: 'abcdef12-abcd-abcd-abcd-abcdef123456',
                title: 'Third Chat - Selected',
                conversation: [{ sender: 'human', text: 'Hey' }],
                selected: true,
                category: 'Tech',
                dateAdded: '2023-01-03T00:00:00.000Z'
            }
        ];

        // Create scratch file manager
        scratchFileManager = new ScratchFileManager(contentManager, {
            existsSync: mockExistsSync,
            readFileSync: mockReadFileSync,
            writeFileSync: mockWriteFileSync,
        });
    });

    describe('exportToScratchFile', () => {
        test('should export chats to scratch file with correct format', () => {
            const result = scratchFileManager.exportToScratchFile('out/test-scratch.txt');

            expect(result.success).toBe(true);
            expect(result.totalChats).toBe(3);
            expect(result.selectedChats).toBe(2);
            expect(mockWriteFileSync).toHaveBeenCalledWith('out/test-scratch.txt', expect.any(String), 'utf8');

            // Verify file content structure
            const content = mockSavedContent;
            expect(content).toContain('# Magazine Scratch File');
            expect(content).toContain('# Instructions:');
            expect(content).toContain('+ [12345678] First Chat - Selected');
            expect(content).toContain('+ [abcdef12] Third Chat - Selected');
            expect(content).toContain('- [87654321] Second Chat - Not Selected');
        });

        test('should place selected chats before unselected chats', () => {
            scratchFileManager.exportToScratchFile('out/test-scratch.txt');
            const content = mockSavedContent;

            const lines = content.split('\n').filter(l => l && !l.startsWith('#'));
            const selectedLines = lines.filter(l => l.startsWith('+'));
            const unselectedLines = lines.filter(l => l.startsWith('-'));

            expect(selectedLines.length).toBe(2);
            expect(unselectedLines.length).toBe(1);

            // Ensure selected come before unselected
            const firstSelectedIndex = lines.findIndex(l => l.startsWith('+'));
            const firstUnselectedIndex = lines.findIndex(l => l.startsWith('-'));
            expect(firstSelectedIndex).toBeLessThan(firstUnselectedIndex);
        });

        test('should return error when no chats available', () => {
            contentManager.content.claudeChats = [];
            const result = scratchFileManager.exportToScratchFile('out/test-scratch.txt');

            expect(result.success).toBe(false);
            expect(result.message).toContain('No chats available');
            expect(mockWriteFileSync).not.toHaveBeenCalled();
        });

        test('should handle export errors gracefully', () => {
            mockWriteFileSync.mockImplementation(() => {
                throw new Error('Write failed');
            });

            const result = scratchFileManager.exportToScratchFile('out/test-scratch.txt');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Write failed');
        });
    });

    describe('applyFromScratchFile', () => {
        test('should apply scratch file changes to content', () => {
            const scratchContent = `# Magazine Scratch File
+ [12345678] First Chat - Selected
- [abcdef12] Third Chat - Selected
+ [87654321] Second Chat - Not Selected
`;

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(scratchContent);

            const result = scratchFileManager.applyFromScratchFile('out/test-scratch.txt');

            expect(result.success).toBe(true);
            expect(result.totalChats).toBe(3);
            
            // Check updated selections based on new order from scratch file
            const chats = contentManager.content.claudeChats;
            
            // After applying, the order is: first, third, second (as per scratch file)
            // And selections are: true, false, true
            expect(chats.find(c => c.id.startsWith('12345678')).selected).toBe(true);  // First Chat - still selected
            expect(chats.find(c => c.id.startsWith('87654321')).selected).toBe(true);  // Second Chat - now selected
            expect(chats.find(c => c.id.startsWith('abcdef12')).selected).toBe(false); // Third Chat - now deselected

            expect(mockWriteFileSync).toHaveBeenCalled(); // Content saved
        });

        test('should reorder chats according to scratch file', () => {
            const scratchContent = `# Magazine Scratch File
+ [abcdef12] Third Chat - Selected
- [87654321] Second Chat - Not Selected
+ [12345678] First Chat - Selected
`;

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(scratchContent);

            const result = scratchFileManager.applyFromScratchFile('out/test-scratch.txt');

            expect(result.success).toBe(true);
            
            // Check new order
            const chats = contentManager.content.claudeChats;
            expect(chats[0].id).toContain('abcdef12'); // Third chat is now first
            expect(chats[1].id).toContain('87654321'); // Second chat is second
            expect(chats[2].id).toContain('12345678'); // First chat is now last
        });

        test('should return error when scratch file not found', () => {
            mockExistsSync.mockReturnValue(false);

            const result = scratchFileManager.applyFromScratchFile('out/missing.txt');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });

        test('should handle malformed lines gracefully', () => {
            const scratchContent = `# Magazine Scratch File
+ [12345678] First Chat - Selected
invalid line without proper format
- [87654321] Second Chat - Not Selected
`;

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(scratchContent);

            const result = scratchFileManager.applyFromScratchFile('out/test-scratch.txt');

            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('Invalid format');
        });

        test('should reject entries with missing titles', () => {
            const scratchContent = `# Magazine Scratch File
+ [12345678] First Chat - Selected
+ [87654321]
- [abcdef12] Third Chat
`;

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(scratchContent);

            const result = scratchFileManager.applyFromScratchFile('out/test-scratch.txt');

            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('Missing title');
        });

        test('should skip comment and empty lines', () => {
            const scratchContent = `# Magazine Scratch File
# This is a comment

+ [12345678] First Chat - Selected

# Another comment
- [87654321] Second Chat - Not Selected

`;

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(scratchContent);

            const result = scratchFileManager.applyFromScratchFile('out/test-scratch.txt');

            expect(result.success).toBe(true);
            expect(result.totalChats).toBe(3); // All three chats should still be present
        });

        test('should report warnings for chats not found', () => {
            const scratchContent = `# Magazine Scratch File
+ [12345678] First Chat - Selected
+ [99999999] Nonexistent Chat
- [87654321] Second Chat - Not Selected
`;

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(scratchContent);

            const result = scratchFileManager.applyFromScratchFile('out/test-scratch.txt');

            expect(result.success).toBe(true);
            expect(result.notFoundIds).toContain('99999999');
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        test('should track selected and deselected counts', () => {
            const scratchContent = `# Magazine Scratch File
- [12345678] First Chat - Selected
+ [87654321] Second Chat - Not Selected
+ [abcdef12] Third Chat - Selected
`;

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(scratchContent);

            const result = scratchFileManager.applyFromScratchFile('out/test-scratch.txt');

            expect(result.success).toBe(true);
            expect(result.selectedCount).toBe(1);   // Second chat was selected
            expect(result.deselectedCount).toBe(1); // First chat was deselected
        });
    });

    describe('integration with ContentManager', () => {
        test('should export and apply scratch file in round trip', () => {
            // First export
            const exportResult = scratchFileManager.exportToScratchFile('out/test-scratch.txt');
            expect(exportResult.success).toBe(true);

            const exportedContent = mockSavedContent;

            // Modify the content (swap selections)
            const modifiedContent = exportedContent
                .replace('+ [12345678] First Chat - Selected', '- [12345678] First Chat - Selected')
                .replace('- [87654321] Second Chat - Not Selected', '+ [87654321] Second Chat - Not Selected');

            // Apply modified content
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(modifiedContent);

            const applyResult = scratchFileManager.applyFromScratchFile('out/test-scratch.txt');
            expect(applyResult.success).toBe(true);

            // Verify changes
            const chats = contentManager.content.claudeChats;
            expect(chats.find(c => c.id.startsWith('12345678')).selected).toBe(false);
            expect(chats.find(c => c.id.startsWith('87654321')).selected).toBe(true);
        });
    });

    describe('async methods', () => {
        let mockPathExists;
        let mockReadFile;
        let mockWriteFile;
        let mockMkdir;

        beforeEach(() => {
            // Add async mocks
            mockPathExists = jest.fn();
            mockReadFile = jest.fn();
            mockWriteFile = jest.fn();
            mockMkdir = jest.fn().mockResolvedValue(undefined);

            // Re-create content manager with async mocks
            contentManager = new ContentManager('out/test-content.json', {
                existsSync: mockExistsSync,
                readFileSync: mockReadFileSync,
                writeFileSync: mockWriteFileSync,
                pathExists: mockPathExists,
                readFile: mockReadFile,
                writeFile: mockWriteFile,
                mkdir: mockMkdir,
            });

            // Re-add sample chats
            contentManager.content.claudeChats = [
                {
                    id: '12345678-1234-1234-1234-123456789abc',
                    title: 'First Chat - Selected',
                    conversation: [{ sender: 'human', text: 'Hello' }],
                    selected: true,
                    category: 'General',
                    dateAdded: '2023-01-01T00:00:00.000Z'
                },
                {
                    id: '87654321-4321-4321-4321-cba987654321',
                    title: 'Second Chat - Not Selected',
                    conversation: [{ sender: 'human', text: 'Hi there' }],
                    selected: false,
                    category: 'General',
                    dateAdded: '2023-01-02T00:00:00.000Z'
                },
                {
                    id: 'abcdef12-abcd-abcd-abcd-abcdef123456',
                    title: 'Third Chat - Selected',
                    conversation: [{ sender: 'human', text: 'Hey' }],
                    selected: true,
                    category: 'Tech',
                    dateAdded: '2023-01-03T00:00:00.000Z'
                }
            ];

            // Re-create scratch file manager with async mocks
            scratchFileManager = new ScratchFileManager(contentManager, {
                existsSync: mockExistsSync,
                readFileSync: mockReadFileSync,
                writeFileSync: mockWriteFileSync,
                pathExists: mockPathExists,
                readFile: mockReadFile,
                writeFile: mockWriteFile,
                mkdir: mockMkdir,
            });
        });

        test('should export chats using async method', async () => {
            mockWriteFile.mockResolvedValue(undefined);

            const result = await scratchFileManager.exportToScratchFileAsync('out/test-async.txt');

            expect(result.success).toBe(true);
            expect(result.totalChats).toBe(3);
            expect(result.selectedChats).toBe(2);
            expect(mockWriteFile).toHaveBeenCalledWith('out/test-async.txt', expect.any(String), 'utf8');
        });

        test('should apply scratch file using async method', async () => {
            const scratchContent = `# Magazine Scratch File
+ [12345678] First Chat - Selected
+ [87654321] Second Chat - Not Selected
+ [abcdef12] Third Chat - Selected
`;
            mockPathExists.mockResolvedValue(true);
            mockReadFile.mockResolvedValue(scratchContent);
            mockWriteFile.mockResolvedValue(undefined);

            const result = await scratchFileManager.applyFromScratchFileAsync('out/test-async.txt');

            if (!result.success) {
                console.log('Result:', result);
            }
            expect(result.success).toBe(true);
            expect(result.totalChats).toBe(3);
            expect(mockWriteFile).toHaveBeenCalled(); // saveContentAsync is called
        });

        test('should return error when file not found in async method', async () => {
            mockPathExists.mockResolvedValue(false);

            const result = await scratchFileManager.applyFromScratchFileAsync('out/missing.txt');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });

        test('should handle export errors in async method', async () => {
            mockWriteFile.mockRejectedValue(new Error('Write failed'));

            const result = await scratchFileManager.exportToScratchFileAsync('out/test-async.txt');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Write failed');
        });
    });
});
