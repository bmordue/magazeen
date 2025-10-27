#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { extname } from 'path';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

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
        let cssContent = '';
        try {
            const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "epub_styles.css");
            cssContent = readFileSync(cssPath, "utf-8");
        } catch (error) {
            console.error(`Warning: Could not read 'epub_styles.css'. Proceeding without custom styles. Error: ${error.message}`);
        }
        this.oebps.file("styles.css", cssContent);
        
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
        const imageData = readFileSync(imagePath);
        this.oebps.file(`images/${filename}`, imageData);
        this.images.push(filename);
        return this;
    }

    // Generate the complete EPUB
    async generateEPUB(outputPath) {
        // Generate content files
        this.oebps.file("content.opf", this.generateOPF());
        this.oebps.file("toc.ncx", this.generateNCX());
        this.oebps.file("nav.xhtml", this.generateNavXHTML());
        this.oebps.file("index.xhtml", this.generateIndexXHTML());
        this.oebps.file("toc.xhtml", this.generateTOCXHTML());
        
        // Generate the ZIP file
        const content = await this.zip.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
            compressionOptions: { level: 9 }
        });
        
        writeFileSync(outputPath, content);
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
            '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
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
            const ext = extname(image).toLowerCase();
            const mediaType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                             ext === '.png' ? 'image/png' : 'image/gif';
            manifestItems.push(`<item id="img${index}" href="images/${image}" media-type="${mediaType}"/>`);
        });

        return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:title>${this.title} - Issue ${this.issueNumber}</dc:title>
        <dc:creator>${this.author}</dc:creator>
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

    generateNavXHTML() {
        const navItems = this.chapters.map(chapter => 
            `<li><a href="${chapter.filename}">${chapter.title}</a></li>`
        ).join('\n                ');

        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>Navigation</title>
    <meta charset="utf-8"/>
</head>
<body>
    <nav epub:type="toc" id="toc">
        <h1>Table of Contents</h1>
        <ol>
            <li><a href="index.xhtml">Cover</a></li>
            <li><a href="toc.xhtml">Table of Contents</a></li>
            ${navItems}
        </ol>
    </nav>
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
export default EPUBMagazineGenerator;

// Note: fileURLToPath is already imported at the top of the file.
// import { fileURLToPath } from 'url';

const thisFile = fileURLToPath(import.meta.url);
const pathPassedToNode = process.argv[1];

// Run if called directly
if (thisFile.includes(pathPassedToNode)) {
    createMagazine();
}