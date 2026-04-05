import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

export default function globalSetup() {
  // Ensure the output directory exists for ContentManager and MagazineGenerator
  mkdirSync(join(repoRoot, 'out'), { recursive: true });
}
