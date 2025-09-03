import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

const MAX_RECENT_INTERESTS = 5;
const MAX_RECENT_HIGHLIGHTS = 3;

// Initialize DOMPurify with jsdom for server-side use
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Configure DOMPurify for stricter security
const SANITIZE_CONFIG = {
    ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'u', 'a', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'div', 'span', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover'],
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea', 'select', 'button'],
};

// Robust HTML sanitization using DOMPurify
function sanitizeHTML(text) {
    return DOMPurify.sanitize(String(text), SANITIZE_CONFIG);
}


export class ArticleGenerator {
    constructor(contentManager) {
        this.contentManager = contentManager;
    }

    generateInterestArticle() {
        if (this.contentManager.content.interests.length === 0) {
            console.log('No interests to generate article from');
            return "";
        }

        const recentInterests = this.contentManager.content.interests
            .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            .slice(0, MAX_RECENT_INTERESTS);

        if (recentInterests.length === 0) {
            return "";
        }

        const content = `
        <p>This month, several topics have captured my attention and sparked deeper exploration:</p>

        ${recentInterests.map(interest => `
        <h2>${sanitizeHTML(interest.topic)}</h2>
        <p><strong>Priority:</strong> ${sanitizeHTML(interest.priority.charAt(0).toUpperCase() + interest.priority.slice(1))}</p>
        <p>${sanitizeHTML(interest.description)}</p>
        `).join('')}

        <h2>Reflection</h2>
        <p>These interests reflect my ongoing curiosity about ${recentInterests.map(i => sanitizeHTML(i.topic.toLowerCase())).join(', ')}.
        I plan to explore these topics further in upcoming conversations and research.</p>
        `;

        return this.contentManager.addArticle(
            "Current Interests & Explorations",
            content,
            "Personal Growth",
            null,
            ["interests", "exploration", "learning"]
        );
    }

    generateChatHighlightsArticle() {
        if (this.contentManager.content.chatHighlights.length === 0) {
            console.log('No chat highlights to generate article from');
            return "";
        }

        const recentHighlights = this.contentManager.content.chatHighlights
            .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            .slice(0, MAX_RECENT_HIGHLIGHTS);

        if (recentHighlights.length === 0) {
            return "";
        }

        const content = `
        <p>Here are some of the most insightful conversations and discoveries from my recent chats with Claude:</p>

        ${recentHighlights.map(highlight => `
        <h2>${sanitizeHTML(highlight.title)}</h2>
        <p><em>Category: ${sanitizeHTML(highlight.category)}</em></p>

        <h3>Key Insights</h3>
        <p>${sanitizeHTML(highlight.insights)}</p>

        <h3>Notable Exchange</h3>
        <blockquote>${sanitizeHTML(highlight.conversation)}</blockquote>
        `).join('')}

        <h2>Reflections</h2>
        <p>These conversations highlight the value of AI as a thinking partner, helping me explore complex topics
        and gain new perspectives on familiar subjects.</p>
        `;

        return this.contentManager.addArticle(
            "Insights from AI Conversations",
            content,
            "AI & Learning",
            "Claude AI",
            ["conversations", "insights", "learning"]
        );
    }
}
