import { ContentClusterer } from '../src/contentClusterer.js';
import { describe, test, expect, beforeEach } from '@jest/globals';

describe('ContentClusterer', () => {
    let clusterer;

    beforeEach(() => {
        clusterer = new ContentClusterer();
    });

    describe('extractKeywords', () => {
        test('should extract keywords from plain text', () => {
            const text = 'This is a test about machine learning and artificial intelligence';
            const keywords = clusterer.extractKeywords(text);
            
            expect(keywords).toContain('machine');
            expect(keywords).toContain('learning');
            expect(keywords).toContain('artificial');
            expect(keywords).toContain('intelligence');
        });

        test('should remove HTML tags', () => {
            const text = '<p>This is a test about <strong>programming</strong> and <em>software</em></p>';
            const keywords = clusterer.extractKeywords(text);
            
            expect(keywords).toContain('programming');
            expect(keywords).toContain('software');
            expect(keywords).toContain('test');
        });

        test('should filter out stop words', () => {
            const text = 'The quick brown fox jumps over the lazy dog';
            const keywords = clusterer.extractKeywords(text);
            
            // Stop words should not be included
            expect(keywords).not.toContain('the');
            expect(keywords).not.toContain('over');
            
            // Meaningful words should be included
            expect(keywords).toContain('quick');
            expect(keywords).toContain('brown');
            expect(keywords).toContain('jumps');
        });

        test('should filter out short words', () => {
            const text = 'AI ML NLP are big data science terms';
            const keywords = clusterer.extractKeywords(text);
            
            // 3-letter or shorter words should be filtered out
            expect(keywords).not.toContain('ai');
            expect(keywords).not.toContain('ml');
            expect(keywords).not.toContain('nlp');
            expect(keywords).not.toContain('are');
            expect(keywords).not.toContain('big');
        });

        test('should return empty array for empty text', () => {
            expect(clusterer.extractKeywords('')).toEqual([]);
            expect(clusterer.extractKeywords(null)).toEqual([]);
            expect(clusterer.extractKeywords(undefined)).toEqual([]);
        });

        test('should prioritize frequent words', () => {
            const text = 'Python programming is great. Python is powerful. Python developers love Python programming.';
            const keywords = clusterer.extractKeywords(text);
            
            // "python" appears most frequently, should be first
            expect(keywords[0]).toBe('python');
            expect(keywords).toContain('programming');
        });

        test('should limit to top 20 keywords', () => {
            const text = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 ' +
                        'word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 ' +
                        'word21 word22 word23 word24 word25';
            const keywords = clusterer.extractKeywords(text);
            
            expect(keywords.length).toBeLessThanOrEqual(20);
        });
    });

    describe('calculateSimilarity', () => {
        test('should calculate high similarity for articles with overlapping keywords', () => {
            const article1 = {
                title: 'Machine Learning Basics',
                content: 'Introduction to machine learning algorithms and neural networks',
                category: 'Technology'
            };
            const article2 = {
                title: 'Deep Learning Tutorial',
                content: 'Advanced machine learning with neural networks and deep learning',
                category: 'Technology'
            };

            const similarity = clusterer.calculateSimilarity(article1, article2);
            
            // Should have high similarity due to keyword overlap and category match
            expect(similarity).toBeGreaterThan(50);
        });

        test('should calculate low similarity for unrelated articles', () => {
            const article1 = {
                title: 'Cooking Pasta',
                content: 'How to cook perfect pasta with tomato sauce',
                category: 'Food'
            };
            const article2 = {
                title: 'JavaScript Programming',
                content: 'Introduction to JavaScript programming and web development',
                category: 'Technology'
            };

            const similarity = clusterer.calculateSimilarity(article1, article2);
            
            // Should have low similarity
            expect(similarity).toBeLessThan(30);
        });

        test('should add bonus for category match', () => {
            const article1 = {
                title: 'Article One',
                content: 'Different content here',
                category: 'Science'
            };
            const article2 = {
                title: 'Article Two',
                content: 'Completely different topic',
                category: 'Science'
            };

            const similarity = clusterer.calculateSimilarity(article1, article2);
            
            // Should have at least 30 points from category match
            expect(similarity).toBeGreaterThanOrEqual(30);
        });

        test('should add bonus for tag overlap', () => {
            const article1 = {
                title: 'Article One',
                content: 'Some content',
                category: 'General',
                tags: ['javascript', 'programming', 'web']
            };
            const article2 = {
                title: 'Article Two',
                content: 'Other content',
                category: 'General',
                tags: ['javascript', 'web', 'frontend']
            };

            const similarity = clusterer.calculateSimilarity(article1, article2);
            
            // Should get bonus points for 2 matching tags
            expect(similarity).toBeGreaterThan(0);
        });

        test('should handle null or undefined articles', () => {
            const article = {
                title: 'Test',
                content: 'Test content',
                category: 'Test'
            };

            expect(clusterer.calculateSimilarity(null, article)).toBe(0);
            expect(clusterer.calculateSimilarity(article, null)).toBe(0);
            expect(clusterer.calculateSimilarity(null, null)).toBe(0);
        });

        test('should cap similarity at 100', () => {
            const article1 = {
                title: 'Identical Article',
                content: 'Same content',
                category: 'Same',
                tags: ['tag1', 'tag2', 'tag3']
            };

            const similarity = clusterer.calculateSimilarity(article1, article1);
            
            expect(similarity).toBeLessThanOrEqual(100);
        });
    });

    describe('generateSectionName', () => {
        test('should use category when articles share same category', () => {
            const cluster = [
                { title: 'Article 1', content: 'Content 1', category: 'Technology' },
                { title: 'Article 2', content: 'Content 2', category: 'Technology' },
                { title: 'Article 3', content: 'Content 3', category: 'Technology' }
            ];

            const sectionName = clusterer.generateSectionName(cluster);
            
            expect(sectionName).toBe('Technology');
        });

        test('should use common keywords when categories differ', () => {
            const cluster = [
                { 
                    title: 'Python Programming', 
                    content: 'Python is a great programming language for data science',
                    category: 'Tech' 
                },
                { 
                    title: 'Python Data Analysis', 
                    content: 'Using Python for data analysis and visualization',
                    category: 'Science' 
                },
                { 
                    title: 'Learn Python', 
                    content: 'Python tutorial for beginners in programming',
                    category: 'Education' 
                }
            ];

            const sectionName = clusterer.generateSectionName(cluster);
            
            // Should use common keyword "python" or "programming"
            expect(sectionName.toLowerCase()).toMatch(/python|programming|data/);
        });

        test('should return "Miscellaneous" for empty cluster', () => {
            const sectionName = clusterer.generateSectionName([]);
            
            expect(sectionName).toBe('Miscellaneous');
        });

        test('should return "General Interest" when no common themes found', () => {
            const cluster = [
                { title: 'AB CD', content: 'wx yz', category: 'General' },
                { title: 'EF GH', content: 'ij kl', category: 'General' }
            ];

            const sectionName = clusterer.generateSectionName(cluster);
            
            expect(sectionName).toBe('General Interest');
        });

        test('should capitalize keywords properly', () => {
            const cluster = [
                { 
                    title: 'Article about python', 
                    content: 'python programming python development python',
                    category: 'General' 
                },
                { 
                    title: 'More python', 
                    content: 'python scripts and python tools',
                    category: 'General' 
                }
            ];

            const sectionName = clusterer.generateSectionName(cluster);
            
            // Should capitalize first letter
            expect(sectionName.charAt(0)).toBe(sectionName.charAt(0).toUpperCase());
        });
    });

    describe('clusterArticles', () => {
        test('should group similar articles together', () => {
            const articles = [
                { 
                    id: '1',
                    title: 'Python Tutorial', 
                    content: 'Learn Python programming basics',
                    category: 'Programming' 
                },
                { 
                    id: '2',
                    title: 'JavaScript Guide', 
                    content: 'JavaScript web development fundamentals',
                    category: 'Programming' 
                },
                { 
                    id: '3',
                    title: 'Advanced Python', 
                    content: 'Advanced Python programming techniques',
                    category: 'Programming' 
                },
                { 
                    id: '4',
                    title: 'Cooking Recipes', 
                    content: 'Delicious cooking recipes and techniques',
                    category: 'Food' 
                }
            ];

            const clusters = clusterer.clusterArticles(articles, 30);
            
            // Should create at least 2 clusters (programming and food)
            expect(clusters.length).toBeGreaterThanOrEqual(2);
            
            // All articles should be assigned
            const totalArticles = clusters.reduce((sum, cluster) => sum + cluster.length, 0);
            expect(totalArticles).toBe(articles.length);
        });

        test('should handle empty article array', () => {
            const clusters = clusterer.clusterArticles([]);
            
            expect(clusters).toEqual([]);
        });

        test('should create single cluster for single article', () => {
            const articles = [
                { title: 'Solo Article', content: 'Content', category: 'General' }
            ];

            const clusters = clusterer.clusterArticles(articles);
            
            expect(clusters.length).toBe(1);
            expect(clusters[0].length).toBe(1);
        });

        test('should respect minSimilarity threshold', () => {
            const articles = [
                { title: 'Python', content: 'Python programming', category: 'Tech' },
                { title: 'JavaScript', content: 'JavaScript programming', category: 'Tech' },
                { title: 'Cooking', content: 'Cooking recipes', category: 'Food' }
            ];

            // High threshold should create more clusters
            const clustersHigh = clusterer.clusterArticles(articles, 80);
            
            // Low threshold should create fewer clusters
            const clustersLow = clusterer.clusterArticles(articles, 10);
            
            expect(clustersHigh.length).toBeGreaterThanOrEqual(clustersLow.length);
        });

        test('should not lose any articles during clustering', () => {
            const articles = [
                { title: 'A1', content: 'Content 1', category: 'Cat1' },
                { title: 'A2', content: 'Content 2', category: 'Cat2' },
                { title: 'A3', content: 'Content 3', category: 'Cat3' },
                { title: 'A4', content: 'Content 4', category: 'Cat4' },
                { title: 'A5', content: 'Content 5', category: 'Cat5' }
            ];

            const clusters = clusterer.clusterArticles(articles);
            const totalArticles = clusters.reduce((sum, cluster) => sum + cluster.length, 0);
            
            expect(totalArticles).toBe(articles.length);
        });
    });

    describe('generateClusteredContent', () => {
        test('should generate sections with names and articles', () => {
            const articles = [
                { 
                    title: 'Python Basics', 
                    content: 'Introduction to Python programming',
                    category: 'Programming' 
                },
                { 
                    title: 'Python Advanced', 
                    content: 'Advanced Python techniques',
                    category: 'Programming' 
                },
                { 
                    title: 'Cooking Guide', 
                    content: 'How to cook pasta',
                    category: 'Food' 
                }
            ];

            const sections = clusterer.generateClusteredContent(articles);
            
            expect(sections).toBeDefined();
            expect(Array.isArray(sections)).toBe(true);
            expect(sections.length).toBeGreaterThan(0);
            
            sections.forEach(section => {
                expect(section).toHaveProperty('sectionName');
                expect(section).toHaveProperty('articles');
                expect(Array.isArray(section.articles)).toBe(true);
            });
        });

        test('should handle empty articles array', () => {
            const sections = clusterer.generateClusteredContent([]);
            
            expect(sections).toEqual([{
                sectionName: 'Articles',
                articles: []
            }]);
        });

        test('should handle disabled clustering', () => {
            const articles = [
                { title: 'A1', content: 'Content 1', category: 'Cat1' },
                { title: 'A2', content: 'Content 2', category: 'Cat2' }
            ];

            const sections = clusterer.generateClusteredContent(articles, { 
                enableClustering: false 
            });
            
            expect(sections.length).toBe(1);
            expect(sections[0].sectionName).toBe('Articles');
            expect(sections[0].articles.length).toBe(2);
        });

        test('should sort sections by size (largest first)', () => {
            const articles = [
                { title: 'Tech 1', content: 'Technology content', category: 'Technology' },
                { title: 'Tech 2', content: 'Technology content', category: 'Technology' },
                { title: 'Tech 3', content: 'Technology content', category: 'Technology' },
                { title: 'Food 1', content: 'Food content', category: 'Food' }
            ];

            const sections = clusterer.generateClusteredContent(articles);
            
            // First section should have more articles than subsequent ones
            for (let i = 0; i < sections.length - 1; i++) {
                expect(sections[i].articles.length).toBeGreaterThanOrEqual(
                    sections[i + 1].articles.length
                );
            }
        });

        test('should respect custom minSimilarity option', () => {
            const articles = [
                { title: 'A1', content: 'Content 1', category: 'Cat1' },
                { title: 'A2', content: 'Content 2', category: 'Cat2' },
                { title: 'A3', content: 'Content 3', category: 'Cat3' }
            ];

            const sectionsHigh = clusterer.generateClusteredContent(articles, { 
                minSimilarity: 90 
            });
            const sectionsLow = clusterer.generateClusteredContent(articles, { 
                minSimilarity: 10 
            });
            
            // Higher threshold should create more sections (less grouping)
            expect(sectionsHigh.length).toBeGreaterThanOrEqual(sectionsLow.length);
        });
    });
});
