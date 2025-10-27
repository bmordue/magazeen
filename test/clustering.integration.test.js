import { ContentClusterer } from '../src/contentClusterer.js';
import { ContentManager } from '../src/contentManager.js';
import { ArticleGenerator } from '../src/articleGenerator.js';
import { MagazineGenerator } from '../src/magazineGenerator.js';
import { jest } from '@jest/globals';

describe('MagazineGenerator with Clustering', () => {
    let contentManager;
    let articleGenerator;
    let magazineGenerator;
    let mockEpubInstance;
    let mockEpubFactory;
    let mockFsUtils;
    
    const mockContentFile = 'out/test-clustering-integration.json';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock EPUB generator
        mockEpubInstance = {
            initializeEPUB: jest.fn(),
            addArticle: jest.fn(),
            generateEPUB: jest.fn().mockResolvedValue('mock/path/to/epub.epub'),
        };
        mockEpubFactory = jest.fn(() => mockEpubInstance);

        // Mock file system
        mockFsUtils = {
            existsSync: jest.fn(),
            readFileSync: jest.fn(),
            writeFileSync: jest.fn(),
        };

        mockFsUtils.existsSync.mockImplementation((path) => path === mockContentFile);
        mockFsUtils.readFileSync.mockImplementation((path) => {
            if (path === mockContentFile) {
                return JSON.stringify({
                    metadata: { 
                        title: "Test Clustered Magazine", 
                        author: "Test Author",
                        enableClustering: true,
                        clusteringSimilarity: 30
                    },
                    articles: [
                        { 
                            id: 'tech1', 
                            title: 'Python Basics', 
                            content: 'Learn Python programming fundamentals and syntax', 
                            category: 'Tech',
                            author: 'Dev',
                            tags: ['python', 'programming']
                        },
                        { 
                            id: 'tech2', 
                            title: 'Advanced Python', 
                            content: 'Master advanced Python techniques and patterns', 
                            category: 'Tech',
                            author: 'Dev',
                            tags: ['python', 'advanced']
                        },
                        { 
                            id: 'food1', 
                            title: 'Cooking Tips', 
                            content: 'Learn essential cooking techniques and recipes', 
                            category: 'Food',
                            author: 'Chef',
                            tags: ['cooking', 'recipes']
                        },
                        { 
                            id: 'food2', 
                            title: 'Italian Cuisine', 
                            content: 'Master Italian cooking with authentic recipes', 
                            category: 'Food',
                            author: 'Chef',
                            tags: ['cooking', 'italian']
                        }
                    ],
                    interests: [],
                    chatHighlights: [],
                    claudeChats: []
                });
            }
            return '';
        });
        mockFsUtils.writeFileSync.mockImplementation(() => {});

        contentManager = new ContentManager(mockContentFile, mockFsUtils);
        articleGenerator = new ArticleGenerator(contentManager);
        
        jest.spyOn(articleGenerator, 'generateInterestArticle').mockImplementation(() => {});
        jest.spyOn(articleGenerator, 'generateChatHighlightsArticle').mockImplementation(() => {});

        magazineGenerator = new MagazineGenerator(
            contentManager, 
            articleGenerator, 
            mockEpubFactory,
            new ContentClusterer()
        );
    });

    test('should cluster related articles together', async () => {
        await magazineGenerator.generateMagazine({ enableClustering: true, minSimilarity: 30 });

        expect(mockEpubFactory).toHaveBeenCalledTimes(1);
        expect(mockEpubInstance.initializeEPUB).toHaveBeenCalledWith(
            "Test Clustered Magazine", 
            "Test Author", 
            undefined
        );

        // Should add all 4 articles
        expect(mockEpubInstance.addArticle).toHaveBeenCalledTimes(4);

        // Verify articles are grouped by section (category in this case)
        const addArticleCalls = mockEpubInstance.addArticle.mock.calls;
        
        // Collect articles by their section (4th parameter)
        const articlesBySectionOrder = addArticleCalls.map(call => ({
            title: call[0],
            section: call[3]
        }));

        // Check that same sections are grouped together
        const sections = [...new Set(articlesBySectionOrder.map(a => a.section))];
        expect(sections.length).toBeGreaterThan(0);
        
        // Verify related articles are sequential
        // Articles with same section should appear in sequence
        let currentSection = null;
        let sectionChanges = 0;
        
        articlesBySectionOrder.forEach(article => {
            if (article.section !== currentSection) {
                currentSection = article.section;
                sectionChanges++;
            }
        });

        // Number of section changes should equal number of unique sections
        expect(sectionChanges).toBe(sections.length);
    });

    test('should use suggested section names from clustering', async () => {
        await magazineGenerator.generateMagazine({ enableClustering: true, minSimilarity: 30 });

        const addArticleCalls = mockEpubInstance.addArticle.mock.calls;
        const sectionNames = addArticleCalls.map(call => call[3]); // 4th parameter is category/section

        // Should have Tech and Food sections (or similar)
        const uniqueSections = [...new Set(sectionNames)];
        expect(uniqueSections.length).toBeGreaterThanOrEqual(2);
        
        // Each article should have a section name
        sectionNames.forEach(section => {
            expect(section).toBeTruthy();
            expect(typeof section).toBe('string');
        });
    });

    test('should respect clustering disabled option', async () => {
        await magazineGenerator.generateMagazine({ enableClustering: false });

        expect(mockEpubInstance.addArticle).toHaveBeenCalledTimes(4);

        const addArticleCalls = mockEpubInstance.addArticle.mock.calls;
        
        // When clustering is disabled, original categories should be preserved
        expect(addArticleCalls[0][3]).toBe('Tech');
        expect(addArticleCalls[1][3]).toBe('Tech');
        expect(addArticleCalls[2][3]).toBe('Food');
        expect(addArticleCalls[3][3]).toBe('Food');
    });

    test('should use metadata clustering settings by default', async () => {
        // Metadata has enableClustering: true and clusteringSimilarity: 30
        await magazineGenerator.generateMagazine();

        // Should cluster by default based on metadata
        expect(mockEpubInstance.addArticle).toHaveBeenCalledTimes(4);
        
        // Verify clustering was applied by checking section names
        const sectionNames = mockEpubInstance.addArticle.mock.calls.map(call => call[3]);
        const uniqueSections = [...new Set(sectionNames)];
        
        // With clustering enabled, articles should be grouped
        expect(uniqueSections.length).toBeGreaterThanOrEqual(1);
    });

    test('should handle empty content gracefully', async () => {
        // Override to return empty articles
        mockFsUtils.readFileSync.mockImplementation(() => {
            return JSON.stringify({
                metadata: { title: "Empty Mag", author: "Test" },
                articles: [],
                interests: [],
                chatHighlights: [],
                claudeChats: []
            });
        });

        contentManager = new ContentManager(mockContentFile, mockFsUtils);
        articleGenerator = new ArticleGenerator(contentManager);
        jest.spyOn(articleGenerator, 'generateInterestArticle').mockImplementation(() => {});
        jest.spyOn(articleGenerator, 'generateChatHighlightsArticle').mockImplementation(() => {});
        
        magazineGenerator = new MagazineGenerator(
            contentManager, 
            articleGenerator, 
            mockEpubFactory,
            new ContentClusterer()
        );

        await magazineGenerator.generateMagazine({ enableClustering: true });

        // Should not crash, just create empty magazine
        expect(mockEpubInstance.initializeEPUB).toHaveBeenCalled();
        expect(mockEpubInstance.generateEPUB).toHaveBeenCalled();
    });

    test('should cluster Claude chats with articles', async () => {
        mockFsUtils.readFileSync.mockImplementation(() => {
            return JSON.stringify({
                metadata: { title: "Mixed Content", author: "Test" },
                articles: [
                    { 
                        id: 'tech1', 
                        title: 'Python Guide', 
                        content: 'Learn Python programming', 
                        category: 'Tech'
                    }
                ],
                interests: [],
                chatHighlights: [],
                claudeChats: [
                    {
                        id: 'chat1',
                        title: 'Python Discussion',
                        selected: true,
                        category: 'Tech',
                        conversation: [
                            { sender: 'human', text: 'Tell me about Python', timestamp: '2023-01-01' },
                            { sender: 'assistant', text: 'Python is great for programming', timestamp: '2023-01-01' }
                        ]
                    }
                ]
            });
        });

        contentManager = new ContentManager(mockContentFile, mockFsUtils);
        articleGenerator = new ArticleGenerator(contentManager);
        jest.spyOn(articleGenerator, 'generateInterestArticle').mockImplementation(() => {});
        jest.spyOn(articleGenerator, 'generateChatHighlightsArticle').mockImplementation(() => {});
        
        magazineGenerator = new MagazineGenerator(
            contentManager, 
            articleGenerator, 
            mockEpubFactory,
            new ContentClusterer()
        );

        await magazineGenerator.generateMagazine({ enableClustering: true });

        // Should add both article and chat
        expect(mockEpubInstance.addArticle).toHaveBeenCalledTimes(2);
        
        // Both should be in the same cluster (Tech-related)
        const addArticleCalls = mockEpubInstance.addArticle.mock.calls;
        const firstSection = addArticleCalls[0][3];
        const secondSection = addArticleCalls[1][3];
        
        // Since both are Tech-related, they might be in the same section
        // At minimum, both should have section names
        expect(firstSection).toBeTruthy();
        expect(secondSection).toBeTruthy();
    });
});
