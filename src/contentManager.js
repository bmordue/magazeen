import * as nodeFs from 'fs'; // Renamed import to avoid conflict if fsUtils is also named fs

export class ContentManager {
    constructor(contentFile = 'out/magazine-content.json', fsUtils = null) {
        this.contentFile = contentFile;
        // Use provided fs utilities or default to Node's actual fs module
        this.fsUtils = fsUtils || {
            existsSync: nodeFs.existsSync,
            readFileSync: nodeFs.readFileSync,
            writeFileSync: nodeFs.writeFileSync,
        };
        this.loadContent();
    }

    loadContent() {
        try {
            if (this.fsUtils.existsSync(this.contentFile)) {
                this.content = JSON.parse(this.fsUtils.readFileSync(this.contentFile, 'utf8'));
            } else {
                this.content = {
                    metadata: {
                        title: "My Personal Magazine",
                        author: "Your Name",
                        description: "A monthly compilation of my interests, discoveries, and insights."
                    },
                    articles: [],
                    interests: [],
                    chatHighlights: [],
                    claudeChats: [] // Add new field for Claude chats
                };
            }
            // Ensure claudeChats array exists if loading from an older file
            if (!this.content.claudeChats) {
                this.content.claudeChats = [];
            }
            // Ensure each chat has a 'selected' field
            this.content.claudeChats.forEach(chat => {
                if (typeof chat.selected === 'undefined') {
                    chat.selected = false; // Default to not selected
                }
            });
        } catch (error) {
            console.error('Error loading content:', error);
            this.content = { metadata: {}, articles: [], interests: [], chatHighlights: [], claudeChats: [] };
        }
    }

    saveContent() {
        try {
            this.fsUtils.writeFileSync(this.contentFile, JSON.stringify(this.content, null, 2));
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

    selectClaudeChat(chatId) {
        const chat = this.content.claudeChats.find(c => c.id === chatId);
        if (chat) {
            chat.selected = true;
            this.saveContent();
            console.log(`Chat "${chat.title}" selected.`);
        } else {
            console.error(`Chat with ID ${chatId} not found.`);
        }
    }

    deselectClaudeChat(chatId) {
        const chat = this.content.claudeChats.find(c => c.id === chatId);
        if (chat) {
            chat.selected = false;
            this.saveContent();
            console.log(`Chat "${chat.title}" deselected.`);
        } else {
            console.error(`Chat with ID ${chatId} not found.`);
        }
    }

    toggleClaudeChatSelection(chatId) {
        const chat = this.content.claudeChats.find(c => c.id === chatId);
        if (chat) {
            chat.selected = !chat.selected;
            this.saveContent();
            console.log(`Chat "${chat.title}" selection toggled to: ${chat.selected}.`);
        } else {
            console.error(`Chat with ID ${chatId} not found.`);
        }
    }

    importClaudeChatsFromFile(filePath) {
        try {
            if (!this.fsUtils.existsSync(filePath)) {
                console.error(`Error: File not found at ${filePath}`);
                return 0;
            }

            const fileContent = this.fsUtils.readFileSync(filePath, 'utf8');
            const importedChats = JSON.parse(fileContent);

            if (!Array.isArray(importedChats)) {
                console.error('Error: Expected an array of chats from the JSON file.');
                return 0;
            }

            let successfullyImportedCount = 0;
            for (const chat of importedChats) {
                if (chat && chat.uuid && chat.name && Array.isArray(chat.chat_messages)) {
                    const conversation = chat.chat_messages.map(msg => ({
                        sender: msg.sender,
                        text: msg.text,
                        timestamp: msg.created_at
                    }));

                    const newClaudeChat = {
                        id: chat.uuid, // Use Claude's UUID as the ID
                        title: chat.name,
                        conversation: conversation,
                        // Assuming 'insights' and 'category' might be added later or manually
                        insights: "", // Default or to be filled manually
                        category: "Claude Import", // Default category
                        dateAdded: chat.created_at || new Date().toISOString(), // Use Claude's creation date
                        originalImportDate: new Date().toISOString(), // Mark when it was imported
                        selected: false // Initialize as not selected
                    };

                    // Avoid duplicates based on ID
                    if (!this.content.claudeChats.find(existingChat => existingChat.id === newClaudeChat.id)) {
                        this.content.claudeChats.push(newClaudeChat);
                        successfullyImportedCount++;
                    } else {
                        // If chat already exists, update its fields but preserve selection status
                        const existingChat = this.content.claudeChats.find(existingChat => existingChat.id === newClaudeChat.id);
                        if (existingChat) {
                            existingChat.title = newClaudeChat.title;
                            existingChat.conversation = newClaudeChat.conversation;
                            existingChat.insights = newClaudeChat.insights;
                            existingChat.category = newClaudeChat.category;
                            existingChat.dateAdded = newClaudeChat.dateAdded;
                            existingChat.originalImportDate = newClaudeChat.originalImportDate;
                            // Do not change existingChat.selected
                        }
                    }
                } else {
                    console.warn('Skipping chat due to missing essential fields (uuid, name, or chat_messages):', chat);
                }
            }

            if (successfullyImportedCount > 0) {
                this.saveContent();
                console.log(`Successfully imported ${successfullyImportedCount} Claude chats from ${filePath}.`);
            } else {
                console.log(`No new Claude chats were imported from ${filePath}.`);
            }
            return successfullyImportedCount;

        } catch (error) {
            console.error(`Error importing Claude chats from ${filePath}:`, error);
            return 0;
        }
    }
}
