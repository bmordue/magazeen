# Magazeen - Personal EPUB Magazine Generator

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Project Overview
Magazeen is a Node.js ES modules project that generates personal EPUB magazines from content. It provides both a CLI interface for interactive content management and a web server for uploading Claude chat exports to create magazines.

## Working Effectively

### Bootstrap, Build, and Test the Repository
- **Install dependencies:** `npm install` -- takes ~16 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
- **Create required directories:** `mkdir -p out` -- the `out/` directory is required for content storage and must exist before running the application.
- **Run tests:** `npm test` -- takes ~1 second. NEVER CANCEL. Set timeout to 30+ minutes. All tests should pass.
- **Run tests with coverage:** `npm test -- --coverage` -- takes ~1 second. NEVER CANCEL. Set timeout to 30+ minutes. Coverage report will be generated.
- **Run linting:** `npm run lint` -- takes ~1 second. NEVER CANCEL. Set timeout to 30+ minutes. May show warnings but no errors.

### Application Startup and Usage
- **CLI Interface:** `npx magazeen` or `node src/cli.js` -- starts interactive menu with 10 options (add article, interest, chat highlight, manage Claude chats, generate magazine, view content, set page limit, export scratch file, apply scratch file, exit).
- **Web Server:** `npm run start:web` -- starts Express server on http://localhost:3000. NEVER CANCEL. Server runs continuously.
- **Create Template:** `npx magazeen --template` -- creates `out/magazine-content.json` with sample content.
- **Import Claude Chats:** `npx magazeen --import-claude <path-to-json>` -- imports chat data from Claude JSON export format.
- **Import Claude Chats from URL:** `npx magazeen --import-claude-url <url>` -- imports chat data from Claude JSON export format via URL.
- **Export Scratch File:** `npx magazeen --export-scratch [path]` -- exports chat selections to a text file for offline editing.
- **Apply Scratch File:** `npx magazeen --apply-scratch [path]` -- applies changes from an edited scratch file.
- **Set Page Limit:** `npx magazeen --page-limit <number>` -- sets maximum page count for magazine (0 removes limit).

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
- **Generation takes <1 second** and creates EPUB files in `out/` directory.
- **NEVER CANCEL** generation commands - they are fast but set timeout to 30+ seconds for safety.

## Validation Scenarios
Always run these validation scenarios after making changes:

### Complete User Workflow Test
1. **Clean Setup:** `rm -rf out/ && mkdir -p out`
2. **Install:** `npm install`
3. **Create Template:** `npx magazeen --template`
4. **Import Sample Data:** `npx magazeen --import-claude test/fixtures/sampleClaudeExport.json`
5. **Generate Magazine:** Use the programmatic generation code above or `npx magazeen --generate`
6. **Verify Output:** Check that `out/magazine-content.json` and `out/magazine-*.epub` files exist and are valid
7. **Verify EPUB:** `file out/magazine-*.epub` should show "Zip data" (EPUB is a ZIP file)

### Web Server Functionality Test
1. **Start Server:** `npm run start:web` (runs on port 3000)
2. **Test Response:** `curl -s http://localhost:3000` should return HTML with upload form
3. **Verify:** Upload form should be accessible and functional

### Test Data Verification
- **Sample Chat Export:** `test/fixtures/sampleClaudeExport.json` contains valid and malformed test data
- **Expected Warnings:** Import will show warnings for malformed chats but should import valid chats successfully

## Critical Build and Runtime Information

### Timing Expectations
- **npm install:** ~16 seconds (can be up to 1 minute on slow connections)
- **npm test:** ~1 second (all tests should pass)
- **npm run lint:** ~1 second (may show warnings, no errors)
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
- **Generated EPUBs:** Created in `out/` directory with format `magazine-YYYY-MM.epub`
- **Scratch Files:** Created in `out/` directory by default with format `magazine-scratch.txt`

## Architecture and Key Components

