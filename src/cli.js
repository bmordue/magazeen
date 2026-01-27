import readline from 'readline';
import { ContentManager } from './contentManager.js';
import { ArticleGenerator } from './articleGenerator.js';
import { MagazineGenerator } from './magazineGenerator.js';
import { ScratchFileManager } from './scratchFileManager.js';
import { createTemplate } from './templateManager.js';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const contentManager = new ContentManager();
const articleGenerator = new ArticleGenerator(contentManager);
const magazineGenerator = new MagazineGenerator(contentManager, articleGenerator);
const scratchFileManager = new ScratchFileManager(contentManager);

// Interactive CLI interface
export function startInteractiveSession() {
    console.log('\n=== Personal Magazine Content Collector ===');
    
    // Show page limit information
    const pageInfo = contentManager.getPageLimitInfo();
    if (pageInfo.hasLimit) {
        console.log(`📄 Pages: ${pageInfo.currentPages}/${pageInfo.pageLimit} (${pageInfo.totalWords} words)`);
        if (pageInfo.isAtLimit) {
            console.log('⚠️  Page limit reached! Cannot add more content.');
        }
    } else {
        console.log(`📄 Current pages: ${pageInfo.currentPages} (${pageInfo.totalWords} words, no limit set)`);
    }
    
    console.log('\nWhat would you like to do?');
    console.log('1. Add an article');
    console.log('2. Add an interest');
    console.log('3. Add a chat highlight');
    console.log('4. Manage Claude Chats');
    console.log('5. Generate magazine');
    console.log('6. View current content');
    console.log('7. Set page limit');
    console.log('8. Export scratch file');
    console.log('9. Apply scratch file');
    console.log('10. Exit');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('\nEnter your choice (1-10): ', (choice) => {
        switch(choice) {
            case '1':
                promptForArticle(rl);
                break;
            case '2':
                promptForInterest(rl);
                break;
            case '3':
                promptForChatHighlight(rl);
                break;
            case '4':
                manageClaudeChats(rl);
                break;
            case '5':
                magazineGenerator.generateMagazine()
                    .then(path => {
                        console.log(`\nMagazine generated: ${path}`);
                        rl.close();
                    })
                    .catch(error => {
                        console.error('Error generating magazine:', error);
                        rl.close();
                    });
                break;
            case '6':
                showCurrentContent();
                rl.close();
                break;
            case '7':
                promptForPageLimit(rl);
                break;
            case '8':
                exportScratchFile(rl);
                break;
            case '9':
                applyScratchFile(rl);
                break;
            case '10':
            default:
                rl.close();
                break;
        }
    });
}

