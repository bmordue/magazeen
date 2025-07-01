#!/usr/bin/env node

// This file now serves as the main entry point for the CLI application.
// It delegates the core logic to the runCli function in cli.js.

import { runCli } from './cli.js';
import { ContentManager } from './contentManager.js';
import { ArticleGenerator } from './articleGenerator.js';
import { MagazineGenerator } from './magazineGenerator.js';
import { createTemplate } from './templateManager.js';

// The main CLI execution is now handled by runCli from cli.js
// The runCli function also handles the logic to determine if it's being run as a script.
runCli();

// Export classes and functions for potential programmatic use,
// allowing other scripts to import and use these modules if needed.
export {
    ContentManager,
    ArticleGenerator,
    MagazineGenerator,
    createTemplate
};