### Source Structure
```
src/
├── cli.js                 # Command Line Interface (handles all CLI options)
├── server.js              # Express web server (handles web interface)
├── contentManager.js      # Content storage and management (manages all content types)
├── magazineGenerator.js   # Main EPUB generation logic (creates EPUB files)
├── articleGenerator.js    # Article formatting (formats content for EPUB)
├── templateManager.js     # Template creation (creates starter template)
├── scratchFileManager.js  # Scratch file management (handles offline chat selection)
├── logger.js              # Logging utilities (structured logging)
├── validation.js          # Input validation (validates content)
├── config.js              # Configuration management (project defaults)
└── templateRenderer.js    # HTML template renderer (renders web pages)
```

### Technology Stack
- **Runtime:** Node.js with ES modules (`"type": "module"`)
- **Web Framework:** Express.js for web interface
- **File Processing:** Multer for file uploads, JSZip for EPUB creation
- **HTML Sanitization:** DOMPurify to prevent XSS
- **Testing:** Jest with experimental VM modules
- **Linting:** ESLint with Jest plugin
- **Deployment:** Vercel-ready with `vercel.json` configuration
- **KV Storage:** Vercel KV for temporary web session data

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
├── AGENTS.md                   # Agent configuration
├── ARCHITECTURE_ASSESSMENT.md  # Architecture overview
├── PRD.md                      # Product requirements document
├── package.json                # Node.js configuration
├── eslint.config.js           # ESLint configuration
├── vercel.json                # Vercel deployment config
├── shell.nix                  # Nix development shell
├── src/                       # Source code
├── test/                      # Test files
├── public/                    # Static web assets
├── .beads/                    # Beads task tracking
└── out/                       # Output directory (created by user)
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
- **File Paths:** All content stored in `out/` directory, EPUBs generated in `out/` directory
- **Scratch Files:** Use `ScratchFileManager` for offline chat selection and ordering
- **Web Interface:** Use `server.js` with Vercel KV for temporary session data

## CI/CD Pipeline
- **GitHub Actions:** `.github/workflows/ci.yml` runs on push/PR to main branch
- **Pipeline Steps:** checkout, setup Node.js 18, install dependencies, run tests with coverage, run linting
- **Expected Results:** All tests pass, coverage report generated, linting warnings acceptable
- **Coverage Upload:** Coverage reports uploaded as artifacts for review

Always run `npm run lint` before committing changes or the CI pipeline will show warnings.

## Coding Standards

### JavaScript/ES Modules
- **Module System:** This project uses ES modules (`"type": "module"` in package.json)
- **Import Syntax:** Always use `import/export` syntax, never `require()`
- **File Extensions:** Always include `.js` extension in import statements
- **Async/Await:** Prefer async/await over raw promises for better readability
- **Error Handling:** Always handle errors appropriately; don't let promises reject silently

### Code Style
- **Linting:** Follow ESLint configuration in `eslint.config.js`
- **Naming Conventions:**
  - Use `camelCase` for variables and functions
  - Use `PascalCase` for classes
  - Use descriptive names that convey intent
- **Comments:** Add comments only when necessary to explain "why" not "what"
- **Dependencies:** Keep dependencies minimal; justify any new dependency additions

### Security
- **Input Sanitization:** All user-provided HTML content MUST be sanitized using DOMPurify (see `articleGenerator.js`)
- **No Secrets in Code:** Never commit API keys, tokens, or sensitive data
- **File Uploads:** Uploaded files are validated and cleaned up after processing (see `server.js`)
- **XSS Prevention:** All content rendered to EPUB is sanitized to prevent cross-site scripting
- **Session Management:** Use Vercel KV for temporary session data in web interface

### Testing Requirements
- Write tests for all new features and bug fixes
- Maintain test coverage above 80% for core modules
- Use descriptive test names that explain what is being tested
- Keep tests isolated and independent