function promptForArticle(rl) {
    rl.question('Article title: ', (title) => {
        rl.question('Category: ', (category) => {
            rl.question('Author (optional): ', (author) => {
                console.log('Enter article content (type "END" on a new line to finish):');
                let content = '';
                const collectContent = () => {
                    rl.question('', (line) => {
                        if (line.trim() === 'END') {
                            contentManager.addArticle(title, content, category || 'General', author || null);
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

function promptForInterest(rl) {
    rl.question('Interest/Topic: ', (topic) => {
        rl.question('Description: ', (description) => {
            rl.question('Priority (low/medium/high): ', (priority) => {
                contentManager.addInterest(topic, description, priority || 'medium');
                console.log('Interest added successfully!');
                rl.close();
            });
        });
    });
}

function promptForChatHighlight(rl) {
    rl.question('Highlight title: ', (title) => {
        rl.question('Category: ', (category) => {
            console.log('Enter conversation excerpt (type "END" on a new line to finish):');
            let conversation = '';
            const collectConversation = () => {
                rl.question('', (line) => {
                    if (line.trim() === 'END') {
                        rl.question('Key insights: ', (insights) => {
                            contentManager.addChatHighlight(title, conversation, insights, category || 'General');
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

function showCurrentContent() {
    console.log('\n=== Current Content ===');
    const pageInfo = contentManager.getPageLimitInfo();
    console.log(`Articles: ${contentManager.content.articles.length}`);
    console.log(`Interests: ${contentManager.content.interests.length}`);
    console.log(`Chat Highlights: ${contentManager.content.chatHighlights.length}`);
    console.log(`Claude Chats: ${contentManager.content.claudeChats.length} (Selected: ${contentManager.content.claudeChats.filter(c => c.selected).length})`);
    console.log(`\n📄 Page Information:`);
    console.log(`  Current pages: ${pageInfo.currentPages}`);
    console.log(`  Total words: ${pageInfo.totalWords}`);
    console.log(`  Words per page: ${pageInfo.wordsPerPage}`);
    if (pageInfo.hasLimit) {
        console.log(`  Page limit: ${pageInfo.pageLimit}`);
        console.log(`  Status: ${pageInfo.isAtLimit ? '⚠️ At limit' : '✅ Under limit'}`);
    } else {
        console.log(`  Page limit: None set`);
    }

    if (contentManager.content.articles.length > 0) {
        console.log('\nRecent Articles:');
        contentManager.content.articles.slice(-3).forEach(article => {
            console.log(`  - ${article.title} (${article.category}) - ${article.wordCount} words`);
        });
    }

    if (contentManager.content.interests.length > 0) {
        console.log('\nRecent Interests:');
        contentManager.content.interests.slice(-3).forEach(interest => {
            console.log(`  - ${interest.topic} (${interest.priority} priority)`);
        });
    }
}

function promptForPageLimit(rl) {
    const pageInfo = contentManager.getPageLimitInfo();
    console.log(`\n=== Set Page Limit ===`);
    console.log(`Current: ${pageInfo.hasLimit ? pageInfo.pageLimit + ' pages' : 'No limit'}`);
    console.log(`Current content: ${pageInfo.currentPages} pages (${pageInfo.totalWords} words)`);
    
    rl.question('Enter new page limit (0 or empty to remove limit): ', (input) => {
        const limit = parseInt(input.trim());
        if (input.trim() === '' || limit === 0) {
            contentManager.setPageLimit(0);
        } else if (limit > 0) {
            if (limit < pageInfo.currentPages) {
                console.log(`⚠️  Warning: New limit (${limit}) is less than current content (${pageInfo.currentPages} pages)`);
                console.log('This will prevent adding new content but won\'t remove existing content.');
            }
            contentManager.setPageLimit(limit);
        } else {
            console.log('Invalid input. Please enter a positive number or 0 to remove limit.');
        }
        rl.close();
    });
}

function exportScratchFile(rl) {
    rl.question('Scratch file path (press Enter for default "out/magazine-scratch.txt"): ', (path) => {
        const scratchPath = path.trim() || 'out/magazine-scratch.txt';
        const result = scratchFileManager.exportToScratchFile(scratchPath);
        
        if (result.success) {
            console.log(`\n✅ Scratch file exported successfully!`);
            console.log(`   Path: ${result.path}`);
            console.log(`   Total chats: ${result.totalChats}`);
            console.log(`   Selected chats: ${result.selectedChats}`);
            console.log(`\nYou can now edit this file to:`);
            console.log(`  - Change selection (+ for selected, - for not selected)`);
            console.log(`  - Reorder chats by moving lines up/down`);
            console.log(`\nAfter editing, use option 9 to apply your changes.`);
        } else {
            console.log(`\n❌ Failed to export scratch file: ${result.message}`);
        }
        rl.close();
    });
}

function applyScratchFile(rl) {
    rl.question('Scratch file path (press Enter for default "out/magazine-scratch.txt"): ', (path) => {
        const scratchPath = path.trim() || 'out/magazine-scratch.txt';
        const result = scratchFileManager.applyFromScratchFile(scratchPath);
        
        if (result.success) {
            console.log(`\n✅ Scratch file applied successfully!`);
            console.log(`   Total chats: ${result.totalChats}`);
            console.log(`   Newly selected: ${result.selectedCount}`);
            console.log(`   Newly deselected: ${result.deselectedCount}`);
            
            if (result.warnings && result.warnings.length > 0) {
                console.log(`\n⚠️  Warnings:`);
                result.warnings.forEach(warning => console.log(`   ${warning}`));
            }
            
            console.log(`\nChanges have been saved to magazine-content.json`);
        } else {
            console.log(`\n❌ Failed to apply scratch file: ${result.message}`);
            if (result.errors && result.errors.length > 0) {
                console.log(`\nErrors found:`);
                result.errors.forEach(error => console.log(`   ${error}`));
            }
        }
        rl.close();
    });
}

/**
 * Helper function to parse optional file path argument
 * @param {Array} args - Command line arguments
 * @param {string} optionName - Option name (e.g., '--export-scratch')
 * @param {string} defaultPath - Default path if not provided
 * @returns {string} File path
 */
function parseOptionalFilePath(args, optionName, defaultPath) {
    const filePathIndex = args.indexOf(optionName) + 1;
    return (filePathIndex < args.length && args[filePathIndex] && !args[filePathIndex].startsWith('--')) 
        ? args[filePathIndex] 
        : defaultPath;
}

function manageClaudeChats(rl, page = 1, pageSize = 10) {
    const chats = contentManager.content.claudeChats;
    const totalPages = Math.ceil(chats.length / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const chatsToShow = chats.slice(startIndex, endIndex);

    console.log('\n=== Manage Claude Chats ===');
    if (chats.length === 0) {
        console.log('No Claude chats found. Import them first (e.g., using a command or by ensuring `claudeChats` in `magazine-content.json` is populated).');
        rl.question('Press Enter to return to main menu...', () => startInteractiveSession());
        return;
    }

    chatsToShow.forEach((chat, index) => {
        const displayIndex = startIndex + index + 1;
        console.log(`${displayIndex}. [${chat.selected ? 'X' : ' '}] ${chat.title} (ID: ${chat.id.substring(0, 8)}...)`);
    });

    console.log(`\nPage ${page}/${totalPages}. Total chats: ${chats.length}`);
    console.log('Enter chat number to toggle selection, (N)ext page, (P)revious page, (B)ack to main menu:');

    rl.question('Your choice: ', (choice) => {
        const numChoice = parseInt(choice);
        // Check if the choice is a number corresponding to an item on the current page
        if (!isNaN(numChoice) && numChoice >= startIndex + 1 && numChoice <= Math.min(endIndex, chats.length)) {
            const chatToToggle = chats[numChoice - 1]; // numChoice is 1-based index in the full list
            if (chatToToggle) {
                contentManager.toggleClaudeChatSelection(chatToToggle.id);
            } else {
                // This case should ideally not be reached if logic is correct
                console.log('Error: Could not find the selected chat.');
            }
            manageClaudeChats(rl, page, pageSize); // Refresh current page
        } else if (choice.toLowerCase() === 'n') {
            manageClaudeChats(rl, Math.min(page + 1, totalPages), pageSize);
        } else if (choice.toLowerCase() === 'p') {
            manageClaudeChats(rl, Math.max(1, page - 1), pageSize);
        } else if (choice.toLowerCase() === 'b') {
            rl.close();
            startInteractiveSession(); // Go back to main menu
        } else {
            console.log('Invalid choice. Please try again.');
            manageClaudeChats(rl, page, pageSize); // Stay on current page
        }
    });
}


// Main CLI logic
export async function runCli() {
    const thisFile = resolve(fileURLToPath(import.meta.url));
    const pathPassedToNode = resolve(process.argv[1]);

    if (thisFile.includes(pathPassedToNode) || pathPassedToNode.includes('content_collector.js')) { // Adjusted condition
        const args = process.argv.slice(2);

        if (args.includes('--template')) {
            createTemplate();
        } else if (args.includes('--generate')) {
            // Check page limit before generation
            const pageInfo = contentManager.getPageLimitInfo();
            if (pageInfo.hasLimit && pageInfo.isAtLimit) {
                console.log(`⚠️  Magazine has ${pageInfo.currentPages} pages (limit: ${pageInfo.pageLimit}). Generating anyway...`);
            }
            magazineGenerator.generateMagazine()
                .then(path => console.log(`Magazine generated: ${path}`))
                .catch(error => console.error('Error:', error));
        } else if (args.includes('--page-limit')) {
            const limitIndex = args.indexOf('--page-limit') + 1;
            if (limitIndex < args.length && args[limitIndex] && !args[limitIndex].startsWith('--')) {
                const limit = parseInt(args[limitIndex]);
                if (limit > 0) {
                    contentManager.setPageLimit(limit);
                    const pageInfo = contentManager.getPageLimitInfo();
                    console.log(`Page limit set to ${limit} pages. Current content: ${pageInfo.currentPages} pages.`);
                } else if (limit === 0) {
                    contentManager.setPageLimit(0);
                    console.log('Page limit removed.');
                } else {
                    console.error('Error: Page limit must be a positive number or 0 to remove limit.');
                }
            } else {
                console.error('Error: --page-limit option requires a number.');
                console.log('Usage: node src/cli.js --page-limit <number>');
                console.log('       node src/cli.js --page-limit 0  # Remove limit');
                console.log('Examples:');
                console.log('  magazeen --page-limit 10    # Set 10 page limit');
                console.log('  magazeen --page-limit 0     # Remove page limit');
                console.log('  magazeen --template         # Create template');
                console.log('  magazeen --generate         # Generate magazine');
                console.log('  magazeen --import-claude <file.json>  # Import Claude chats from file');
                console.log('  magazeen --import-claude-url <url>    # Import Claude chats from URL');
            }
        } else if (args.includes('--import-claude')) {
            const filePathIndex = args.indexOf('--import-claude') + 1;
            if (filePathIndex < args.length && args[filePathIndex] && !args[filePathIndex].startsWith('--')) {
                const filePath = args[filePathIndex];
                console.log(`Importing Claude chats from: ${filePath}`);
                const importedCount = contentManager.importClaudeChatsFromFile(filePath);
                if (importedCount > 0) {
                    console.log(`Successfully imported ${importedCount} chats.`);
                } else {
                    console.log('No new chats were imported or an error occurred.');
                }
            } else {
                console.error('Error: --import-claude option requires a file path.');
                console.log('Usage: node src/cli.js --import-claude <path_to_claude_export.json>');
            }
        } else if (args.includes('--import-claude-url')) {
            const urlIndex = args.indexOf('--import-claude-url') + 1;
            if (urlIndex < args.length && args[urlIndex] && !args[urlIndex].startsWith('--')) {
                const url = args[urlIndex];
                console.log(`Importing Claude chats from URL: ${url}`);
                try {
                    const importedCount = await contentManager.importClaudeChatsFromUrl(url);
                    if (importedCount > 0) {
                        console.log(`Successfully imported ${importedCount} chats.`);
                    } else {
                        console.log('No new chats were imported or an error occurred.');
                    }
                } catch (error) {
                    console.error('Error importing from URL:', error.message);
                }
            } else {
                console.error('Error: --import-claude-url option requires a URL.');
                console.log('Usage: node src/cli.js --import-claude-url <url>');
                console.log('Examples:');
                console.log('  magazeen --import-claude-url https://example.com/chats.json');
                console.log('  magazeen --import-claude-url http://localhost:8000/claude_export.json');
<<<<<<< HEAD
            }
||||||| merged common ancestors
            }
||||||||| 14328ed
=========
=======
>>>>>>> cd62d1e9828aff9acea3447313c68ed4c778b0c5
        } else if (args.includes('--export-scratch')) {
            const filePath = parseOptionalFilePath(args, '--export-scratch', 'out/magazine-scratch.txt');
            
            console.log(`Exporting scratch file to: ${filePath}`);
            const result = scratchFileManager.exportToScratchFile(filePath);
            
            if (result.success) {
                console.log(`✅ Success! Exported ${result.selectedChats}/${result.totalChats} chats.`);
                console.log(`Edit the file and use --apply-scratch to update your selections.`);
            } else {
                console.error(`❌ Failed: ${result.message}`);
            }
        } else if (args.includes('--apply-scratch')) {
            const filePath = parseOptionalFilePath(args, '--apply-scratch', 'out/magazine-scratch.txt');
            
            console.log(`Applying scratch file from: ${filePath}`);
            const result = scratchFileManager.applyFromScratchFile(filePath);
            
            if (result.success) {
                console.log(`✅ Success! Updated ${result.totalChats} chats.`);
                console.log(`   Selected: ${result.selectedCount}, Deselected: ${result.deselectedCount}`);
                if (result.warnings && result.warnings.length > 0) {
                    result.warnings.forEach(warning => console.log(`⚠️  ${warning}`));
                }
            } else {
                console.error(`❌ Failed: ${result.message}`);
                if (result.errors && result.errors.length > 0) {
                    result.errors.forEach(error => console.error(`   ${error}`));
                }
            }
        } else {
            startInteractiveSession();
        }
    }
}

runCli();
