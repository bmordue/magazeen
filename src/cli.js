import readline from 'readline';
import { ContentManager } from './contentManager.js';
import { ArticleGenerator } from './articleGenerator.js';
import { MagazineGenerator } from './magazineGenerator.js';
import { createTemplate } from './templateManager.js';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const contentManager = new ContentManager();
const articleGenerator = new ArticleGenerator(contentManager);
const magazineGenerator = new MagazineGenerator(contentManager, articleGenerator);

// Interactive CLI interface
export function startInteractiveSession() {
    console.log('\n=== Personal Magazine Content Collector ===');
    console.log('What would you like to do?');
    console.log('1. Add an article');
    console.log('2. Add an interest');
    console.log('3. Add a chat highlight');
    console.log('4. Manage Claude Chats');
    console.log('5. Generate magazine');
    console.log('6. View current content');
    console.log('7. Exit');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('\nEnter your choice (1-7): ', (choice) => {
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
    console.log(`Articles: ${contentManager.content.articles.length}`);
    console.log(`Interests: ${contentManager.content.interests.length}`);
    console.log(`Chat Highlights: ${contentManager.content.chatHighlights.length}`);
    console.log(`Claude Chats: ${contentManager.content.claudeChats.length} (Selected: ${contentManager.content.claudeChats.filter(c => c.selected).length})`);

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
export function runCli() {
    const thisFile = resolve(fileURLToPath(import.meta.url));
    const pathPassedToNode = resolve(process.argv[1]);

    if (thisFile.includes(pathPassedToNode) || pathPassedToNode.includes('content_collector.js')) { // Adjusted condition
        const args = process.argv.slice(2);

        if (args.includes('--template')) {
            createTemplate();
        } else if (args.includes('--generate')) {
            magazineGenerator.generateMagazine()
                .then(path => console.log(`Magazine generated: ${path}`))
                .catch(error => console.error('Error:', error));
        } else {
            startInteractiveSession();
        }
    }
}

runCli();
