# Personal EPUB Magazine Generator

Create beautiful, professional EPUB magazines from your interests and conversations with Claude. Generate a new issue every month with a simple, reproducible process.

## Quick Start

### 1. Setup
```bash
npm i
```

### 2. Create Your First Issue
```bash
# Generate a template to get started
magazeen --template

# Start adding content interactively
magazeen

# Or generate magazine from existing content
magazeen --generate
```

## Web Interface (New)

A web interface is available for uploading JSON chat exports (e.g., from Claude), selecting specific chats, and downloading the generated EPUB.

### 1. Start the Web Server
```bash
npm run start:web
```
This will typically start the server on `http://localhost:3000`.

### 2. Using the Web Interface
- Open your browser and navigate to the server address (e.g., `http://localhost:3000`).
- You will see an upload form. Select your JSON chat export file.
- After uploading, you'll be presented with a list of chats found in the file.
- Select the chats you want to include in your EPUB.
- Click "Generate EPUB". The EPUB file will be compiled and downloaded by your browser.

**Note:** The web interface currently supports the Claude JSON export format. Uploaded files are processed and then deleted from the server; generated EPUBs are also deleted after download.

## File Structure
```
my-magazine/
├── src/
│   ├── cli.js                 # Command Line Interface
│   ├── contentManager.js      # Manages content (articles, interests, highlights)
│   ├── magazineGenerator.js   # Core EPUB generation logic
│   ├── articleGenerator.js    # Handles article formatting for EPUB
│   └── templateManager.js     # Manages the content template
├── out/
│   ├── magazine-content.json  # Your content database (default location)
│   └── magazine-2024-07.epub # Generated magazines (example location)
├── package.json              # Node.js dependencies
```

## Monthly Workflow

### Throughout the Month
Launch the interactive tool by running:
```bash
magazeen
```
Then choose from the following options:

1. **Write Articles**:
   - Choose option 1: Add an article.
   - Follow the prompts to add your title, category, author, and content.

2. **Collect Interests**:
   - Choose option 2: Add an interest.
   - Input the topic, description, and priority.

3. **Save Chat Highlights**:
   - Choose option 3: Add a chat highlight.
   - Provide a title, category, conversation excerpt, and key insights.

4. **Generate Magazine**:
   - Choose option 4: Generate magazine.
   - This creates the magazine.
5. **View Current Content**:
   - Choose option 5: View current content.
   - See a summary of your collected articles, interests, and highlights.

### End of Month
Generate your magazine using the interactive tool (option 4) or directly:
```bash
magazeen --generate
```

This creates an EPUB file like `magazine-2024-07.epub` that you can:
- Read on any device (phones, tablets, e-readers, computers)
- Share with friends
- Archive for future reference

## Content Types

### Articles
Full articles you write about any topic. Can include:
- HTML formatting (headings, lists, blockquotes)
- Categories for organization
- Author attribution
- Word count tracking

### Interests
Track topics you want to explore further:
- Topic name and description
- Priority levels (low/medium/high)
- Automatic date tracking

### Chat Highlights
Save meaningful conversations:
- Conversation excerpts
- Key insights extracted
- Categorization
- Context preservation

## Customization

### Magazine Metadata
Edit `magazine-content.json` to customize:
```json
{
  "metadata": {
    "title": "Your Magazine Name",
    "author": "Your Name",
    "description": "Your custom description"
  }
}
```

### Styling
The generator includes professional magazine styling with:
- Beautiful cover pages with gradients
- Responsive design
- Print-optimized layouts
- Magazine-style typography
- Category-based color coding

### Categories
Use meaningful categories like:
- Technology
- Personal Growth
- Cooking
- Reading
- Travel
- Health & Fitness
- Creative Projects

## Advanced Usage

### Direct Programming
You can use the modules programmatically to manage content and generate magazines. Make sure the `./out` directory exists or create it.

```javascript
import { ContentManager } from './src/contentManager.js';
import { ArticleGenerator } from './src/articleGenerator.js';
import { MagazineGenerator } from './src/magazineGenerator.js';
import * as fs from 'fs'; // Node.js file system module

// Ensure output directory exists for content file and EPUB
if (!fs.existsSync('./out')){
    fs.mkdirSync('./out', { recursive: true });
}

// 1. Initialize ContentManager.
//    It loads from 'out/magazine-content.json' by default, or creates it.
//    You can specify a custom path: new ContentManager('out/my-custom-content.json');
const contentManager = new ContentManager();

// 2. Add content programmatically
contentManager.addArticle(
    "Programmatic Article",
    "<p>This is content added via code.</p>",
    "Technology",
    "Scripter"
);
contentManager.addInterest("Advanced JavaScript", "Exploring new JS features", "high");

// 3. Initialize ArticleGenerator and MagazineGenerator
const articleGenerator = new ArticleGenerator(contentManager);
const magazineGenerator = new MagazineGenerator(contentManager, articleGenerator);

// 4. Generate the magazine
//    The magazine file will be saved in the './out' directory.
magazineGenerator.generateMagazine()
    .then(path => console.log(`Magazine generated at: ${path}`))
    .catch(error => console.error('Error generating magazine:', error));
```

### Batch Processing
Process multiple articles from local files (e.g., Markdown files in a directory).

```javascript
import * as fs from 'fs';
import { ContentManager } from './src/contentManager.js';

// Initialize ContentManager (uses 'out/magazine-content.json' by default)
const contentManager = new ContentManager();

const articlesDir = './my_markdown_articles'; // Create this directory and put .md files in it

if (fs.existsSync(articlesDir)) {
    const articleFiles = fs.readdirSync(articlesDir)
        .filter(file => file.endsWith('.md'));

    console.log(`Found ${articleFiles.length} markdown files in ${articlesDir}.`);

    articleFiles.forEach(file => {
const filePath = path.join(articlesDir, file);
        const markdownContent = fs.readFileSync(filePath, 'utf8');
        // For simplicity, using filename (without .md) as title.
        // You might parse frontmatter for title, category, author.
        const title = file.replace(/\.md$/, '');

        // Convert Markdown to HTML (basic example, consider a library for robust conversion)
        // For this example, we'll assume content is already HTML or simple text.
        // If you have Markdown, you'd convert it to HTML here.
        // For now, let's wrap it in <p> if it's not HTML already.
        const htmlContent = markdownContent.startsWith('<') ? markdownContent : `<p>${markdownContent.replace(/\n/g, '</p><p>')}</p>`;

        contentManager.addArticle(
            title,
            htmlContent,
            "Batch Import", // Default category
            "Batch Script"  // Default author
        );
    });
    console.log(`Successfully processed and added ${articleFiles.length} articles.`);
} else {
    console.warn(`Directory ${articlesDir} not found. Create it and add Markdown files to test batch processing.`);
}
```

