import { Logger } from './logger.js';

/**
 * ContentClusterer - Groups articles and content by topic similarity
 * Orders content so related items appear sequentially
 * Suggests section names for each cluster
 */
export class ContentClusterer {
    constructor() {
        this.logger = Logger.child({ component: 'ContentClusterer' });
    }

    /**
     * Extract keywords from text content
     * Removes HTML tags, common stop words, and extracts meaningful terms
     */
    extractKeywords(text) {
        if (!text) return [];

        // Remove HTML tags
        const cleanText = text.replace(/<[^>]*>/g, ' ');

        // Common stop words to ignore
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has',
            'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may',
            'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
            'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where',
            'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
            'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
            'so', 'than', 'too', 'very', 'just', 'as', 'about', 'from', 'into',
            'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
            'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once'
        ]);

        // Extract words, convert to lowercase, filter stop words and short words
        const words = cleanText
            .toLowerCase()
            .split(/\s+/)
            .map(word => word.replace(/[^a-z0-9]/g, ''))
            .filter(word => word.length > 3 && !stopWords.has(word));

        // Count word frequency
        const wordFreq = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        // Return words sorted by frequency, top 20
        return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word]) => word);
    }

    /**
     * Calculate similarity score between two articles
     * Based on keyword overlap and category match
     */
    calculateSimilarity(article1, article2) {
        if (!article1 || !article2) return 0;

        let score = 0;

        // Extract keywords from both articles
        const keywords1 = new Set(this.extractKeywords(
            (article1.title || '') + ' ' + (article1.content || '')
        ));
        const keywords2 = new Set(this.extractKeywords(
            (article2.title || '') + ' ' + (article2.content || '')
        ));

        // Calculate keyword overlap (Jaccard similarity)
        const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
        const union = new Set([...keywords1, ...keywords2]);
        
        if (union.size > 0) {
            score += (intersection.size / union.size) * 70; // 70% weight for keyword similarity
        }

        // Category match bonus
        if (article1.category && article2.category && 
            article1.category === article2.category) {
            score += 30; // 30% weight for category match
        }

        // Tag overlap bonus (if tags exist)
        if (article1.tags && article2.tags && 
            Array.isArray(article1.tags) && Array.isArray(article2.tags)) {
            const tags1 = new Set(article1.tags);
            const tags2 = new Set(article2.tags);
            const tagIntersection = new Set([...tags1].filter(t => tags2.has(t)));
            
            if (tagIntersection.size > 0) {
                score += tagIntersection.size * 5; // Bonus points per matching tag
            }
        }

        return Math.min(score, 100); // Cap at 100
    }

    /**
     * Generate a suggested section name for a cluster
     * Based on common keywords and categories
     */
    generateSectionName(cluster) {
        if (!cluster || cluster.length === 0) return 'Miscellaneous';

        // Collect all categories
        const categories = cluster
            .map(item => item.category)
            .filter(cat => cat && cat !== 'General');

        // If all articles share the same non-General category, use it
        if (categories.length > 0) {
            const categoryCount = {};
            categories.forEach(cat => {
                categoryCount[cat] = (categoryCount[cat] || 0) + 1;
            });
            
            const mostCommonCategory = Object.entries(categoryCount)
                .sort((a, b) => b[1] - a[1])[0];
            
            // If majority share a category, use it
            if (mostCommonCategory[1] >= cluster.length * 0.6) {
                return mostCommonCategory[0];
            }
        }

        // Extract common keywords from all articles in cluster
        const allKeywords = [];
        cluster.forEach(item => {
            const keywords = this.extractKeywords(
                (item.title || '') + ' ' + (item.content || '')
            );
            allKeywords.push(...keywords);
        });

        // Find most common keywords
        const keywordFreq = {};
        allKeywords.forEach(keyword => {
            keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 1;
        });

        const topKeywords = Object.entries(keywordFreq)
            .filter(([, count]) => count >= cluster.length * 0.4) // Appear in at least 40% of articles
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([word]) => word);

        if (topKeywords.length > 0) {
            // Capitalize first letter of each word
            return topKeywords
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' & ');
        }

        return 'General Interest';
    }

    /**
     * Cluster articles by topic similarity
     * Uses a greedy clustering approach
     */
    clusterArticles(articles, minSimilarity = 30) {
        if (!articles || articles.length === 0) return [];

        this.logger.debug('Clustering articles', { 
            count: articles.length, 
            minSimilarity 
        });

        const clusters = [];
        const assigned = new Set();

        // Sort articles by category first for better initial clustering
        const sortedArticles = [...articles].sort((a, b) => {
            const catA = a.category || 'ZZZ';
            const catB = b.category || 'ZZZ';
            return catA.localeCompare(catB);
        });

        sortedArticles.forEach((article, index) => {
            if (assigned.has(index)) return;

            // Start a new cluster with this article
            const cluster = [article];
            assigned.add(index);

            // Find similar articles to add to this cluster
            sortedArticles.forEach((candidate, candidateIndex) => {
                if (assigned.has(candidateIndex)) return;

                // Calculate average similarity to all articles in current cluster
                const similarities = cluster.map(clusterArticle => 
                    this.calculateSimilarity(clusterArticle, candidate)
                );
                const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

                // Add to cluster if similarity is above threshold
                if (avgSimilarity >= minSimilarity) {
                    cluster.push(candidate);
                    assigned.add(candidateIndex);
                }
            });

            clusters.push(cluster);
        });

        this.logger.info('Articles clustered', { 
            totalArticles: articles.length,
            clusterCount: clusters.length,
            averageClusterSize: (articles.length / clusters.length).toFixed(1)
        });

        return clusters;
    }

    /**
     * Generate clustered content with section names
     * Returns an ordered array of sections with articles
     */
    generateClusteredContent(articles, options = {}) {
        const {
            minSimilarity = 30,
            enableClustering = true
        } = options;

        if (!enableClustering || !articles || articles.length === 0) {
            this.logger.debug('Clustering disabled or no articles');
            return [{
                sectionName: 'Articles',
                articles: articles || []
            }];
        }

        const clusters = this.clusterArticles(articles, minSimilarity);
        
        // Generate section names and create final structure
        const sections = clusters.map(cluster => ({
            sectionName: this.generateSectionName(cluster),
            articles: cluster
        }));

        // Sort sections by size (largest first) for better reading experience
        sections.sort((a, b) => b.articles.length - a.articles.length);

        this.logger.info('Generated clustered content', {
            sectionCount: sections.length,
            sections: sections.map(s => ({ 
                name: s.sectionName, 
                articleCount: s.articles.length 
            }))
        });

        return sections;
    }
}
