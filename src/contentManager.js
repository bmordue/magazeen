import { promises as fs } from 'fs';
import * as syncFs from 'fs';
import { config } from './config.js';
import { Logger } from './logger.js';
import { Validator, ValidationError } from './validation.js';
import https from 'https';
import http from 'http';

export class ContentManager {
    constructor(contentFile = null, fsUtils = null) {
        this.contentFile = contentFile || config.paths.contentFile;
        
        // Support both sync and async operations for backward compatibility
        this.fsUtils = fsUtils || {
            // Sync operations (for backward compatibility)
            existsSync: syncFs.existsSync,
            readFileSync: syncFs.readFileSync,
            writeFileSync: syncFs.writeFileSync,
            // Async operations (preferred)
            pathExists: async (path) => {
                try {
                    await fs.access(path);
                    return true;
                } catch {
                    return false;
                }
            },
            readFile: fs.readFile,
            writeFile: fs.writeFile,
            mkdir: fs.mkdir,
        };
        
        this.logger = Logger.child({ component: 'ContentManager' });
        this._initialized = false;
        
        // Initialize synchronously for backward compatibility
        this.loadContent();
    }

    // Sync version (for backward compatibility)
    loadContent() {
        try {
            if (this.fsUtils.existsSync(this.contentFile)) {
                this.content = JSON.parse(this.fsUtils.readFileSync(this.contentFile, 'utf8'));
                this.logger.debug('Content loaded successfully (sync)', { 
                    file: this.contentFile,
                    articles: this.content.articles?.length || 0,
                    interests: this.content.interests?.length || 0,
                    chatHighlights: this.content.chatHighlights?.length || 0,
                    claudeChats: this.content.claudeChats?.length || 0
                });
            } else {
                this.content = {
                    metadata: {
                        title: config.epub.defaults.title,
                        author: config.epub.defaults.author,
                        description: config.epub.defaults.description,
                        pageLimit: null,
                        wordsPerPage: config.epub.wordsPerPage
                    },
                    articles: [],
                    interests: [],
                    chatHighlights: [],
                    claudeChats: []
                };
                this.logger.info('Created new content structure (sync)', { file: this.contentFile });
            }
            
            this._ensureContentStructure();
            this._initialized = true;
        } catch (error) {
            this.logger.error('Failed to load content (sync)', error, { file: this.contentFile });
            this.content = this._createDefaultContent();
            this._initialized = true;
        }
    }

    // Async version (preferred)
    async loadContentAsync() {
        try {
            const exists = await this.fsUtils.pathExists(this.contentFile);
            if (exists) {
                const data = await this.fsUtils.readFile(this.contentFile, 'utf8');
                this.content = JSON.parse(data);
                this.logger.debug('Content loaded successfully (async)', { 
                    file: this.contentFile,
                    articles: this.content.articles?.length || 0,
                    interests: this.content.interests?.length || 0,
                    chatHighlights: this.content.chatHighlights?.length || 0,
                    claudeChats: this.content.claudeChats?.length || 0
                });
            } else {
                this.content = this._createDefaultContent();
                this.logger.info('Created new content structure (async)', { file: this.contentFile });
            }
            
            this._ensureContentStructure();
            this._initialized = true;
        } catch (error) {
            this.logger.error('Failed to load content (async)', error, { file: this.contentFile });
            this.content = this._createDefaultContent();
            this._initialized = true;
        }
    }

    _createDefaultContent() {
        return {
            metadata: {
                title: config.epub.defaults.title,
                author: config.epub.defaults.author,
                description: config.epub.defaults.description,
                pageLimit: null,
                wordsPerPage: config.epub.wordsPerPage
            },
            articles: [],
            interests: [],
            chatHighlights: [],
            claudeChats: []
        };
    }

    _ensureContentStructure() {
        // Ensure claudeChats array exists if loading from an older file
        if (!this.content.claudeChats) {
            this.content.claudeChats = [];
        }
        // Ensure page limit metadata exists for older files
        if (this.content.metadata.pageLimit === undefined) {
            this.content.metadata.pageLimit = null;
        }
        if (this.content.metadata.wordsPerPage === undefined) {
            this.content.metadata.wordsPerPage = config.epub.wordsPerPage;
        }
        // Ensure each chat has a 'selected' field
        this.content.claudeChats.forEach(chat => {
            if (typeof chat.selected === 'undefined') {
                chat.selected = false;
            }
        });
    }

    async _ensureInitialized() {
        if (!this._initialized) {
            await this.loadContentAsync();
        }
    }

