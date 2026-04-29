import { promises as fs } from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import { config } from './config.js';

function getCacheDir() {
    return path.resolve(path.dirname(config.paths.contentFile), 'summary_cache');
}

async function ensureCacheDir() {
    const cacheDir = getCacheDir();

    try {
        await fs.mkdir(cacheDir, { recursive: true });
        return cacheDir;
    } catch (error) {
        console.error(`Error ensuring cache directory at ${cacheDir}:`, error);
        return null;
    }
}

function getCacheKey(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

export async function getCachedSummary(content) {
    const cacheDir = await ensureCacheDir();
    if (!cacheDir) {
        return null;
    }

    const cacheKey = getCacheKey(content);
    const cacheFile = path.join(cacheDir, `${cacheKey}.txt`);

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
    const cacheDir = await ensureCacheDir();
    if (!cacheDir) {
        return;
    }

    const cacheKey = getCacheKey(content);
    const cacheFile = path.join(cacheDir, `${cacheKey}.txt`);

    try {
        await fs.writeFile(cacheFile, summary, 'utf8');
    } catch (error) {
        console.error(`Error writing to cache file ${cacheFile}:`, error);
    }
}
