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
                promptForArticle(rl);
                break;
            case '2':
                promptForInterest(rl);
                break;
            case '3':
                promptForChatHighlight(rl);
                break;
            case '4':
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
            case '5':
                showCurrentContent();
                rl.close();
                break;
            case '6':
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
