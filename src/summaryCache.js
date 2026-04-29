import { promises as fs } from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

const CACHE_DIR = path.resolve('./summary_cache');

async function ensureCacheDir() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        return true;
    } catch (error) {
        console.error(`Failed to create cache directory at ${CACHE_DIR}:`, error);
        return false;
    }
}

function getCacheKey(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

export async function getCachedSummary(content) {
    const cacheDirReady = await ensureCacheDir();
    if (!cacheDirReady) {
        return null;
    }

    const cacheKey = getCacheKey(content);
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.txt`);

    try {
        return await fs.readFile(cacheFile, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Error reading from cache file ${cacheFile}:`, error);
        }
        return null;
    }
}

export async function cacheSummary(content, summary) {
    const cacheDirReady = await ensureCacheDir();
    if (!cacheDirReady) {
        return;
    }

    const cacheKey = getCacheKey(content);
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.txt`);

    try {
        await fs.writeFile(cacheFile, summary, 'utf8');
    } catch (error) {
        console.error(`Error writing to cache file ${cacheFile}:`, error);
    }
}
