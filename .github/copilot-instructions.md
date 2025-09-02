# Magazeen - Personal EPUB Magazine Generator

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Project Overview
Magazeen is a Node.js ES modules project that generates personal EPUB magazines from content. It provides both a CLI interface for interactive content management and a web server for uploading Claude chat exports to create magazines.

## Working Effectively

### Bootstrap, Build, and Test the Repository
- **Install dependencies:** `npm install` -- takes ~16 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
- **Create required directories:** `mkdir -p out` -- the `out/` directory is required for content storage and must exist before running the application.
- **Run tests:** `npm test` -- takes ~1 second. NEVER CANCEL. Set timeout to 30+ minutes. All 17 tests should pass.
- **Run tests with coverage:** `npm test -- --coverage` -- takes ~1 second. NEVER CANCEL. Set timeout to 30+ minutes. Coverage report will be generated.
- **Run linting:** `npm run lint` -- takes ~1 second. NEVER CANCEL. Set timeout to 30+ minutes. May show 2 warnings but no errors.

### Application Startup and Usage
- **CLI Interface:** `node src/cli.js` -- starts interactive menu with 7 options (add article, interest, chat highlight, manage Claude chats, generate magazine, view content, exit).
- **Web Server:** `npm run start:web` -- starts Express server on http://localhost:3000. NEVER CANCEL. Server runs continuously.
- **Create Template:** `node src/cli.js --template` -- creates `out/magazine-content.json` with sample content.
- **Import Claude Chats:** `node src/cli.js --import-claude <path-to-json>` -- imports chat data from Claude JSON export format.

### Magazine Generation
- **Direct Generation (Programmatic):**
```javascript
import { ContentManager } from './src/contentManager.js';
import { ArticleGenerator } from './src/articleGenerator.js';  
import { MagazineGenerator } from './src/magazineGenerator.js';

const contentManager = new ContentManager();
const articleGenerator = new ArticleGenerator(contentManager);
const magazineGenerator = new MagazineGenerator(contentManager, articleGenerator);
await magazineGenerator.generateMagazine().then(path => console.log('Generated:', path));
```
- **Generation takes <1 second** and creates EPUB files in `/tmp/out/` directory.
- **NEVER CANCEL** generation commands - they are fast but set timeout to 30+ seconds for safety.

## Validation Scenarios
Always run these validation scenarios after making changes:

### Complete User Workflow Test
1. **Clean Setup:** `rm -rf out/ /tmp/out/ && mkdir -p out`
2. **Install:** `npm install`
3. **Create Template:** `node src/cli.js --template`
4. **Import Sample Data:** `node src/cli.js --import-claude test/fixtures/sampleClaudeExport.json`
5. **Generate Magazine:** Use the programmatic generation code above
6. **Verify Output:** Check that `out/magazine-content.json` and `/tmp/out/magazine-*.epub` files exist and are valid
7. **Verify EPUB:** `file /tmp/out/magazine-*.epub` should show "Zip data" (EPUB is a ZIP file)

### Web Server Functionality Test  
1. **Start Server:** `npm run start:web` (runs on port 3000)
2. **Test Response:** `curl -s http://localhost:3000` should return HTML with upload form
3. **Verify:** Upload form should be accessible and functional

### Test Data Verification
- **Sample Chat Export:** `test/fixtures/sampleClaudeExport.json` contains valid and malformed test data
- **Expected Warnings:** Import will show warnings for malformed chats but should import 2 valid chats successfully

## Critical Build and Runtime Information

### Timing Expectations
- **npm install:** ~16 seconds (can be up to 1 minute on slow connections)
- **npm test:** ~1 second (all 17 tests should pass)
- **npm run lint:** ~1 second (may show 2 warnings, no errors)
- **Magazine generation:** <1 second
- **Web server startup:** <1 second

### NEVER CANCEL Commands
Set timeouts appropriately and NEVER cancel these operations:
- `npm install` -- Set timeout to 60+ seconds
- `npm test` -- Set timeout to 30+ seconds
- `npm test -- --coverage` -- Set timeout to 30+ seconds  
- `npm run lint` -- Set timeout to 30+ seconds
- Magazine generation -- Set timeout to 30+ seconds for safety

### File System Requirements
- **Required Directory:** `out/` must exist before running any CLI commands. Create with `mkdir -p out`.
- **Content Storage:** `out/magazine-content.json` stores all magazine content
- **Generated EPUBs:** Created in `/tmp/out/` directory with format `magazine-YYYY-MM.epub`
- **Upload Directory:** `uploads/` directory exists for temporary file storage

## Architecture and Key Components

### Source Structure
```
src/
├── cli.js                 # CLI interface (233 lines)
├── server.js              # Express web server (252 lines) 
├── contentManager.js      # Content storage and management (214 lines)
├── magazineGenerator.js   # Main EPUB generation logic (81 lines)
├── articleGenerator.js    # Article formatting (101 lines)
├── epub_generator.js      # EPUB file creation (334 lines)
├── templateManager.js     # Template creation (79 lines)
└── content_collector.js   # Legacy collector (22 lines)
```

### Technology Stack
- **Runtime:** Node.js with ES modules (`"type": "module"`)
- **Web Framework:** Express.js for web interface
- **File Processing:** Multer for file uploads, JSZip for EPUB creation
- **Testing:** Jest with experimental VM modules
- **Linting:** ESLint with Jest plugin
- **Deployment:** Vercel-ready with `vercel.json` configuration

### Environment Configuration
- **Nix Shell:** Available via `shell.nix` (includes Node.js, Foliate EPUB viewer)
- **Vercel:** Configured for serverless deployment
- **Development:** Local development fully supported

## Common Tasks

### Repository Root Listing
```
├── .github/workflows/ci.yml    # CI pipeline
├── README.md                   # Project documentation  
├── ROADMAP.md                  # Development roadmap
├── package.json                # Node.js configuration
├── eslint.config.js           # ESLint configuration
├── vercel.json                # Vercel deployment config
├── shell.nix                  # Nix development shell
├── src/                       # Source code
├── test/                      # Test files
├── public/                    # Static web assets
└── uploads/                   # File upload directory
```

### Package.json Scripts
```json
{
  "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
  "lint": "eslint src/**/*.js test/**/*.js", 
  "start:web": "node src/server.js"
}
```

### Common Development Patterns
- **Content Management:** Always use `ContentManager` class for content operations
- **Article Generation:** Use `ArticleGenerator` to create formatted articles from interests and chat highlights  
- **EPUB Creation:** `MagazineGenerator` orchestrates the full magazine creation process
- **Error Handling:** Application shows warnings for malformed data but continues processing valid entries
- **File Paths:** All content stored in `out/` directory, EPUBs generated in `/tmp/out/`

## CI/CD Pipeline
- **GitHub Actions:** `.github/workflows/ci.yml` runs on push/PR to main branch
- **Pipeline Steps:** checkout, setup Node.js 18, install dependencies, run tests with coverage, run linting
- **Expected Results:** All tests pass, coverage report generated, 2 linting warnings acceptable
- **Coverage Upload:** Coverage reports uploaded as artifacts for review

Always run `npm run lint` before committing changes or the CI pipeline will show warnings.