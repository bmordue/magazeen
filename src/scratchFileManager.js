import { promises as fs } from 'fs';
import * as syncFs from 'fs';
import { Logger } from './logger.js';

/**
 * Manages scratch file for editing chat selection and sequence offline
 */
export class ScratchFileManager {
    constructor(contentManager, fsUtils = null) {
        this.contentManager = contentManager;
        this.fsUtils = fsUtils || {
            existsSync: syncFs.existsSync,
            readFileSync: syncFs.readFileSync,
            writeFileSync: syncFs.writeFileSync,
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
        };
        this.logger = Logger.child({ component: 'ScratchFileManager' });
    }

    /**
     * Generate scratch file content from chats
     * @private
     */
    _generateScratchContent() {
        const chats = this.contentManager.content.claudeChats;
        
        if (chats.length === 0) {
            return null;
        }

        const lines = [];
        
        // Add header with instructions
        lines.push('# Magazine Scratch File - Chat Selection and Sequence');
        lines.push('# ');
        lines.push('# Instructions:');
        lines.push('#   - Lines starting with "#" are comments (ignored)');
        lines.push('#   - Lines starting with "+" are SELECTED for inclusion');
        lines.push('#   - Lines starting with "-" are NOT selected');
        lines.push('#   - Reorder lines to change the sequence in the magazine');
        lines.push('#   - Do not modify the chat IDs in [brackets]');
        lines.push('# ');
        lines.push('# Format: [+/-] [chat-id] Title');
        lines.push('# ');
        lines.push('');

        // Add selected chats first, then unselected
        const selectedChats = chats.filter(c => c.selected);
        const unselectedChats = chats.filter(c => !c.selected);

        selectedChats.forEach(chat => {
            const prefix = '+';
            const shortId = chat.id.substring(0, 8);
            lines.push(`${prefix} [${shortId}] ${chat.title}`);
        });

        if (selectedChats.length > 0 && unselectedChats.length > 0) {
            lines.push('');
            lines.push('# --- Unselected chats below ---');
            lines.push('');
        }

        unselectedChats.forEach(chat => {
            const prefix = '-';
            const shortId = chat.id.substring(0, 8);
            lines.push(`${prefix} [${shortId}] ${chat.title}`);
        });

        return {
            content: lines.join('\n') + '\n',
            totalChats: chats.length,
            selectedChats: selectedChats.length
        };
    }

    /**
     * Parse scratch file content
     * @private
     */
    _parseScratchContent(content) {
        const lines = content.split('\n');
        const parsedEntries = [];
        const errors = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) {
                return;
            }

