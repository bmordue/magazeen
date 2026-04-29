import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { pathToFileURL } from 'url';
import { jest } from '@jest/globals';

const modulePath = '/home/runner/work/magazeen/magazeen/src/summaryCache.js';

async function importSummaryCacheModule() {
    jest.resetModules();
    return import(`${pathToFileURL(modulePath).href}?cacheBust=${Date.now()}-${Math.random()}`);
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
        await expect(fs.readdir(path.join(tempDir, 'summary_cache'))).resolves.toHaveLength(1);
    });

    test('returns null when no cached summary exists', async () => {
        const { getCachedSummary } = await importSummaryCacheModule();

        await expect(getCachedSummary('missing content')).resolves.toBeNull();
    });

    test('logs and returns null when cache directory cannot be created', async () => {
        await fs.writeFile(path.join(tempDir, 'summary_cache'), 'not a directory', 'utf8');
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { cacheSummary, getCachedSummary } = await importSummaryCacheModule();

        await expect(getCachedSummary('article content')).resolves.toBeNull();
        await expect(cacheSummary('article content', 'cached summary')).resolves.toBeUndefined();
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });
});
