import KindleEPUBMagazineGenerator from '../src/kindle_epub_generator.js';
import { readFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { jest } from '@jest/globals';

describe('KindleEPUBMagazineGenerator', () => {
    let generator;
    const testOutputDir = '/tmp/test-kindle-epub';
    const testEpubPath = `${testOutputDir}/test-kindle-magazine.epub`;

    beforeAll(() => {
        // Create test output directory
        if (!existsSync(testOutputDir)) {
            mkdirSync(testOutputDir, { recursive: true });
        }
    });

    beforeEach(() => {
        generator = new KindleEPUBMagazineGenerator();
        generator.initializeEPUB(
            'Test Kindle Magazine',
            'Test Author',
            'Test Description'
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        // Clean up generated EPUB
        if (existsSync(testEpubPath)) {
            try {
                unlinkSync(testEpubPath);
            } catch {
                // Ignore cleanup errors
            }
        }
    });

    test('should initialize with Kindle optimization enabled by default', () => {
        const kindleGen = new KindleEPUBMagazineGenerator();
        expect(kindleGen.kindleOptimized).toBe(true);
    });

    test('should allow disabling Kindle optimization', () => {
        const kindleGen = new KindleEPUBMagazineGenerator(false);
        expect(kindleGen.kindleOptimized).toBe(false);
    });

    test('should generate EPUB with Kindle-optimized CSS', async () => {
        generator.addArticle('Test Article', '<p>Test content for Kindle</p>', 'Author', 'Category');
        await generator.generateEPUB(testEpubPath);

        // Extract styles.css
        const extractDir = `${testOutputDir}/extracted-css`;
        execSync(`unzip -o ${testEpubPath} OEBPS/styles.css -d ${extractDir}`, { stdio: 'ignore' });
        const cssContent = readFileSync(`${extractDir}/OEBPS/styles.css`, 'utf-8');

        // Verify Kindle-optimized CSS characteristics
        expect(cssContent).toContain('Kindle-Optimized'); // CSS header comment
        expect(cssContent).toContain('#000000'); // High contrast black text
        expect(cssContent).toContain('#FFFFFF'); // High contrast white background
    });

    test('should use left-aligned text for better e-ink readability', async () => {
        generator.addArticle('Test Article', '<p>Test content</p>', 'Author', 'Category');
        await generator.generateEPUB(testEpubPath);

        // Extract styles.css
        const extractDir = `${testOutputDir}/extracted-alignment`;
        execSync(`unzip -o ${testEpubPath} OEBPS/styles.css -d ${extractDir}`, { stdio: 'ignore' });
        const cssContent = readFileSync(`${extractDir}/OEBPS/styles.css`, 'utf-8');

        // Verify left alignment instead of justified
        expect(cssContent).toContain('text-align: left');
        expect(cssContent).not.toContain('text-align: justify');
    });

    test('should use high-contrast borders for code blocks', async () => {
        generator.addArticle('Code Article', '<pre><code>console.log("test");</code></pre>', 'Dev', 'Tech');
        await generator.generateEPUB(testEpubPath);

        // Extract styles.css
        const extractDir = `${testOutputDir}/extracted-code`;
        execSync(`unzip -o ${testEpubPath} OEBPS/styles.css -d ${extractDir}`, { stdio: 'ignore' });
        const cssContent = readFileSync(`${extractDir}/OEBPS/styles.css`, 'utf-8');

        // Verify white background with borders instead of gray backgrounds
        const codeBlockSection = cssContent.match(/\.article-content code[\s\S]*?}/g);
        expect(codeBlockSection).toBeTruthy();
        expect(cssContent).toContain('background-color: #FFFFFF');
        expect(cssContent).toContain('border');
    });

    test('should generate valid EPUB structure', async () => {
        generator.addArticle('Article 1', '<p>Content 1</p>', 'Author 1', 'Category 1');
        generator.addArticle('Article 2', '<p>Content 2</p>', 'Author 2', 'Category 2');
        
        await generator.generateEPUB(testEpubPath);

        // Verify EPUB file exists
        expect(existsSync(testEpubPath)).toBe(true);

        // Verify mimetype
        const extractDir = `${testOutputDir}/extracted-structure`;
        execSync(`unzip -o ${testEpubPath} mimetype -d ${extractDir}`, { stdio: 'ignore' });
        const mimetype = readFileSync(`${extractDir}/mimetype`, 'utf-8');
        expect(mimetype).toBe('application/epub+zip');
    });

    test('should include all articles in the generated EPUB', async () => {
        generator.addArticle('First Article', '<p>First content</p>', 'Author A', 'Tech');
        generator.addArticle('Second Article', '<p>Second content</p>', 'Author B', 'Science');
        
        await generator.generateEPUB(testEpubPath);

        // Extract nav.xhtml
        const extractDir = `${testOutputDir}/extracted-nav`;
        execSync(`unzip -o ${testEpubPath} OEBPS/nav.xhtml -d ${extractDir}`, { stdio: 'ignore' });
        const navContent = readFileSync(`${extractDir}/OEBPS/nav.xhtml`, 'utf-8');

        // Verify both articles are in navigation
        expect(navContent).toContain('First Article');
        expect(navContent).toContain('Second Article');
    });

    test('should provide fallback CSS when external file not found', () => {
        const defaultCSS = generator.getDefaultCSS();
        
        // Verify default CSS follows Kindle optimization principles
        expect(defaultCSS).toContain('Bookerly');
        expect(defaultCSS).toContain('#000000');
        expect(defaultCSS).toContain('#FFFFFF');
        expect(defaultCSS).toContain('line-height: 1.5');
    });

    test('should generate EPUB3 compliant output', async () => {
        generator.addArticle('Test Chapter', '<p>Test content</p>', 'Author', 'Category');
        await generator.generateEPUB(testEpubPath);

        // Extract content.opf
        const extractDir = `${testOutputDir}/extracted-opf`;
        execSync(`unzip -o ${testEpubPath} OEBPS/content.opf -d ${extractDir}`, { stdio: 'ignore' });
        const opfContent = readFileSync(`${extractDir}/OEBPS/content.opf`, 'utf-8');

        // Verify EPUB3 version
        expect(opfContent).toContain('version="3.0"');
        expect(opfContent).toContain('properties="nav"');
    });
});
