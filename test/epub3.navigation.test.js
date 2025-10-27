import EPUBMagazineGenerator from '../src/epub_generator.js';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { jest } from '@jest/globals';

describe('EPUB3 Navigation - Chapter Markers for Kindle', () => {
    let generator;
    const testOutputDir = '/tmp/test-epub3-nav';
    const testEpubPath = `${testOutputDir}/test-magazine.epub`;

    beforeAll(() => {
        // Create test output directory
        if (!existsSync(testOutputDir)) {
            mkdirSync(testOutputDir, { recursive: true });
        }
    });

    beforeEach(() => {
        generator = new EPUBMagazineGenerator();
        generator.initializeEPUB(
            'Test Magazine',
            'Test Author',
            'Test Description'
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should generate EPUB with EPUB3 navigation document', async () => {
        // Add test chapters
        generator.addArticle('Chapter 1', '<p>Content 1</p>', 'Author 1', 'Category 1');
        generator.addArticle('Chapter 2', '<p>Content 2</p>', 'Author 2', 'Category 2');

        // Generate EPUB
        await generator.generateEPUB(testEpubPath);

        // Extract nav.xhtml
        const extractDir = `${testOutputDir}/extracted`;
        execSync(`unzip -o ${testEpubPath} OEBPS/nav.xhtml -d ${extractDir}`, { stdio: 'ignore' });
        const navContent = readFileSync(`${extractDir}/OEBPS/nav.xhtml`, 'utf-8');

        // Verify EPUB3 navigation document structure
        expect(navContent).toContain('xmlns:epub="http://www.idpf.org/2007/ops"');
        expect(navContent).toContain('epub:type="toc"');
        expect(navContent).toContain('<nav epub:type="toc" id="toc">');
    });

    test('should include all chapters in navigation document', async () => {
        // Add test chapters
        generator.addArticle('First Story', '<p>Content 1</p>', 'Author 1', 'Fiction');
        generator.addArticle('Second Story', '<p>Content 2</p>', 'Author 2', 'Non-Fiction');
        generator.addArticle('Third Story', '<p>Content 3</p>', 'Author 3', 'Poetry');

        // Generate EPUB
        await generator.generateEPUB(testEpubPath);

        // Extract nav.xhtml
        const extractDir = `${testOutputDir}/extracted2`;
        execSync(`unzip -o ${testEpubPath} OEBPS/nav.xhtml -d ${extractDir}`, { stdio: 'ignore' });
        const navContent = readFileSync(`${extractDir}/OEBPS/nav.xhtml`, 'utf-8');

        // Verify all chapters are listed
        expect(navContent).toContain('First Story');
        expect(navContent).toContain('Second Story');
        expect(navContent).toContain('Third Story');
        expect(navContent).toContain('href="chapter1.xhtml"');
        expect(navContent).toContain('href="chapter2.xhtml"');
        expect(navContent).toContain('href="chapter3.xhtml"');
    });

    test('should generate OPF with EPUB3 version', async () => {
        generator.addArticle('Test Chapter', '<p>Test content</p>', 'Test Author', 'Test Category');
        await generator.generateEPUB(testEpubPath);

        // Extract content.opf
        const extractDir = `${testOutputDir}/extracted3`;
        execSync(`unzip -o ${testEpubPath} OEBPS/content.opf -d ${extractDir}`, { stdio: 'ignore' });
        const opfContent = readFileSync(`${extractDir}/OEBPS/content.opf`, 'utf-8');

        // Verify EPUB3 version
        expect(opfContent).toContain('version="3.0"');
    });

    test('should include nav item with properties="nav" in manifest', async () => {
        generator.addArticle('Test Chapter', '<p>Test content</p>', 'Test Author', 'Test Category');
        await generator.generateEPUB(testEpubPath);

        // Extract content.opf
        const extractDir = `${testOutputDir}/extracted4`;
        execSync(`unzip -o ${testEpubPath} OEBPS/content.opf -d ${extractDir}`, { stdio: 'ignore' });
        const opfContent = readFileSync(`${extractDir}/OEBPS/content.opf`, 'utf-8');

        // Verify nav item with properties
        expect(opfContent).toContain('<item id="nav" href="nav.xhtml"');
        expect(opfContent).toContain('properties="nav"');
    });

    test('should maintain backward compatibility with NCX for EPUB2 readers', async () => {
        generator.addArticle('Test Chapter', '<p>Test content</p>', 'Test Author', 'Test Category');
        await generator.generateEPUB(testEpubPath);

        // Extract toc.ncx
        const extractDir = `${testOutputDir}/extracted5`;
        execSync(`unzip -o ${testEpubPath} OEBPS/toc.ncx -d ${extractDir}`, { stdio: 'ignore' });
        const ncxContent = readFileSync(`${extractDir}/OEBPS/toc.ncx`, 'utf-8');

        // Verify NCX still exists for backward compatibility
        expect(ncxContent).toContain('<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"');
        expect(ncxContent).toContain('<navPoint');
        expect(ncxContent).toContain('Test Chapter');
    });

    test('navigation document should have proper HTML5 structure', async () => {
        generator.addArticle('Story Title', '<p>Story content</p>', 'Author Name', 'Category');
        await generator.generateEPUB(testEpubPath);

        // Extract nav.xhtml
        const extractDir = `${testOutputDir}/extracted6`;
        execSync(`unzip -o ${testEpubPath} OEBPS/nav.xhtml -d ${extractDir}`, { stdio: 'ignore' });
        const navContent = readFileSync(`${extractDir}/OEBPS/nav.xhtml`, 'utf-8');

        // Verify HTML5 structure
        expect(navContent).toContain('<!DOCTYPE html>');
        expect(navContent).toContain('xmlns="http://www.w3.org/1999/xhtml"');
        expect(navContent).toContain('<meta charset="utf-8"/>');
    });
});