    // Sync version (for backward compatibility)
    saveContent() {
        try {
            this.fsUtils.writeFileSync(this.contentFile, JSON.stringify(this.content, null, 2));
            this.logger.info('Content saved successfully (sync)', { 
                file: this.contentFile,
                articles: this.content.articles.length,
                interests: this.content.interests.length,
                chatHighlights: this.content.chatHighlights.length,
                claudeChats: this.content.claudeChats.length
            });
        } catch (error) {
            this.logger.error('Failed to save content (sync)', error, { file: this.contentFile });
            throw new Error(`Failed to save content: ${error.message}`);
        }
    }

    // Async version (preferred)
    async saveContentAsync() {
        try {
            // Ensure directory exists
            const { dirname } = await import('path');
            const dir = dirname(this.contentFile);
            await this.fsUtils.mkdir(dir, { recursive: true });
            
            await this.fsUtils.writeFile(this.contentFile, JSON.stringify(this.content, null, 2));
            this.logger.info('Content saved successfully (async)', { 
                file: this.contentFile,
                articles: this.content.articles.length,
                interests: this.content.interests.length,
                chatHighlights: this.content.chatHighlights.length,
                claudeChats: this.content.claudeChats.length
            });
        } catch (error) {
            this.logger.error('Failed to save content (async)', error, { file: this.contentFile });
            throw new Error(`Failed to save content: ${error.message}`);
        }
    }

    // Sync version (for backward compatibility)
    addArticle(title, content, category = "General", author = null, tags = []) {
        try {
            const articleData = {
                title,
                content,
                category: category || config.content.defaultCategory,
                author,
                tags: tags || []
            };
            
            Validator.validateArticle(articleData);
            
            const wordCount = this.countWords(content);
            
            if (this.wouldExceedPageLimit(wordCount)) {
                const pageInfo = this.getPageLimitInfo();
                const errorMessage = `Cannot add article "${title}": would exceed page limit of ${pageInfo.pageLimit} pages (currently ${pageInfo.currentPages} pages, would become ${Math.ceil((pageInfo.totalWords + wordCount) / pageInfo.wordsPerPage)} pages)`;
                this.logger.error(errorMessage, null, { title, wordCount, pageInfo });
                return null;
            }
            
            const article = {
                id: Date.now().toString(),
                title: articleData.title,
                content: articleData.content,
                category: articleData.category,
                author: articleData.author,
                tags: articleData.tags,
                dateAdded: new Date().toISOString(),
                wordCount
            };
            
            this.content.articles.push(article);
            this.saveContent();
            
            this.logger.info(`Added article: "${title}" (${wordCount} words)`, {
                id: article.id,
                category: article.category,
                wordCount,
                totalArticles: this.content.articles.length
            });
            
            return article.id;
        } catch (error) {
            if (error instanceof ValidationError) {
                this.logger.warn('Article validation failed', { 
                    title,
                    error: error.message,
                    field: error.field
                });
                throw error;
            } else {
                this.logger.error('Failed to add article', error, { title });
                throw new Error(`Failed to add article: ${error.message}`);
            }
        }
    }

    // Async version (preferred for new code)
    async addArticleAsync(title, content, category = "General", author = null, tags = []) {
        await this._ensureInitialized();
        
        try {
            const articleData = {
                title,
                content,
                category: category || config.content.defaultCategory,
                author,
                tags: tags || []
            };
            
            Validator.validateArticle(articleData);
            
            const wordCount = this.countWords(content);
            
            if (this.wouldExceedPageLimit(wordCount)) {
                const pageInfo = this.getPageLimitInfo();
                const errorMessage = `Cannot add article "${title}": would exceed page limit of ${pageInfo.pageLimit} pages (currently ${pageInfo.currentPages} pages, would become ${Math.ceil((pageInfo.totalWords + wordCount) / pageInfo.wordsPerPage)} pages)`;
                this.logger.error(errorMessage, null, { title, wordCount, pageInfo });
                return null;
            }
            
            const article = {
                id: Date.now().toString(),
                title: articleData.title,
                content: articleData.content,
                category: articleData.category,
                author: articleData.author,
                tags: articleData.tags,
                dateAdded: new Date().toISOString(),
                wordCount
            };
            
            this.content.articles.push(article);
            await this.saveContentAsync();
            
            this.logger.info(`Added article: "${title}" (${wordCount} words)`, {
                id: article.id,
                category: article.category,
                wordCount,
                totalArticles: this.content.articles.length
            });
            
            return article.id;
        } catch (error) {
            if (error instanceof ValidationError) {
                this.logger.warn('Article validation failed', { 
                    title,
                    error: error.message,
                    field: error.field
                });
                throw error;
            } else {
                this.logger.error('Failed to add article', error, { title });
                throw new Error(`Failed to add article: ${error.message}`);
            }
        }
    }

