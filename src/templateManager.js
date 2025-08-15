import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const OUTPUT_DIR = 'out';
const CONTENT_FILE_PATH = path.join(OUTPUT_DIR, 'magazine-content.json');


// Create a simple template generator for new users
export function createTemplate() {
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

    try {
        // Ensure the output directory exists
        if (!existsSync(OUTPUT_DIR)) {
            mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        writeFileSync(CONTENT_FILE_PATH, JSON.stringify(template, null, 2));
        console.log(`Template created! Edit ${CONTENT_FILE_PATH} to customize your magazine.`);
    } catch (error) {
        console.error(`Error creating template file at ${CONTENT_FILE_PATH}.`, error);
    }
}
