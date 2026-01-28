# Kindle EPUB CSS Optimization Specification

This document outlines the specific CSS changes needed to optimize EPUB files for Kindle e-ink devices.

## Kindle E-ink Display Characteristics

- **High contrast**: Black and white display with no grayscale smoothness
- **Screen size**: Varies by model (Kindle Paperwhite: 6" 300ppi, Kindle Scribe: 10.2" 265ppi)
- **Limited color support**: Primarily black and white (some newer models support limited grayscale)
- **Refresh rate**: Slower refresh rate affects animation and page turns
- **Rendering engine**: Modified WebKit browser engine with limitations

## Recommended CSS Properties

### 1. Typography

```css
/* Use serif fonts for better readability on e-ink */
body {
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 1em; /* Around 16-18px equivalent for optimal readability */
    line-height: 1.6; /* Increased line height for better readability */
    color: #000000; /* Pure black for maximum contrast */
}

/* Headings should be clear and well-spaced */
h1, h2, h3, h4, h5, h6 {
    font-weight: bold;
    color: #000000;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    line-height: 1.3;
}

h1 {
    font-size: 1.8em;
    margin-top: 1em;
}

h2 {
    font-size: 1.5em;
}

h3 {
    font-size: 1.3em;
}
```

### 2. Contrast and Colors

```css
/* High contrast colors for e-ink */
:root {
    --text-color: #000000; /* Pure black */
    --background-color: #FFFFFF; /* Pure white */
    --heading-color: #000000;
    --border-color: #000000; /* Dark borders for better visibility */
}

body {
    color: var(--text-color);
    background-color: var(--background-color);
}
```

### 3. Spacing and Layout

```css
/* Generous spacing for readability */
p {
    margin-bottom: 1em;
    text-align: justify; /* Justified text can look cleaner on e-ink */
    line-height: 1.6;
    orphans: 3; /* Prevent widows and orphans */
    widows: 3;
}

/* Proper spacing for lists */
ul, ol {
    margin: 1em 0;
    padding-left: 1.5em;
}

li {
    margin: 0.5em 0;
}

/* Blockquotes with clear visual separation */
blockquote {
    margin: 1.5em 0;
    padding: 1em 1.5em;
    border-left: 3px solid #000000; /* Solid border for visibility */
    font-style: italic;
    background: transparent; /* No background color on e-ink */
}
```

### 4. Cover Page Optimization

```css
/* Simplified cover design for e-ink */
.cover {
    text-align: center;
    padding: 2em 1em;
    background-color: #FFFFFF;
    color: #000000;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.magazine-title {
    font-size: 2.5em;
    font-weight: bold;
    margin-bottom: 0.5em;
    line-height: 1.2;
}

.issue-info {
    margin-top: 1em;
}

.issue-number, .issue-date {
    font-size: 1.2em;
    margin: 0.3em 0;
}
```

### 5. Table of Contents Optimization

```css
.toc-container {
    max-width: 100%;
    padding: 1em;
}

.toc-header {
    font-size: 1.8em;
    text-align: center;
    margin-bottom: 2em;
    color: #000000;
    border-bottom: 2px solid #000000;
    padding-bottom: 0.5em;
}

.toc-list {
    list-style: none;
    padding: 0;
}

.toc-item {
    margin-bottom: 1em;
    padding-bottom: 0.5em;
    border-bottom: 1px solid #CCCCCC; /* Light border */
}

.toc-title {
    display: block;
    font-size: 1.1em;
    font-weight: bold;
    margin-bottom: 0.3em;
}

.toc-category {
    display: inline-block;
    font-size: 0.9em;
    font-style: italic;
    color: #666666;
}
```

### 6. Article Content Optimization

```css
.article {
    max-width: 100%;
    margin: 0 auto;
    padding: 1em;
}

.article-header {
    margin-bottom: 1.5em;
    text-align: center;
    border-bottom: 1px solid #CCCCCC;
    padding-bottom: 1em;
}

.article-title {
    font-size: 1.8em;
    color: #000000;
    margin-bottom: 0.5em;
    line-height: 1.3;
}

.article-meta {
    font-size: 0.9em;
    color: #666666;
    margin-bottom: 1em;
}

.article-content {
    font-size: 1em;
    line-height: 1.6;
}
```

### 7. Media Queries for Different Kindle Models

```css
/* Base styles for all Kindles */
@media screen and (max-width: 600px) {
    body {
        font-size: 0.9em;
        padding: 0.8em;
    }
    
    .magazine-title {
        font-size: 2em;
    }
    
    .article-title {
        font-size: 1.5em;
    }
}

/* Larger Kindles (like Kindle Scribe) */
@media screen and (min-width: 601px) {
    body {
        font-size: 1.1em;
        max-width: 40em; /* Limit line length for readability */
        margin: 0 auto;
    }
}
```

### 8. Print Styles (for e-ink simulation)

```css
/* Since e-ink is similar to print, optimize for that */
@media print, amzn-kf8 {
    body {
        font-size: 1em;
        line-height: 1.6;
        color: #000000;
        background-color: #FFFFFF;
    }
    
    /* Prevent page breaks inside articles */
    .article {
        page-break-inside: avoid;
        break-inside: avoid;
    }
    
    /* Ensure headings stay with content */
    h1, h2, h3 {
        page-break-after: avoid;
        break-after: avoid;
    }
}
```

## Additional Considerations

1. **Avoid Complex Backgrounds**: E-ink displays don't handle complex backgrounds well
2. **Minimize Color Usage**: Stick to black and white for optimal readability
3. **Simple Borders**: Use solid, high-contrast borders instead of complex graphics
4. **Font Embedding**: Consider embedding fonts if specific typography is critical
5. **Image Handling**: Optimize images for e-ink (black and white, high contrast)
6. **Testing**: Always test on actual Kindle devices or official previewers

## Implementation Priority

1. **High Priority**: Typography, contrast, basic layout
2. **Medium Priority**: Spacing, special content blocks (quotes, lists)
3. **Lower Priority**: Advanced responsive features, images