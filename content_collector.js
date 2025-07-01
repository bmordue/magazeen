#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
// import path from 'path';
import EPUBMagazineGenerator from './epub_generator.js';
import readline from 'readline';


class ContentCollector {
    constructor() {
        this.contentFile = 'magazine-content.json';
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

    // Add a new article
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

    // Add interest/topic
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

    // Add chat highlight
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

    // Generate articles from interests
    generateInterestArticle() {
        if (this.content.interests.length === 0) {
            console.log('No interests to generate article from');
            return null;
        }

        const recentInterests = this.content.interests
            .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            .slice(0, 5);

        const content = `
        <p>This month, several topics have captured my attention and sparked deeper exploration:</p>
        
        ${recentInterests.map(interest => `
        <h2>${interest.topic}</h2>
        <p><strong>Priority:</strong> ${interest.priority.charAt(0).toUpperCase() + interest.priority.slice(1)}</p>
        <p>${interest.description}</p>
        `).join('')}
        
        <h2>Reflection</h2>
        <p>These interests reflect my ongoing curiosity about ${recentInterests.map(i => i.topic.toLowerCase()).join(', ')}. 
        I plan to explore these topics further in upcoming conversations and research.</p>
        `;

        return this.addArticle(
            "Current Interests & Explorations",
            content,
            "Personal Growth",
            null,
            ["interests", "exploration", "learning"]
        );
    }

    // Generate article from chat highlights
    generateChatHighlightsArticle() {
        if (this.content.chatHighlights.length === 0) {
            console.log('No chat highlights to generate article from');
            return null;
        }

        const recentHighlights = this.content.chatHighlights
            .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            .slice(0, 3);

        const content = `
        <p>Here are some of the most insightful conversations and discoveries from my recent chats with Claude:</p>
        
        ${recentHighlights.map(highlight => `
        <h2>${highlight.title}</h2>
        <p><em>Category: ${highlight.category}</em></p>
        
        <h3>Key Insights</h3>
        <p>${highlight.insights}</p>
        
        <h3>Notable Exchange</h3>
        <blockquote>${highlight.conversation}</blockquote>
        `).join('')}
        
        <h2>Reflections</h2>
        <p>These conversations highlight the value of AI as a thinking partner, helping me explore complex topics 
        and gain new perspectives on familiar subjects.</p>
        `;

        return this.addArticle(
            "Insights from AI Conversations",
            content,
            "AI & Learning",
            "Claude AI",
            ["conversations", "insights", "learning"]
        );
    }

    // Generate the complete magazine
    generateMagazine() {
        console.log('Generating magazine...');
        
        // Auto-generate articles from collected content
        this.generateInterestArticle();
        this.generateChatHighlightsArticle();
        
        const generator = new EPUBMagazineGenerator();
        
        // Initialize with metadata
        generator.initializeEPUB(
            this.content.metadata.title,
            this.content.metadata.author,
            this.content.metadata.description
        );
        
        // Add all articles
        this.content.articles.forEach(article => {
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

    // Helper method to count words
    countWords(text) {
        return text.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(word => word.length > 0).length;
    }

    // Interactive CLI interface
    startInteractiveSession() {
        console.log('\n=== Personal Magazine Content Collector ===');
        console.log('What would you like to do?');
        console.log('1. Add an article');
        console.log('2. Add an interest');
        console.log('3. Add a chat highlight');
        console.log('4. Generate magazine');
        console.log('5. View current content');
        console.log('6. Exit');
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('\nEnter your choice (1-6): ', (choice) => {
            switch(choice) {
                case '1':
                    this.promptForArticle(rl);
                    break;
                case '2':
                    this.promptForInterest(rl);
                    break;
                case '3':
                    this.promptForChatHighlight(rl);
                    break;
                case '4':
                    this.generateMagazine()
                        .then(path => {
                            console.log(`\nMagazine generated: ${path}`);
                            rl.close();
                        })
                        .catch(error => {
                            console.error('Error generating magazine:', error);
                            rl.close();
                        });
                    break;
                case '5':
                    this.showCurrentContent();
                    rl.close();
                    break;
                case '6':
                default:
                    rl.close();
                    break;
            }
        });
    }

    promptForArticle(rl) {
        rl.question('Article title: ', (title) => {
            rl.question('Category: ', (category) => {
                rl.question('Author (optional): ', (author) => {
                    console.log('Enter article content (type "END" on a new line to finish):');
                    let content = '';
                    const collectContent = () => {
                        rl.question('', (line) => {
                            if (line.trim() === 'END') {
                                this.addArticle(title, content, category || 'General', author || null);
                                console.log('Article added successfully!');
                                rl.close();
                            } else {
                                content += line + '\n';
                                collectContent();
                            }
                        });
                    };
                    collectContent();
                });
            });
        });
    }

    promptForInterest(rl) {
        rl.question('Interest/Topic: ', (topic) => {
            rl.question('Description: ', (description) => {
                rl.question('Priority (low/medium/high): ', (priority) => {
                    this.addInterest(topic, description, priority || 'medium');
                    console.log('Interest added successfully!');
                    rl.close();
                });
            });
        });
    }

    promptForChatHighlight(rl) {
        rl.question('Highlight title: ', (title) => {
            rl.question('Category: ', (category) => {
                console.log('Enter conversation excerpt (type "END" on a new line to finish):');
                let conversation = '';
                const collectConversation = () => {
                    rl.question('', (line) => {
                        if (line.trim() === 'END') {
                            rl.question('Key insights: ', (insights) => {
                                this.addChatHighlight(title, conversation, insights, category || 'General');
                                console.log('Chat highlight added successfully!');
                                rl.close();
                            });
                        } else {
                            conversation += line + '\n';
                            collectConversation();
                        }
                    });
                };
                collectConversation();
            });
        });
    }

    showCurrentContent() {
        console.log('\n=== Current Content ===');
        console.log(`Articles: ${this.content.articles.length}`);
        console.log(`Interests: ${this.content.interests.length}`);
        console.log(`Chat Highlights: ${this.content.chatHighlights.length}`);
        
        if (this.content.articles.length > 0) {
            console.log('\nRecent Articles:');
            this.content.articles.slice(-3).forEach(article => {
                console.log(`  - ${article.title} (${article.category}) - ${article.wordCount} words`);
            });
        }
        
        if (this.content.interests.length > 0) {
            console.log('\nRecent Interests:');
            this.content.interests.slice(-3).forEach(interest => {
                console.log(`  - ${interest.topic} (${interest.priority} priority)`);
            });
        }
    }
}

// Create a simple template generator for new users
function createTemplate() {
    const template = {
        metadata: {
            title: "My Personal Magazine",
            author: "Your Name Here",
            description: "A monthly compilation of my interests, discoveries, and insights from conversations with Claude."
        },
        articles: [
            {
                id: "template-1",
                title: "Welcome to Your Personal Magazine",
                content: `
                <p>Welcome to your first personal magazine issue! This template will help you get started with creating your own monthly compilation.</p>
                
                <h2>How to Use This System</h2>
                <p>Each month, you can collect:</p>
                <ul>
                    <li><strong>Articles:</strong> Write about topics that interest you</li>
                    <li><strong>Interests:</strong> Track what you're curious about</li>
                    <li><strong>Chat Highlights:</strong> Save interesting conversations with Claude</li>
                </ul>
                
                <h2>Getting Started</h2>
                <p>Run the content collector script to begin adding your own content:</p>
                <pre><code>node content-collector.js</code></pre>
                
                <h2>Tips for Success</h2>
                <blockquote>
                "The best magazine is one that reflects your authentic interests and growth over time."
                </blockquote>
                <p>Don't worry about perfection - focus on capturing what genuinely interests you each month.</p>
                `,
                category: "Getting Started",
                author: null,
                tags: ["welcome", "instructions"],
                dateAdded: new Date().toISOString(),
                wordCount: 150
            }
        ],
        interests: [
            {
                id: "interest-1",
                topic: "Personal Knowledge Management",
                description: "Exploring ways to better organize and retain information from conversations and reading",
                priority: "high",
                dateAdded: new Date().toISOString()
            }
        ],
        chatHighlights: [
            {
                id: "highlight-1",
                title: "Creating Personal EPUB Magazines",
                conversation: "I want to create a reproducible system for generating personal magazines from my interests and conversations...",
                insights: "EPUB format provides a great way to create portable, readable magazines that can be enjoyed on any device. The key is making the process reproducible and automated.",
                category: "Productivity",
                dateAdded: new Date().toISOString()
            }
        ]
    };
    
    writeFileSync('out/magazine-content.json', JSON.stringify(template, null, 2));
    console.log('Template created! Edit magazine-content.json to customize your magazine.');
}

import { resolve } from 'path'
import { fileURLToPath } from 'url'

const thisFile = resolve(fileURLToPath(import.meta.url))
const pathPassedToNode = resolve(process.argv[1])


// CLI interface
if (thisFile.includes(pathPassedToNode)) {
    const args = process.argv.slice(2);
    
    if (args.includes('--template')) {
        createTemplate();
    } else if (args.includes('--generate')) {
        const collector = new ContentCollector();
        collector.generateMagazine()
            .then(path => console.log(`Magazine generated: ${path}`))
            .catch(error => console.error('Error:', error));
    } else {
        const collector = new ContentCollector();
        collector.startInteractiveSession();
    }
}

export default ContentCollector;