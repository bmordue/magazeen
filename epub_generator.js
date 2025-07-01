#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

class EPUBMagazineGenerator {
    constructor() {
        this.zip = new JSZip();
        this.chapters = [];
        this.images = [];
        this.currentDate = new Date();
        this.issueNumber = this.currentDate.getMonth() + 1;
        this.year = this.currentDate.getFullYear();
    }

    // Initialize EPUB structure
    initializeEPUB(title, author, description) {
        this.title = title;
        this.author = author;
        this.description = description;
        
        // Create required EPUB structure
        this.zip.file("mimetype", "application/epub+zip");
        
        // META-INF folder
        this.zip.folder("META-INF");
        this.zip.file("META-INF/container.xml", this.generateContainerXML());
        
        // OEBPS folder for content
        this.oebps = this.zip.folder("OEBPS");
        
        // Add CSS
        this.oebps.file("styles.css", this.generateCSS());
        
        return this;
    }

    // Add a chapter/article to the magazine
    addArticle(title, content, author = null, category = "General") {
        const chapterIndex = this.chapters.length + 1;
        const filename = `chapter${chapterIndex}.xhtml`;
        
        const chapter = {
            title,
            filename,
            content,
            author,
            category,
            index: chapterIndex
        };
        
        this.chapters.push(chapter);
        this.oebps.file(filename, this.generateChapterXHTML(chapter));
        
        return this;
    }

    // Add image to the EPUB
    addImage(imagePath, filename) {
        const imageData = fs.readFileSync(imagePath);
        this.oebps.file(`images/${filename}`, imageData);
        this.images.push(filename);
        return this;
    }

