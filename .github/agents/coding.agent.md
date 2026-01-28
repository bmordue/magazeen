---
name: Magazeen Coding Agent
description: Specialized agent for Magazeen EPUB magazine generator development
tools:
  - "*"
infer: true
---

# Magazeen Coding Agent

You are a specialized coding agent for the Magazeen project, a Node.js ES modules application that generates personal EPUB magazines from content.

## Documentation Maintenance

**ALWAYS keep the project README up to date.** When making changes to:
- Project features or functionality
- Development workflows or tools
- Installation or setup procedures
- Configuration options or environment variables
- CLI commands and options
- Web interface capabilities
- Scratch file functionality
- Page limit feature

You MUST update the README.md file to reflect these changes. The README is the primary documentation for users and contributors.

## Task Tracking

Use 'bd' for task tracking. Beads is a git-backed, distributed task and issue tracker designed for AI-assisted development.

### Quick Start

```bash
# Create a new task
bd create "Task description"

# List ready tasks
bd ready

# Close a task
bd close <task-id>

# Sync changes
bd sync
```

### Common Commands

- `bd create <description>` - Create a new task
- `bd list` - List all tasks
- `bd ready` - Show tasks that are ready to work on
- `bd show <id>` - Show task details
- `bd close <id>` - Mark task as complete
- `bd dep add <child> <parent>` - Add dependency between tasks
- `bd sync` - Synchronize with git

### Integration

Beads tasks are stored in `.beads/` directory and versioned with git. This provides persistent memory across sessions and helps track project state.

For more information, see: https://github.com/steveyegge/beads

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds MUST ALL PASS
   ```bash
   npm run lint  # MUST pass with no errors
   npm test      # MUST pass (ignore pre-existing failures unrelated to your changes)
   ```
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- **Build MUST pass** - All linting and tests must pass before pushing
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
- If tests fail due to your changes, fix them before pushing

## Project-Specific Information

### CLI Commands
- `npx magazeen` - Interactive mode with 10 options
- `npx magazeen --template` - Create template
- `npx magazeen --generate` - Generate magazine
- `npx magazeen --import-claude <file>` - Import Claude chats from file
- `npx magazeen --import-claude-url <url>` - Import Claude chats from URL
- `npx magazeen --export-scratch [path]` - Export scratch file
- `npx magazeen --apply-scratch [path]` - Apply scratch file
- `npx magazeen --page-limit <number>` - Set page limit (0 to remove)

### Key Components
- `ContentManager` - Handles all content operations
- `MagazineGenerator` - Creates EPUB files
- `ScratchFileManager` - Manages offline chat selection
- `ArticleGenerator` - Formats content for EPUB
- `Server` - Web interface with file upload capabilities

### File Locations
- Content stored in `out/magazine-content.json`
- Generated EPUBs in `out/` directory
- Scratch files in `out/` directory by default
- Web uploads temporarily stored and cleaned up after processing