            // Parse format: [+/-] [chat-id] Title
            const match = trimmed.match(/^([+-])\s*\[([^\]]+)\]\s*(.+)$/);
            
            if (!match) {
                errors.push(`Line ${index + 1}: Invalid format - "${trimmed}"`);
                return;
            }

            const [, prefix, shortId, title] = match;
            const selected = prefix === '+';
            
            parsedEntries.push({
                shortId: shortId.trim(),
                title: title.trim(),
                selected,
                lineNumber: index + 1
            });
        });

        return { parsedEntries, errors };
    }

    /**
     * Apply parsed entries to content manager
     * @private
     */
    _applyParsedEntries(parsedEntries) {
        const chats = this.contentManager.content.claudeChats;
        const chatMap = new Map();
        
        // Create map of short ID to full chat
        chats.forEach(chat => {
            const shortId = chat.id.substring(0, 8);
            chatMap.set(shortId, chat);
        });

        let selectedCount = 0;
        let deselectedCount = 0;
        const notFoundIds = [];
        const newOrder = [];

        // Process entries in the order they appear in scratch file
        parsedEntries.forEach(entry => {
            const chat = chatMap.get(entry.shortId);
            
            if (!chat) {
                notFoundIds.push(entry.shortId);
                return;
            }

            const wasSelected = chat.selected;
            chat.selected = entry.selected;
            
            if (entry.selected && !wasSelected) {
                selectedCount++;
            } else if (!entry.selected && wasSelected) {
                deselectedCount++;
            }

            newOrder.push(chat);
        });

        // Add any chats that weren't in the scratch file (shouldn't happen normally)
        chats.forEach(chat => {
            if (!newOrder.find(c => c.id === chat.id)) {
                newOrder.push(chat);
            }
        });

        // Update the order
        this.contentManager.content.claudeChats = newOrder;

        return {
            totalChats: newOrder.length,
            selectedCount,
            deselectedCount,
            notFoundIds
        };
    }

    /**
     * Export current chat selection to a scratch file
     * @param {string} scratchFilePath - Path to save the scratch file
     * @returns {Object} Export result with stats
     */
    exportToScratchFile(scratchFilePath = 'out/magazine-scratch.txt') {
        try {
            const result = this._generateScratchContent();
            
            if (!result) {
                this.logger.warn('No chats available to export');
                return { success: false, message: 'No chats available to export' };
            }

            this.fsUtils.writeFileSync(scratchFilePath, result.content, 'utf8');

            this.logger.info('Scratch file exported', {
                path: scratchFilePath,
                totalChats: result.totalChats,
                selectedChats: result.selectedChats
            });

            return {
                success: true,
                path: scratchFilePath,
                totalChats: result.totalChats,
                selectedChats: result.selectedChats
            };
        } catch (error) {
            this.logger.error('Failed to export scratch file', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Apply scratch file changes back to content
     * @param {string} scratchFilePath - Path to the scratch file
     * @returns {Object} Apply result with stats
     */
    applyFromScratchFile(scratchFilePath = 'out/magazine-scratch.txt') {
        try {
            if (!this.fsUtils.existsSync(scratchFilePath)) {
                this.logger.warn('Scratch file not found', { path: scratchFilePath });
                return { success: false, message: 'Scratch file not found' };
            }

            const content = this.fsUtils.readFileSync(scratchFilePath, 'utf8');
            const { parsedEntries, errors } = this._parseScratchContent(content);

            if (errors.length > 0) {
                this.logger.warn('Scratch file has format errors', { errors });
                return { 
                    success: false, 
                    message: 'Format errors in scratch file',
                    errors 
                };
            }

            const result = this._applyParsedEntries(parsedEntries);
            this.contentManager.saveContent();

            this.logger.info('Scratch file applied', {
                path: scratchFilePath,
                totalChats: result.totalChats,
                selected: result.selectedCount,
                deselected: result.deselectedCount,
                notFound: result.notFoundIds.length
            });

            return {
                success: true,
                totalChats: result.totalChats,
                selectedCount: result.selectedCount,
                deselectedCount: result.deselectedCount,
                notFoundIds: result.notFoundIds,
                warnings: result.notFoundIds.length > 0 ? 
                    [`Warning: ${result.notFoundIds.length} chat(s) not found: ${result.notFoundIds.join(', ')}`] : []
            };
        } catch (error) {
            this.logger.error('Failed to apply scratch file', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Async version of exportToScratchFile
     */
    async exportToScratchFileAsync(scratchFilePath = 'out/magazine-scratch.txt') {
        try {
            const result = this._generateScratchContent();
            
            if (!result) {
                this.logger.warn('No chats available to export');
                return { success: false, message: 'No chats available to export' };
            }

            await this.fsUtils.writeFile(scratchFilePath, result.content, 'utf8');

            this.logger.info('Scratch file exported (async)', {
                path: scratchFilePath,
                totalChats: result.totalChats,
                selectedChats: result.selectedChats
            });

            return {
                success: true,
                path: scratchFilePath,
                totalChats: result.totalChats,
                selectedChats: result.selectedChats
            };
        } catch (error) {
            this.logger.error('Failed to export scratch file (async)', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Async version of applyFromScratchFile
     */
    async applyFromScratchFileAsync(scratchFilePath = 'out/magazine-scratch.txt') {
        try {
            const exists = await this.fsUtils.pathExists(scratchFilePath);
            if (!exists) {
                this.logger.warn('Scratch file not found', { path: scratchFilePath });
                return { success: false, message: 'Scratch file not found' };
            }

            const content = await this.fsUtils.readFile(scratchFilePath, 'utf8');
            const { parsedEntries, errors } = this._parseScratchContent(content);

            if (errors.length > 0) {
                this.logger.warn('Scratch file has format errors', { errors });
                return { 
                    success: false, 
                    message: 'Format errors in scratch file',
                    errors 
                };
            }

            const result = this._applyParsedEntries(parsedEntries);
            await this.contentManager.saveContentAsync();

            this.logger.info('Scratch file applied (async)', {
                path: scratchFilePath,
                totalChats: result.totalChats,
                selected: result.selectedCount,
                deselected: result.deselectedCount,
                notFound: result.notFoundIds.length
            });

            return {
                success: true,
                totalChats: result.totalChats,
                selectedCount: result.selectedCount,
                deselectedCount: result.deselectedCount,
                notFoundIds: result.notFoundIds,
                warnings: result.notFoundIds.length > 0 ? 
                    [`Warning: ${result.notFoundIds.length} chat(s) not found: ${result.notFoundIds.join(', ')}`] : []
            };
        } catch (error) {
            this.logger.error('Failed to apply scratch file (async)', error);
            return { success: false, message: error.message };
        }
    }
}