    addInterest(topic, description, priority = "medium") {
        try {
            Validator.validateInterest({ topic, description, priority });
            
            const interest = {
                id: Date.now().toString(),
                topic,
                description,
                priority,
                dateAdded: new Date().toISOString()
            };

            this.content.interests.push(interest);
            this.saveContent();
            this.logger.info(`Added interest: "${topic}"`, {
                id: interest.id,
                priority,
                totalInterests: this.content.interests.length
            });
            return interest.id;
        } catch (error) {
            if (error instanceof ValidationError) {
                this.logger.warn('Interest validation failed', { 
                    topic,
                    error: error.message,
                    field: error.field
                });
                throw error;
            } else {
                this.logger.error('Failed to add interest', error, { topic });
                throw new Error(`Failed to add interest: ${error.message}`);
            }
        }
    }

    addChatHighlight(title, conversation, insights, category = "General") {
        try {
            Validator.validateChatHighlight({ title, conversation, insights, category });
            
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
            this.logger.info(`Added chat highlight: "${title}"`, {
                id: highlight.id,
                category,
                totalHighlights: this.content.chatHighlights.length
            });
            
            return highlight.id;
        } catch (error) {
            if (error instanceof ValidationError) {
                this.logger.warn('Chat highlight validation failed', { 
                    title,
                    error: error.message,
                    field: error.field
                });
                throw error;
            } else {
                this.logger.error('Failed to add chat highlight', error, { title });
                throw new Error(`Failed to add chat highlight: ${error.message}`);
            }
        }
    }

    countWords(text) {
        return text.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(word => word.length > 0).length;
    }

    _findClaudeChat(chatId) {
        const chat = this.content.claudeChats.find(c => c.id === chatId);
        if (!chat) {
            console.error(`Chat with ID ${chatId} not found.`);
        }
        return chat;
    }

    // Calculate total word count from all content
    getTotalWordCount() {
        let totalWords = 0;
        
        // Count words from articles
        this.content.articles.forEach(article => {
            totalWords += this.countWords(article.content);
        });
        
        // Count words from selected Claude chats
        this.content.claudeChats.forEach(chat => {
            if (chat.selected) {
                chat.conversation.forEach(message => {
                    totalWords += this.countWords(message.text);
                });
            }
        });
        
        return totalWords;
    }

    // Calculate estimated page count
    getEstimatedPages() {
        const totalWords = this.getTotalWordCount();
        const wordsPerPage = this.content.metadata.wordsPerPage || 300;
        return Math.ceil(totalWords / wordsPerPage);
    }

    // Check if adding content would exceed page limit
    wouldExceedPageLimit(additionalWordCount = 0) {
        if (!this.content.metadata.pageLimit) {
            return false; // No limit set
        }
        
        const currentWords = this.getTotalWordCount();
        const totalWords = currentWords + additionalWordCount;
        const estimatedPages = Math.ceil(totalWords / (this.content.metadata.wordsPerPage || 300));
        
        return estimatedPages > this.content.metadata.pageLimit;
    }

    // Set page limit
    setPageLimit(limit) {
        try {
            // Allow 0, null, undefined to disable limit
            if (limit !== null && limit !== undefined && limit !== 0) {
                Validator.validatePageLimit(limit);
            }
            
            this.content.metadata.pageLimit = limit > 0 ? limit : null;
            this.saveContent();
            
            const message = limit > 0 ? `Page limit set to ${limit} pages` : 'Page limit removed';
            this.logger.info(message, { pageLimit: limit });
            console.log(message);
        } catch (error) {
            this.logger.error('Failed to set page limit', error, { limit });
            throw error;
        }
    }

    // Get page limit info for display
    getPageLimitInfo() {
        const currentPages = this.getEstimatedPages();
        const limit = this.content.metadata.pageLimit;
        const totalWords = this.getTotalWordCount();
        
        return {
            currentPages,
            pageLimit: limit,
            totalWords,
            wordsPerPage: this.content.metadata.wordsPerPage || 300,
            hasLimit: limit !== null,
            isAtLimit: limit !== null && currentPages >= limit
        };
    }

    selectClaudeChat(chatId) {
        const chat = this._findClaudeChat(chatId);
        if (chat) {
            chat.selected = true;
            this.saveContent();
            this.logger.info(`Chat "${chat.title}" selected`, { chatId });
            console.log(`Chat "${chat.title}" selected.`);
        } else {
            this.logger.warn('Chat not found for selection', { chatId });
        }
    }

