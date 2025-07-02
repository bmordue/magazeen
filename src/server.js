import express from 'express';
import multer from 'multer';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

import fs from 'fs/promises';
import { ContentManager } from './contentManager.js';
import { ArticleGenerator } from './articleGenerator.js';
import { MagazineGenerator } from './magazineGenerator.js';


// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } }); // e.g., 10MB limit

// Simple in-memory storage for chat data. NOT production-ready.
if (!global.uploadedChats) {
  global.uploadedChats = {};
}

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
      await fs.unlink(req.file.path);
    } catch (unlinkError) {
      console.error('Error deleting non-JSON uploaded file:', unlinkError);
    }
    return res.status(400).send(renderErrorPage('Invalid file type. Only JSON files are allowed.'));
  }

  try {
    const filePath = req.file.path;
    const fileContent = await fs.readFile(filePath, 'utf-8');
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

    // To pass the chat data to the next step (/generate-epub),
    // we can't put it all in the HTML form for large exports.
    // We'll temporarily store it on the server.
    // A more robust solution would use a session or a temporary database.
    // For simplicity here, we'll use a global variable. This is NOT production-ready.
    // It will only handle one user at a time.
    if (!global.uploadedChats) {
      global.uploadedChats = {};
    }
    // Store the processed chats under the original filename to retrieve later
    // This assumes filenames are unique enough for this simple temporary storage.
    global.uploadedChats[req.file.originalname] = chats;


    // Clean up the uploaded file
    await fs.unlink(filePath);

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
          <input type="hidden" name="originalFilename" value="${req.file.originalname}">
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
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file after error:', unlinkError);
      }
    }
    res.status(500).send(renderErrorPage('Error processing uploaded file. It might be corrupted or not in the expected format.'));
  }
});

app.post('/generate-epub', async (req, res) => {
  try {
    const { selectedChats: selectedChatIds, originalFilename } = req.body;

    if (!selectedChatIds || !originalFilename) {
      return res.status(400).send(renderErrorPage('Missing selection or filename. Please try uploading and selecting again.'));
    }

    const allUploadedChats = global.uploadedChats[originalFilename];
    if (!allUploadedChats) {
      return res.status(404).send(renderErrorPage('Chat data not found. This could be due to a server restart or timeout. Please upload your file again.'));
    }

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

    // Clean up the stored chat data for this file
    delete global.uploadedChats[originalFilename];

    res.download(epubFilePath, path.basename(epubFilePath), async (err) => {
      if (err) {
        console.error('Error sending file:', err);
        // Important: Cannot send another response if headers already sent by res.download
        // However, if res.download fails before sending data, an error page could be sent.
        // For simplicity, we're logging. A robust app might try to send an error page if possible.
        if (!res.headersSent) {
            res.status(500).send(renderErrorPage('Error sending the EPUB file.'));
        }
        return; // Stop further processing in this callback
      }
      // Clean up the generated EPUB file after sending
      try {
        await fs.unlink(epubFilePath);
      } catch (unlinkErr) {
        console.error('Error deleting EPUB file:', unlinkErr);
      }
    });

  } catch (error) {
    console.error('Error generating EPUB:', error);
    // Clean up stored chat data in case of an error during generation
    if (req.body && req.body.originalFilename && global.uploadedChats[req.body.originalFilename]) {
        delete global.uploadedChats[req.body.originalFilename];
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
