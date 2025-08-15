import * as nodeFs from 'fs';
import * as crypto from 'crypto';

const CACHE_DIR = './summary_cache';
if (!nodeFs.existsSync(CACHE_DIR)) {
    nodeFs.mkdirSync(CACHE_DIR);
}

function getCacheKey(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

export function getCachedSummary(content) {
    if (!nodeFs.existsSync(CACHE_DIR)) {
        nodeFs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const cacheKey = getCacheKey(content);
    const cacheFile = `${CACHE_DIR}/${cacheKey}.txt`;

    if (nodeFs.existsSync(cacheFile)) {
        try {
            return nodeFs.readFileSync(cacheFile, 'utf8');
        } catch (err) {
            // If the cache file is unreadable or corrupted, gracefully return null
            return null;
        }
    }

    return null;
}

export function cacheSummary(content, summary) {
    const cacheKey = getCacheKey(content);
    const cacheFile = `${CACHE_DIR}/${cacheKey}.txt`;

    try {
        nodeFs.writeFileSync(cacheFile, summary, 'utf8');
    } catch (err) {
        console.error(`Failed to write cache file "${cacheFile}":`, err);
    }
}
