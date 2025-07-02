import DefaultEPUBMagazineGenerator from './epub_generator.js';
import fs from 'fs';

export class MagazineGenerator {
    constructor(contentManager, articleGenerator, epubGeneratorFactory) {
        this.contentManager = contentManager;
        this.articleGenerator = articleGenerator;
        this.epubGeneratorFactory = epubGeneratorFactory || (() => new DefaultEPUBMagazineGenerator());
    }

    generateMagazine() {
        console.log('Generating magazine...');

        // Auto-generate articles from collected content
        this.articleGenerator.generateInterestArticle();
        this.articleGenerator.generateChatHighlightsArticle();

        const generator = this.epubGeneratorFactory();

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

        // Add selected Claude chats
        this.contentManager.content.claudeChats.forEach(chat => {
            if (chat.selected) {
                let chatContent = `<h2>${chat.title}</h2>`;
                chat.conversation.forEach(message => {
                    const messageDate = message.timestamp ? new Date(message.timestamp).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A';
                    chatContent += `
                        <div class="claude-message">
                            <strong>${message.sender === 'human' ? 'You' : 'Claude'}</strong> (${messageDate}):<br/>
                            ${message.text.replace(/\n/g, '<br/>')}
                        </div>
                    `;
                });
                generator.addArticle(
                    chat.title,
                    chatContent,
                    'Claude Conversation', // Author/Source
                    chat.category || 'Claude Chats' // Category
                );
            }
        });

        // Generate the EPUB file
        const date = new Date();
        // Use /tmp directory for output in serverless environments
        const outputDir = '/tmp/out';
        // fs.mkdirSync is needed if epub_generator doesn't create parent directories.
        // However, epub_generator.js uses jszip and fs.writeFileSync, which won't create parent dirs.
        // We need to ensure outputDir exists.
        // Node.js `fs.promises.mkdir` can be used with { recursive: true }.
        // Let's import fs/promises at the top of the file.
        const outputPath = `${outputDir}/magazine-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}.epub`;

        // Ensure the output directory exists
        // Adding this directly here for simplicity.
        // Consider moving to a utility or ensuring epub_generator handles it.
        // const fs = require('fs'); // Using require for synchronous check or use promises
        // Changed to import fs from 'fs' at the top of the file
        if (!fs.existsSync(outputDir)){ // fs will be from the import
            fs.mkdirSync(outputDir, { recursive: true });
        }

        return generator.generateEPUB(outputPath);
    }
}