    // Generate the complete EPUB
    async generateEPUB(outputPath) {
        // Generate content files
        this.oebps.file("content.opf", this.generateOPF());
        this.oebps.file("toc.ncx", this.generateNCX());
        this.oebps.file("index.xhtml", this.generateIndexXHTML());
        this.oebps.file("toc.xhtml", this.generateTOCXHTML());
        
        // Generate the ZIP file
        const content = await this.zip.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
            compressionOptions: { level: 9 }
        });
        
        fs.writeFileSync(outputPath, content);
        return outputPath;
    }

    generateContainerXML() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`;
    }

    generateOPF() {
        const manifestItems = [
            '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
            '<item id="css" href="styles.css" media-type="text/css"/>',
            '<item id="index" href="index.xhtml" media-type="application/xhtml+xml"/>',
            '<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/>'
        ];

        const spineItems = [
            '<itemref idref="index"/>',
            '<itemref idref="toc"/>'
        ];

        this.chapters.forEach(chapter => {
            manifestItems.push(`<item id="chapter${chapter.index}" href="${chapter.filename}" media-type="application/xhtml+xml"/>`);
            spineItems.push(`<itemref idref="chapter${chapter.index}"/>`);
        });

        this.images.forEach((image, index) => {
            const ext = path.extname(image).toLowerCase();
            const mediaType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                             ext === '.png' ? 'image/png' : 'image/gif';
            manifestItems.push(`<item id="img${index}" href="images/${image}" media-type="${mediaType}"/>`);
        });

        return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:title>${this.title} - Issue ${this.issueNumber}</dc:title>
        <dc:creator opf:role="aut">${this.author}</dc:creator>
        <dc:identifier id="bookid">${this.generateUUID()}</dc:identifier>
        <dc:language>en</dc:language>
        <dc:date>${this.currentDate.toISOString().split('T')[0]}</dc:date>
        <dc:description>${this.description}</dc:description>
        <meta name="cover" content="cover-image"/>
    </metadata>
    <manifest>
        ${manifestItems.join('\n        ')}
    </manifest>
    <spine toc="ncx">
        ${spineItems.join('\n        ')}
    </spine>
</package>`;
    }

    generateNCX() {
        const navPoints = this.chapters.map((chapter, index) => `
        <navPoint id="navpoint-${index + 3}" playOrder="${index + 3}">
            <navLabel><text>${chapter.title}</text></navLabel>
            <content src="${chapter.filename}"/>
        </navPoint>`).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="${this.generateUUID()}"/>
        <meta name="dtb:depth" content="1"/>
        <meta name="dtb:totalPageCount" content="0"/>
        <meta name="dtb:maxPageNumber" content="0"/>
    </head>
    <docTitle><text>${this.title} - Issue ${this.issueNumber}</text></docTitle>
    <navMap>
        <navPoint id="navpoint-1" playOrder="1">
            <navLabel><text>Cover</text></navLabel>
            <content src="index.xhtml"/>
        </navPoint>
        <navPoint id="navpoint-2" playOrder="2">
            <navLabel><text>Table of Contents</text></navLabel>
            <content src="toc.xhtml"/>
        </navPoint>${navPoints}
    </navMap>
</ncx>`;
    }

    generateIndexXHTML() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${this.title}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
</head>
<body class="cover">
    <div class="cover-container">
        <h1 class="magazine-title">${this.title}</h1>
        <div class="issue-info">
            <p class="issue-number">Issue ${this.issueNumber}</p>
            <p class="issue-date">${this.currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            })}</p>
        </div>
        <div class="cover-description">
            <p>${this.description}</p>
        </div>
        <div class="article-count">
            <p>${this.chapters.length} Articles</p>
        </div>
    </div>
</body>
</html>`;
    }

    generateTOCXHTML() {
        const tocItems = this.chapters.map(chapter => 
            `<li class="toc-item">
                <a href="${chapter.filename}" class="toc-link">
                    <span class="toc-title">${chapter.title}</span>
                    <span class="toc-category">${chapter.category}</span>
                    ${chapter.author ? `<span class="toc-author">by ${chapter.author}</span>` : ''}
                </a>
            </li>`
        ).join('\n            ');

        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Table of Contents</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
</head>
<body>
    <div class="toc-container">
        <h1 class="toc-header">Table of Contents</h1>
        <ul class="toc-list">
            ${tocItems}
        </ul>
    </div>
</body>
</html>`;
    }

    generateChapterXHTML(chapter) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${chapter.title}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
</head>
<body>
    <article class="article">
        <header class="article-header">
            <h1 class="article-title">${chapter.title}</h1>
            <div class="article-meta">
                <span class="article-category">${chapter.category}</span>
                ${chapter.author ? `<span class="article-author">by ${chapter.author}</span>` : ''}
            </div>
        </header>
        <div class="article-content">
            ${chapter.content}
        </div>
    </article>
</body>
</html>`;
    }

    generateCSS() {
        return `/* EPUB Magazine Styles */

/* Reset and base styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Georgia, "Times New Roman", serif;
    line-height: 1.6;
    color: #333;
    max-width: 100%;
    margin: 0 auto;
    padding: 20px;
    background-color: #fefefe;
}

/* Cover page styles */
.cover {
    text-align: center;
    padding: 40px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cover-container {
    max-width: 600px;
}

.magazine-title {
    font-size: 3em;
    font-weight: bold;
    margin-bottom: 30px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    letter-spacing: 2px;
}

.issue-info {
    margin-bottom: 40px;
}

.issue-number {
    font-size: 1.5em;
    font-weight: bold;
    margin-bottom: 10px;
}

.issue-date {
    font-size: 1.2em;
    opacity: 0.9;
}

.cover-description {
    font-size: 1.1em;
    margin-bottom: 30px;
    opacity: 0.9;
    line-height: 1.8;
}

.article-count {
    font-size: 1em;
    opacity: 0.8;
    border-top: 1px solid rgba(255,255,255,0.3);
    padding-top: 20px;
}

/* Table of Contents */
.toc-container {
    max-width: 800px;
    margin: 0 auto;
}

.toc-header {
    font-size: 2.5em;
    text-align: center;
    margin-bottom: 40px;
    color: #2c3e50;
    border-bottom: 3px solid #3498db;
    padding-bottom: 20px;
}

.toc-list {
    list-style: none;
}

.toc-item {
    margin-bottom: 20px;
    border-left: 4px solid #3498db;
    padding-left: 20px;
    transition: all 0.3s ease;
}

.toc-item:hover {
    border-left-color: #e74c3c;
    background-color: #f8f9fa;
    padding: 10px 20px;
    margin: 10px 0;
}

.toc-link {
    text-decoration: none;
    color: inherit;
    display: block;
}

.toc-title {
    display: block;
    font-size: 1.3em;
    font-weight: bold;
    color: #2c3e50;
    margin-bottom: 5px;
}

.toc-category {
    display: inline-block;
    background-color: #3498db;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
    margin-right: 10px;
}

.toc-author {
    font-style: italic;
    color: #7f8c8d;
    font-size: 0.9em;
}

/* Article styles */
.article {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.article-header {
    margin-bottom: 40px;
    text-align: center;
    border-bottom: 2px solid #ecf0f1;
    padding-bottom: 30px;
}

.article-title {
    font-size: 2.5em;
    color: #2c3e50;
    margin-bottom: 20px;
    line-height: 1.2;
}

.article-meta {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
}

.article-category {
    background-color: #e74c3c;
    color: white;
    padding: 5px 15px;
    border-radius: 20px;
    font-size: 0.9em;
    font-weight: bold;
}

.article-author {
    font-style: italic;
    color: #7f8c8d;
    font-size: 1.1em;
}

.article-content {
    font-size: 1.1em;
    line-height: 1.8;
}

.article-content h1, .article-content h2, .article-content h3 {
    color: #2c3e50;
    margin: 30px 0 20px 0;
    line-height: 1.3;
}

.article-content h1 {
    font-size: 2em;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
}

.article-content h2 {
    font-size: 1.6em;
    color: #34495e;
}

.article-content h3 {
    font-size: 1.3em;
    color: #7f8c8d;
}

.article-content p {
    margin-bottom: 20px;
    text-align: justify;
}

.article-content blockquote {
    border-left: 4px solid #3498db;
    padding-left: 20px;
    margin: 30px 0;
    font-style: italic;
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 0 8px 8px 0;
}

.article-content ul, .article-content ol {
    margin: 20px 0;
    padding-left: 30px;
}

.article-content li {
    margin-bottom: 10px;
}

.article-content code {
    background-color: #f4f4f4;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: "Courier New", monospace;
    font-size: 0.9em;
}

.article-content pre {
    background-color: #f4f4f4;
    padding: 20px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 20px 0;
}

.article-content pre code {
    background: none;
    padding: 0;
}

/* Images */
.article-content img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 30px auto;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

/* Responsive design */
@media screen and (max-width: 768px) {
    body {
        padding: 10px;
    }
    
    .magazine-title {
        font-size: 2em;
    }
    
    .article-title {
        font-size: 2em;
    }
    
    .article-meta {
        flex-direction: column;
        gap: 10px;
    }
    
    .toc-item {
        padding-left: 15px;
    }
}

/* Print styles */
@media print {
    .cover {
        background: white;
        color: black;
    }
    
    .article {
        page-break-before: always;
    }
}`;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// Usage example
function createMagazine() {
    const generator = new EPUBMagazineGenerator();
    
    // Initialize the magazine
    generator.initializeEPUB(
        "My Personal Magazine",
        "Your Name",
        "A monthly compilation of my interests, discoveries, and insights from conversations with Claude."
    );
    
    // Add articles (you would populate these with your actual content)
    generator.addArticle(
        "AI and the Future of Work",
        `<p>This month I've been exploring how artificial intelligence is reshaping various industries...</p>
         <h2>Key Insights</h2>
         <p>Through my conversations with Claude, I've discovered several fascinating trends...</p>`,
        "Claude AI",
        "Technology"
    );
    
    generator.addArticle(
        "Recipe Discoveries",
        `<p>I've been experimenting with new cooking techniques this month...</p>
         <h2>Mediterranean Fusion</h2>
         <p>One particularly successful experiment involved combining...</p>`,
        null,
        "Cooking"
    );
    
    generator.addArticle(
        "Book Recommendations",
        `<p>Here are the books that caught my attention this month...</p>
         <blockquote>"The best books are those that tell you what you know already." - George Orwell</blockquote>`,
        null,
        "Reading"
    );
    
    // Generate the EPUB
    const outputPath = `./my-magazine-${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}.epub`;
    
    generator.generateEPUB(outputPath)
        .then(path => {
            console.log(`Magazine generated successfully: ${path}`);
        })
        .catch(error => {
            console.error('Error generating magazine:', error);
        });
}

// Export for use as a module
module.exports = EPUBMagazineGenerator;

// Run if called directly
if (require.main === module) {
    createMagazine();
}