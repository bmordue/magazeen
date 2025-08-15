import * as nodeFs from 'fs';
import * as crypto from 'crypto';

const CACHE_DIR = './summary_cache';
if (!nodeFs.existsSync(CACHE_DIR)) {
    nodeFs.mkdirSync(CACHE_DIR);
}

function getCacheKey(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
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
        return nodeFs.readFileSync(cacheFile, 'utf8');
    }

    return null;
}

export function cacheSummary(content, summary) {
    const cacheKey = getCacheKey(content);
    const cacheFile = `${CACHE_DIR}/${cacheKey}.txt`;

    nodeFs.writeFileSync(cacheFile, summary, 'utf8');
}
