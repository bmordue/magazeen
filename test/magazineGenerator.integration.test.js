import { MagazineGenerator } from '../src/magazineGenerator.js';
import { ContentManager } from '../src/contentManager.js';
import { ArticleGenerator } from '../src/articleGenerator.js';
// import EPUBMagazineGenerator from '../src/epub_generator.js'; // No longer imported directly
import { jest } from '@jest/globals';
// No fs import or jest.mock('fs') needed here anymore

describe('MagazineGenerator - Integration with Claude Chats', () => {
    let contentManager;
    let articleGenerator;
    let magazineGenerator;
    let mockEpubInstance;
    let mockEpubFactory;
    let mockFsUtils; // For injecting into ContentManager

    const mockContentFile = 'out/test-integration-content.json';

    beforeEach(() => {
        jest.clearAllMocks();

        mockEpubInstance = {
            initializeEPUB: jest.fn(),
            addArticle: jest.fn(),
            generateEPUB: jest.fn().mockResolvedValue('mock/path/to/epub.epub'),
        };
        mockEpubFactory = jest.fn(() => mockEpubInstance);

        mockFsUtils = {
            existsSync: jest.fn(),
            readFileSync: jest.fn(),
            writeFileSync: jest.fn(),
            mkdirSync: jest.fn(), // Retain if other parts of system might need it, though not directly by CM's core logic shown
        };

        mockFsUtils.existsSync.mockImplementation((path) => path === mockContentFile);
        mockFsUtils.readFileSync.mockImplementation((path) => {
            if (path === mockContentFile) {
                return JSON.stringify({
                    metadata: { title: "Test Mag", author: "Tester" }, // This metadata should be used
                    articles: [
                        { id: 'article1', title: 'Normal Article', content: 'Some text', category: 'Tech', author: 'Author1' }
                    ],
                    interests: [],
                    chatHighlights: [],
                    claudeChats: [
                        { id: 'chat1', title: 'Selected Chat', conversation: [{ sender: 'human', text: 'Hello', timestamp: '2023-01-01T12:00:00Z' }], selected: true, category: 'Tech Chat' },
                        { id: 'chat2', title: 'Unselected Chat', conversation: [{ sender: 'ai', text: 'Hi there', timestamp: '2023-01-02T12:00:00Z' }], selected: false, category: 'General' }
                    ]
                });
            }
            return '';
        });
        mockFsUtils.writeFileSync.mockImplementation(() => {});

        // Pass mockFsUtils to ContentManager
        contentManager = new ContentManager(mockContentFile, mockFsUtils);
        articleGenerator = new ArticleGenerator(contentManager);

        jest.spyOn(articleGenerator, 'generateInterestArticle').mockImplementation(() => {});
        jest.spyOn(articleGenerator, 'generateChatHighlightsArticle').mockImplementation(() => {});

        magazineGenerator = new MagazineGenerator(contentManager, articleGenerator, mockEpubFactory);
    });

    test('should generate magazine including selected Claude chats', async () => {
        await magazineGenerator.generateMagazine();

        expect(mockEpubFactory).toHaveBeenCalledTimes(1); // Factory was called
        expect(mockEpubInstance.initializeEPUB).toHaveBeenCalledWith("Test Mag", "Tester", undefined);

        expect(mockEpubInstance.addArticle).toHaveBeenCalledWith(
            'Normal Article', 'Some text', 'Author1', 'Tech'
        );
        expect(mockEpubInstance.addArticle).toHaveBeenCalledWith(
            'Selected Chat', expect.stringContaining('<h2>Selected Chat</h2>'), 'Claude Conversation', 'Tech Chat'
        );
        const selectedChatContentCall = mockEpubInstance.addArticle.mock.calls.find(call => call[0] === 'Selected Chat');
        expect(selectedChatContentCall[1]).toContain('<strong>You</strong>');
        expect(selectedChatContentCall[1]).toContain('Hello');

        expect(mockEpubInstance.addArticle).not.toHaveBeenCalledWith(
            'Unselected Chat', expect.any(String), expect.any(String), expect.any(String)
        );

        expect(articleGenerator.generateInterestArticle).toHaveBeenCalled();
        expect(articleGenerator.generateChatHighlightsArticle).toHaveBeenCalled();
        expect(mockEpubInstance.generateEPUB).toHaveBeenCalledWith(expect.stringMatching(/out\/magazine-\d{4}-\d{2}\.epub/));
    });

    test('should handle case with no selected Claude chats', async () => {
        // Override mockFsUtils.readFileSync for this specific test's content
        mockFsUtils.readFileSync.mockImplementation((path) => {
            if (path === mockContentFile) {
                return JSON.stringify({
                    metadata: { title: "Test Mag No Chats", author: "Tester" },
                    articles: [], interests: [], chatHighlights: [],
                    claudeChats: [
                        { id: 'chat1', title: 'Unselected Chat 1', conversation: [], selected: false },
                        { id: 'chat2', title: 'Unselected Chat 2', conversation: [], selected: false }
                    ]
                });
            }
            return '';
        });
        // Re-initialize ContentManager and dependent ArticleGenerator due to changed file content
        // Crucially, pass the mockFsUtils that has the overridden readFileSync
        contentManager = new ContentManager(mockContentFile, mockFsUtils);
        articleGenerator = new ArticleGenerator(contentManager);
        jest.spyOn(articleGenerator, 'generateInterestArticle').mockImplementation(() => {});
        jest.spyOn(articleGenerator, 'generateChatHighlightsArticle').mockImplementation(() => {});

        // The mockEpubFactory and mockEpubInstance from the main beforeEach are still fine to use here,
        // as their state is cleared by jest.clearAllMocks() and they are fresh for each test.
        // We just need a new MagazineGenerator that uses the updated contentManager.
        magazineGenerator = new MagazineGenerator(contentManager, articleGenerator, mockEpubFactory);

        await magazineGenerator.generateMagazine();

        expect(mockEpubFactory).toHaveBeenCalledTimes(1); // Factory called by this new instance
        expect(mockEpubInstance.initializeEPUB).toHaveBeenCalledWith("Test Mag No Chats", "Tester", undefined);

        const chatArticleCalls = mockEpubInstance.addArticle.mock.calls.filter(
            call => call[2] === 'Claude Conversation'
        );
        expect(chatArticleCalls.length).toBe(0);
        expect(mockEpubInstance.generateEPUB).toHaveBeenCalled();
    });
});
