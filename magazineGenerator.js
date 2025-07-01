import EPUBMagazineGenerator from './epub_generator.js';

export class MagazineGenerator {
    constructor(contentManager, articleGenerator) {
        this.contentManager = contentManager;
        this.articleGenerator = articleGenerator;
    }

    generateMagazine() {
        console.log('Generating magazine...');

        // Auto-generate articles from collected content
        this.articleGenerator.generateInterestArticle();
        this.articleGenerator.generateChatHighlightsArticle();

        const generator = new EPUBMagazineGenerator();

        // Initialize with metadata
        generator.initializeEPUB(
            this.contentManager.content.metadata.title,
            this.contentManager.content.metadata.author,
            this.contentManager.content.metadata.description
        );

        // Add all articles
        this.contentManager.content.articles.forEach(article => {
            generator.addArticle(
                article.title,
                article.content,
                article.author,
                article.category
            );
        });

        // Generate the EPUB file
        const date = new Date();
        const outputPath = `./out/magazine-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}.epub`;

        return generator.generateEPUB(outputPath);
    }
}
