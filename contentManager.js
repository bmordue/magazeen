import { existsSync, readFileSync, writeFileSync } from 'fs';

export class ContentManager {
    constructor(contentFile = 'out/magazine-content.json') {
        this.contentFile = contentFile;
        this.loadContent();
    }

    loadContent() {
        try {
            if (existsSync(this.contentFile)) {
                this.content = JSON.parse(readFileSync(this.contentFile, 'utf8'));
            } else {
                this.content = {
                    metadata: {
                        title: "My Personal Magazine",
                        author: "Your Name",
                        description: "A monthly compilation of my interests, discoveries, and insights."
                    },
                    articles: [],
                    interests: [],
                    chatHighlights: []
                };
            }
        } catch (error) {
            console.error('Error loading content:', error);
            this.content = { metadata: {}, articles: [], interests: [], chatHighlights: [] };
        }
    }

    saveContent() {
        try {
            writeFileSync(this.contentFile, JSON.stringify(this.content, null, 2));
            console.log('Content saved successfully!');
        } catch (error) {
            console.error('Error saving content:', error);
        }
    }

    addArticle(title, content, category = "General", author = null, tags = []) {
        const article = {
            id: Date.now().toString(),
            title,
            content,
            category,
            author,
            tags,
            dateAdded: new Date().toISOString(),
            wordCount: this.countWords(content)
        };

        this.content.articles.push(article);
        this.saveContent();
        console.log(`Added article: "${title}" (${article.wordCount} words)`);
        return article.id;
    }

    addInterest(topic, description, priority = "medium") {
        const interest = {
            id: Date.now().toString(),
            topic,
            description,
            priority,
            dateAdded: new Date().toISOString()
        };

        this.content.interests.push(interest);
        this.saveContent();
        console.log(`Added interest: "${topic}"`);
        return interest.id;
    }

    addChatHighlight(title, conversation, insights, category = "General") {
        const highlight = {
            id: Date.now().toString(),
            title,
            conversation,
            insights,
            category,
            dateAdded: new Date().toISOString()
        };

        this.content.chatHighlights.push(highlight);
        this.saveContent();
        console.log(`Added chat highlight: "${title}"`);
        return highlight.id;
    }

    countWords(text) {
        return text.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(word => word.length > 0).length;
    }
}
