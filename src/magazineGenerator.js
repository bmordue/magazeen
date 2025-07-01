import DefaultEPUBMagazineGenerator from './epub_generator.js';

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
                    const messageDate = message.timestamp ? new Date(message.timestamp).toLocaleString() : 'N/A';
                    chatContent += `
                        <div style="margin-bottom: 10px;">
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
        const outputPath = `./out/magazine-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}.epub`;

        return generator.generateEPUB(outputPath);
    }
}
