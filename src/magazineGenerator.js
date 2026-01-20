import DefaultEPUBMagazineGenerator from './epub_generator.js';
import { ContentClusterer } from './contentClusterer.js';
import { config } from './config.js';
import fs from 'fs';

export class MagazineGenerator {
    constructor(contentManager, articleGenerator, epubGeneratorFactory, contentClusterer) {
        this.contentManager = contentManager;
        this.articleGenerator = articleGenerator;
        this.epubGeneratorFactory = epubGeneratorFactory || (() => new DefaultEPUBMagazineGenerator());
        this.contentClusterer = contentClusterer || new ContentClusterer();
    }

    generateMagazine(options = {}) {
        console.log('Generating magazine...');

        const {
            enableClustering = this.contentManager.content.metadata?.enableClustering ?? 
                             config.content.enableClustering,
            minSimilarity = this.contentManager.content.metadata?.clusteringSimilarity ?? 
                           config.content.clusteringSimilarity
        } = options;

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

        // Prepare all content items (articles + selected Claude chats)
        const allContentItems = [];

        // Add all articles
        this.contentManager.content.articles.forEach(article => {
            allContentItems.push({
                ...article,
                type: 'article'
            });
        });

        // Add selected Claude chats
        this.contentManager.content.claudeChats.forEach(chat => {
            if (chat.selected) {
                let chatContent = '';
                chat.conversation.forEach(message => {
                    const messageDate = message.timestamp ? new Date(message.timestamp).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A';
                    chatContent += `
                        <div class="claude-message">
                            <strong>${message.sender === 'human' ? 'You' : 'Claude'}</strong> (${messageDate}):<br/>
                            ${message.text.replace(/\n/g, '<br/>')}
                        </div>
                    `;
                });
                
                allContentItems.push({
                    title: chat.title,
                    content: chatContent,
                    author: 'Claude Conversation',
                    category: chat.category || 'Claude Chats',
                    type: 'chat'
                });
            }
        });

        // Apply clustering if enabled
        if (enableClustering && allContentItems.length > 0) {
            console.log(`Clustering ${allContentItems.length} items by topic...`);
            const sections = this.contentClusterer.generateClusteredContent(
                allContentItems,
                { minSimilarity, enableClustering: true }
            );

            // Add content to EPUB organized by sections
            sections.forEach(section => {
                console.log(`  Section: "${section.sectionName}" (${section.articles.length} items)`);
                
                // Add a section marker/divider if EPUB generator supports it
                // For now, we'll add articles with their section category
                section.articles.forEach(item => {
                    generator.addArticle(
                        item.title,
                        item.content,
                        item.author,
                        section.sectionName // Use section name as category
                    );
                });
            });
        } else {
            // Add content without clustering (original behavior)
            allContentItems.forEach(item => {
                generator.addArticle(
                    item.title,
                    item.content,
                    item.author,
                    item.category
                );
            });
        }

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
