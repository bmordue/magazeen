import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { tmpdir } from 'os';

import { kv as vercelKv } from '@vercel/kv';

// Mock KV for local development if environment variables are missing
const store = new Map();
const mockKv = {
  get: async (key) => store.get(key),
  set: async (key, value, options) => {
    store.set(key, value);
    if (options?.ex) {
      setTimeout(() => store.delete(key), options.ex * 1000);
    }
  },
  del: async (key) => store.delete(key)
};

const kv = (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  ? vercelKv
  : mockKv;

const app = express();
const port = process.env.PORT || 3000;

import { readFile, unlink } from 'fs/promises';
import { ContentManager } from './contentManager.js';
import { ArticleGenerator } from './articleGenerator.js';
import { MagazineGenerator } from './magazineGenerator.js';
import { renderTemplate } from './templateRenderer.js';


// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ dest: tmpdir(), limits: { fileSize: 10 * 1024 * 1024 } }); // e.g., 10MB limit

app.get('/', (req, res) => {
  res.send(renderTemplate('home'));
});

export async function processUploadedFile(filePath, originalFilename) {
  const fileContent = await readFile(filePath, 'utf-8');
  const chatData = JSON.parse(fileContent);

  const chats = chatData.map((chat, index) => {
    const id = chat.uuid || `chat_${index}`;
    const title = chat.name || `Chat ${index + 1} (no name)`;
    return {
      id: id,
      title: title,
      originalChatData: chat
    };
  });

  await unlink(filePath);

  if (chats.length === 0) {
    throw new Error('No processable chats found in the uploaded file.');
  }

  const sessionId = crypto.randomUUID();
  await kv.set(sessionId, JSON.stringify(chats), { ex: 900 });

  return { sessionId, chats, originalFilename };
}

app.post('/upload', upload.single('chatExport'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send(renderErrorPage('No file uploaded. Please select a JSON file and try again.'));
  }

  if (req.file.mimetype !== 'application/json') {
    try {
      await unlink(req.file.path);
    } catch (unlinkError) {
      console.error('Error deleting non-JSON uploaded file:', unlinkError);
    }
    return res.status(400).send(renderErrorPage('Invalid file type. Only JSON files are allowed.'));
  }

  try {
    const { sessionId, chats, originalFilename } = await processUploadedFile(req.file.path, req.file.originalname);

    const chatListHtml = chats.map(chat => `
      <div class="chat-item">
        <label class="chat-item-label">
          <input type="checkbox" name="selectedChats" value="${chat.id}">
          <span class="chat-item-title">${chat.title}</span>
        </label>
      </div>
    `).join('');

    res.send(renderTemplate('select-chats', {
      sessionId,
      originalFilename,
      chatList: chatListHtml
    }));
  } catch (error) {
    console.error('Error processing file:', error);
    if (req.file && req.file.path) {
      try {
        await unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file after error:', unlinkError);
      }
    }
    res.status(500).send(renderErrorPage('Error processing uploaded file. It might be corrupted or not in the expected format.'));
  }
});

app.post('/generate-epub', async (req, res) => {
  const { selectedChats: selectedChatIds, sessionId } = req.body;
  let kvDataRetrieved = false; // Flag to ensure cleanup even if errors occur after retrieval

  if (!selectedChatIds || !sessionId) {
    return res.status(400).send(renderErrorPage('Missing selection or session information. Please try uploading and selecting again.'));
  }

  try {
    const storedChatsJson = await kv.get(sessionId);
    kvDataRetrieved = true; // Mark that we've attempted to get it, for cleanup purposes

    if (!storedChatsJson) {
      await kv.del(sessionId); // Clean up potentially empty/stale key
      return res.status(404).send(renderErrorPage('Chat data not found or session expired. Please upload your file again.'));
    }

    const allUploadedChats = JSON.parse(storedChatsJson);

    // Ensure selectedChatIds is always an array
    const chatIdsArray = Array.isArray(selectedChatIds) ? selectedChatIds : [selectedChatIds];

    const chatsToInclude = allUploadedChats.filter(chat => chatIdsArray.includes(chat.id));

    if (chatsToInclude.length === 0) {
      return res.status(400).send(renderErrorPage('No chats were selected to include in the EPUB. Please select at least one chat.'));
    }

    const contentManager = new ContentManager();
    const articleGenerator = new ArticleGenerator(contentManager);
    const magazineGenerator = new MagazineGenerator(contentManager, articleGenerator);

    for (const chat of chatsToInclude) {
      const title = chat.title;
      const messages = chat.originalChatData.chat_messages || [];
      const conversation = messages.map(msg => ({ sender: msg.sender, text: msg.text }));

      if (conversation.length === 0) {
        console.warn(`Skipping chat "${title}" – no messages to include.`);
        continue;
      }

      const insights = `Highlights from chat: ${title}`; // Generic insights
      const category = 'Chat Exports'; // Generic category

      contentManager.addChatHighlight(title, conversation, insights, category);
    }

    const epubFilePath = await magazineGenerator.generateMagazine();

    await kv.del(sessionId);
    kvDataRetrieved = false;

    res.download(epubFilePath, path.basename(epubFilePath), async (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
            res.status(500).send(renderErrorPage('Error sending the EPUB file.'));
        }
      }
      try {
        await unlink(epubFilePath);
      } catch (unlinkErr) {
        console.error('Error deleting EPUB file:', unlinkErr);
      }
    });

  } catch (error) {
    console.error('Error generating EPUB:', error);
    if (sessionId && kvDataRetrieved) {
      try {
        await kv.del(sessionId);
      } catch (kvDeleteError) {
        console.error('Error cleaning up KV session after EPUB generation error:', kvDeleteError);
      }
    }
    res.status(500).send(renderErrorPage('An unexpected error occurred while generating the EPUB. Please check the server logs.'));
  }
});

// Helper function to render a consistent error page
function renderErrorPage(message) {
  return renderTemplate('error', { message });
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

export default app;