    deselectClaudeChat(chatId) {
        const chat = this._findClaudeChat(chatId);
        if (chat) {
            chat.selected = false;
            this.saveContent();
            this.logger.info(`Chat "${chat.title}" deselected`, { chatId });
            console.log(`Chat "${chat.title}" deselected.`);
        } else {
            this.logger.warn('Chat not found for deselection', { chatId });
        }
    }

    toggleClaudeChatSelection(chatId) {
        const chat = this._findClaudeChat(chatId);
        if (chat) {
            chat.selected = !chat.selected;
            this.saveContent();
            this.logger.info(`Chat "${chat.title}" selection toggled`, { 
                chatId, 
                selected: chat.selected 
            });
            console.log(`Chat "${chat.title}" selection toggled to: ${chat.selected}.`);
        } else {
            this.logger.warn('Chat not found for toggle', { chatId });
        }
    }

    /**
     * Process and import chats from parsed JSON data
     * @param {Array} importedChats - Array of chat objects to process
     * @returns {number} - Number of successfully imported chats
     * @private
     */
    _processClaudeChats(importedChats) {
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
                    id: chat.uuid,
                    title: chat.name,
                    conversation: conversation,
                    insights: "",
                    category: "Claude Import",
                    dateAdded: chat.created_at || new Date().toISOString(),
                    originalImportDate: new Date().toISOString(),
                    selected: false
                };

                const existingChat = this.content.claudeChats.find(existingChat => existingChat.id === newClaudeChat.id);
                if (!existingChat) {
                    this.content.claudeChats.push(newClaudeChat);
                    successfullyImportedCount++;
                } else {
                    // Update existing chat but preserve selection status
                    existingChat.title = newClaudeChat.title;
                    existingChat.conversation = newClaudeChat.conversation;
                    existingChat.insights = newClaudeChat.insights;
                    existingChat.category = newClaudeChat.category;
                    existingChat.dateAdded = newClaudeChat.dateAdded;
                    existingChat.originalImportDate = newClaudeChat.originalImportDate;
                }
            } else {
                console.warn('Skipping chat due to missing essential fields (uuid, name, or chat_messages):', chat);
            }
        }

        return successfullyImportedCount;
    }

    importClaudeChatsFromFile(filePath) {
        try {
            if (!this.fsUtils.existsSync(filePath)) {
                console.error(`Error: File not found at ${filePath}`);
                return 0;
            }

            const fileContent = this.fsUtils.readFileSync(filePath, 'utf8');
            const importedChats = JSON.parse(fileContent);

            const successfullyImportedCount = this._processClaudeChats(importedChats);

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

    /**
     * Fetch JSON data from a URL
     * @param {string} url - The URL to fetch from
     * @returns {Promise<string>} - The fetched JSON string
     */
    async _fetchFromUrl(url) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const protocol = urlObj.protocol === 'https:' ? https : http;

            const request = protocol.get(url, (response) => {
                // Handle redirects
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    // Resolve relative redirect URLs
                    const redirectUrl = new URL(response.headers.location, url).href;
                    this._fetchFromUrl(redirectUrl)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    resolve(data);
                });
            });

            request.on('error', (error) => {
                reject(error);
            });

            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error('Request timeout after 30 seconds'));
            });
        });
    }

    /**
     * Import Claude chats from a web URL
     * @param {string} url - The URL to fetch the JSON export from
     * @returns {Promise<number>} - Number of successfully imported chats
     */
    async importClaudeChatsFromUrl(url) {
        try {
            // Validate URL
            try {
                new URL(url);
            } catch {
                this.logger.error('Invalid URL format', null, { url });
                console.error(`Error: Invalid URL format: ${url}`);
                return 0;
            }

            // Ensure content structure is initialized
            this._ensureContentStructure();

            this.logger.info('Fetching Claude chats from URL', { url });
            console.log(`Fetching Claude chats from: ${url}`);

            const fileContent = await this._fetchFromUrl(url);
            const importedChats = JSON.parse(fileContent);

            const successfullyImportedCount = this._processClaudeChats(importedChats);

            if (successfullyImportedCount > 0) {
                this.saveContent();
                console.log(`Successfully imported ${successfullyImportedCount} Claude chats from ${url}.`);
            } else {
                console.log(`No new Claude chats were imported from ${url}.`);
            }
            return successfullyImportedCount;

        } catch (error) {
            this.logger.error('Error importing Claude chats from URL', error, { url });
            console.error(`Error importing Claude chats from ${url}:`, error.message);
            return 0;
        }
    }
}
