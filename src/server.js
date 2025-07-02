import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { kv } from '@vercel/kv';
import { tmpdir } from 'os';

const app = express();
const port = process.env.PORT || 3000;

import fs from 'fs/promises'; // fs.promises is used for unlinking files
import { readFile, unlink } from 'fs/promises';
import { ContentManager } from './contentManager.js';
import { ArticleGenerator } from './articleGenerator.js';
import { MagazineGenerator } from './magazineGenerator.js';


// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ dest: tmpdir(), limits: { fileSize: 10 * 1024 * 1024 } }); // e.g., 10MB limit

// WARNING: Simple in-memory storage for chat data.
// This is NOT production-ready for serverless environments like Vercel. (Comment being removed as global state is removed)
// Global state `global.uploadedChats` has been replaced with Vercel KV.

// Ensure the /tmp/uploads directory exists if it doesn't.
// This is generally good practice, though multer might create it.
// fs.mkdir is not directly used here as multer handles directory creation.
// However, for Vercel, /tmp is usually available.
// We should ensure this doesn't cause issues if run locally where /tmp/uploads might not exist
// or have correct permissions without manual creation. Multer should handle this.
// For local dev, you might need to create 'uploads/' or '/tmp/uploads/' manually if multer doesn't.

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Upload Chat Export - Magazeen</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <h1>Upload Chat Export</h1>
      <form action="/upload" method="post" enctype="multipart/form-data">
        <input type="file" name="chatExport" accept=".json" required>
        <button type="submit">Upload and Select Chats</button>
      </form>
    </body>
    </html>
  `);
});

app.post('/upload', upload.single('chatExport'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send(renderErrorPage('No file uploaded. Please select a JSON file and try again.'));
  }

  // Check if the file is JSON
  if (req.file.mimetype !== 'application/json') {
    // Clean up the wrongly uploaded file
    try {
      await unlink(req.file.path);
    } catch (unlinkError) {
      console.error('Error deleting non-JSON uploaded file:', unlinkError);
    }
    return res.status(400).send(renderErrorPage('Invalid file type. Only JSON files are allowed.'));
  }

  try {
    const filePath = req.file.path;
    const fileContent = await readFile(filePath, 'utf-8');
    const chatData = JSON.parse(fileContent);

    // Assuming Claude JSON export format
    // chatData is an array of chat objects.
    // Each chat object has 'uuid' and 'name'.
    const chats = chatData.map((chat, index) => {
      const id = chat.uuid || `chat_${index}`;
      const title = chat.name || `Chat ${index + 1} (no name)`;
      return {
        id: id,
        title: title,
        // Store the original chat data to pass to the EPUB generation step
        originalChatData: chat
      };
    });

    // Clean up the uploaded file from /tmp first
    await fs.unlink(filePath);

    if (chats.length === 0) {
      return res.status(400).send(renderErrorPage('No processable chats found in the uploaded file. Please check the file content.'));
    }

    const sessionId = crypto.randomUUID();
    try {
      await kv.set(sessionId, JSON.stringify(chats), { ex: 900 }); // 15 minutes expiry
    } catch (kvError) {
      console.error('KV Set Error in /upload:', kvError);
      return res.status(500).send(renderErrorPage('Could not save session data. Please try again.'));
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Select Chats - Magazeen</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <h1>Select Chats to Include</h1>
        <form action="/generate-epub" method="post">
          <input type="hidden" name="sessionId" value="${sessionId}">
          <input type="hidden" name="originalFilename" value="${req.file.originalname}"> {/* Retain for potential use in EPUB metadata, though not strictly needed for KV logic */}
          ${chats.map(chat => `
            <div>
              <input type="checkbox" name="selectedChats" value="${chat.id}" id="${chat.id}">
              <label for="${chat.id}">${chat.title}</label>
            </div>
          `).join('')}
          <button type="submit">Generate EPUB</button>
        </form>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error processing file:', error);
    // Clean up the uploaded file in case of an error
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
  const { selectedChats: selectedChatIds, originalFilename, sessionId } = req.body;
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

    // Add selected chats as articles/highlights to contentManager
    // The existing CLI uses `addChatHighlight(title, conversation, insights, category)`
    // We need to adapt the Claude chat structure to this.
    // For now, we'll use the chat name as title and concatenate messages as conversation.
    // Insights and category can be generic or derived if possible.
    for (const chat of chatsToInclude) {
      const title = chat.title;
      // Concatenate messages, differentiating human and assistant
      const conversation = chat.originalChatData.chat_messages
        .map(msg => `${msg.sender === 'human' ? 'Human' : 'Assistant'}: ${msg.text}`)
        .join('\n\n');
      const insights = `Highlights from chat: ${title}`; // Generic insights
      const category = 'Chat Exports'; // Generic category

      contentManager.addChatHighlight(title, conversation, insights, category);
    }

    const epubFilePath = await magazineGenerator.generateMagazine();

    // Data has been used, clean up from KV
    await kv.del(sessionId);
    kvDataRetrieved = false; // Mark as cleaned up

    res.download(epubFilePath, path.basename(epubFilePath), async (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
            res.status(500).send(renderErrorPage('Error sending the EPUB file.'));
        }
      }
      // Clean up the generated EPUB file after sending
      try {
        await unlink(epubFilePath);
      } catch (unlinkErr) {
        console.error('Error deleting EPUB file:', unlinkErr);
      }
    });

  } catch (error) {
    console.error('Error generating EPUB:', error);
    // If an error occurred and we had retrieved data from KV, try to clean it up
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
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error - Magazeen</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <h1>An Error Occurred</h1>
      <div class="error-message">${message}</div>
      <a href="/">Go back to upload</a>
    </body>
    </html>
  `;
}

// Start the server only if this script is run directly
// This allows importing 'app' in test files without starting the server.
if (process.env.NODE_ENV !== 'test') { // A common way to check, or use import.meta.url
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

export default app; // Export the app for testing
