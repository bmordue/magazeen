# Personal EPUB Magazine Generator

Create beautiful, professional EPUB magazines from your interests and conversations with Claude. Generate a new issue every month with a simple, reproducible process.

## Quick Start

### 1. Setup
```bash
# Create a new directory for your magazine project
mkdir my-magazine && cd my-magazine

# Create package.json
npm init -y

# Install required dependency
npm install jszip

# Save the generator files (epub-generator.js and content-collector.js)
# Copy the code from the artifacts into these files
```

### 2. Create Your First Issue
```bash
# Generate a template to get started
node content-collector.js --template

# Start adding content interactively
node content-collector.js

# Or generate magazine from existing content
node content-collector.js --generate
```

## File Structure
```
my-magazine/
├── epub-generator.js          # Core EPUB generation logic
├── content-collector.js       # Content management and CLI
├── magazine-content.json      # Your content database
├── package.json              # Node.js dependencies
└── magazine-2024-07.epub     # Generated magazines
```

## Monthly Workflow

### Throughout the Month
1. **Collect Interests**: When you discover something interesting, add it:
   ```bash
   node content-collector.js
   # Choose option 2: Add an interest
   ```

2. **Save Chat Highlights**: After meaningful conversations with Claude:
   ```bash
   node content-collector.js
   # Choose option 3: Add a chat highlight
   ```

3. **Write Articles**: Create articles about topics you're exploring:
   ```bash
   node content-collector.js
   # Choose option 1: Add an article
   ```

### End of Month
Generate your magazine:
```bash
node content-collector.js --generate
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
You can also use the generator programmatically:

```javascript
const EPUBMagazineGenerator = require('./epub-generator');

const generator = new EPUBMagazineGenerator();
generator.initializeEPUB("My Magazine", "Author", "Description");

generator.addArticle(
    "Article Title",
    "<p>Article content with HTML...</p>",
    "Author Name",
    "Category"
);

generator.generateEPUB('./my-magazine.epub');
```

### Batch Processing
Process multiple articles from files:

```javascript
const fs = require('fs');
const collector = new ContentCollector();

// Read articles from markdown files
const articles = fs.readdirSync('./articles')
    .filter(file => file.endsWith('.md'))
    .map(file => {
        const content = fs.readFileSync(`./articles/${file}`, 'utf8');
        const title = file.replace('.md', '');
        return { title, content };
    });

articles.forEach(article => {
    collector.addArticle(article.title, article.content);
});
```

## Reading Your Magazine

Your generated EPUB can be read on:
- **Mobile**: Apple Books, Google Play Books, Amazon Kindle app
- **Desktop**: Calibre, Adobe Digital Editions, Apple Books
- **E-readers**: Kindle (convert with Calibre), Kobo, other EPUB readers
- **Web**: Various online EPUB readers

## Tips for Great Magazines

1. **Consistency**: Try to generate at the same time each month
2. **Quality over Quantity**: Focus on meaningful content
3. **Visual Appeal**: Use headings, blockquotes, and formatting
4. **Personal Voice**: Write in your authentic style
5. **Archive Everything**: Keep all your issues for future reference

## Troubleshooting

### Common Issues
- **Missing jszip**: Run `npm install jszip`
- **Permission errors**: Make sure you have write access to the directory
- **Large content**: Very long articles might need chunking

### File Validation
Test your EPUB files with:
- [EPUB Validator](https://validator.idpf.org/)
- Calibre's built-in validation
- Various EPUB readers

## Monthly Checklist

- [ ] Review conversations from the month
- [ ] Add 2-3 chat highlights
- [ ] Note 3-5 new interests
- [ ] Write 1-2 original articles
- [ ] Generate magazine
- [ ] Review and read the issue
- [ ] Archive previous month's raw content

---

**Happy magazine making!** 📚✨

This system grows with you - the more you use it, the richer your personal knowledge archive becomes.