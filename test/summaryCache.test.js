import os from 'os';
import path from 'path';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import { jest } from '@jest/globals';

let importCounter = 0;

function getCacheFilePath(tempDir, content) {
    const cacheKey = crypto.createHash('sha256').update(content).digest('hex');
    return path.join(tempDir, 'out', 'summary_cache', `${cacheKey}.txt`);
}

async function importSummaryCacheModule() {
    jest.resetModules();
    importCounter += 1;
    return import(new URL(`../src/summaryCache.js?cacheBust=${importCounter}`, import.meta.url));
}

describe('summaryCache', () => {
    const originalCwd = process.cwd();
    let tempDir;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'magazeen-summary-cache-'));
        process.chdir(tempDir);
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    test('stores and retrieves cached summaries asynchronously', async () => {
        const { cacheSummary, getCachedSummary } = await importSummaryCacheModule();

        await cacheSummary('article content', 'cached summary');

        await expect(getCachedSummary('article content')).resolves.toBe('cached summary');
        await expect(fs.readdir(path.join(tempDir, 'out', 'summary_cache'))).resolves.toHaveLength(1);
    });

    test('returns null when no cached summary exists', async () => {
        const { getCachedSummary } = await importSummaryCacheModule();

        await expect(getCachedSummary('missing content')).resolves.toBeNull();
    });

    test('logs and returns null when reading a cache entry fails for reasons other than cache miss', async () => {
        const content = 'article content';
        const cacheFilePath = getCacheFilePath(tempDir, content);
        await fs.mkdir(cacheFilePath, { recursive: true });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { getCachedSummary } = await importSummaryCacheModule();

        await expect(getCachedSummary(content)).resolves.toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            `Error reading from cache file ${cacheFilePath}:`,
            expect.objectContaining({ code: 'EISDIR' })
        );

        consoleErrorSpy.mockRestore();
    });

    test('logs and returns null when cache directory cannot be created', async () => {
        await fs.mkdir(path.join(tempDir, 'out'), { recursive: true });
        await fs.writeFile(path.join(tempDir, 'out', 'summary_cache'), 'not a directory', 'utf8');
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { cacheSummary, getCachedSummary } = await importSummaryCacheModule();

        await expect(getCachedSummary('article content')).resolves.toBeNull();
        await expect(cacheSummary('article content', 'cached summary')).resolves.toBeUndefined();
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining(path.join(tempDir, 'out', 'summary_cache')),
            expect.objectContaining({ code: 'EEXIST' })
        );

        consoleErrorSpy.mockRestore();
    });

    test('logs write errors when a cache entry cannot be written', async () => {
        const content = 'article content';
        const cacheFilePath = getCacheFilePath(tempDir, content);
        await fs.mkdir(cacheFilePath, { recursive: true });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { cacheSummary } = await importSummaryCacheModule();

        await expect(cacheSummary(content, 'cached summary')).resolves.toBeUndefined();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            `Error writing to cache file ${cacheFilePath}:`,
            expect.objectContaining({ code: 'EISDIR' })
        );

        consoleErrorSpy.mockRestore();
    });
});
