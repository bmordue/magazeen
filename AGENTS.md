# Agent Instructions

## Documentation Maintenance

**ALWAYS keep the project README up to date.** When making changes to:
- Project features or functionality
- Development workflows or tools
- Installation or setup procedures
- Configuration options or environment variables

You MUST update the README.md file to reflect these changes. The README is the primary documentation for users and contributors.

## Task Tracking

Use 'bd' for task tracking. Beads is a git-backed, distributed task and issue tracker designed for AI-assisted development.

### Quick Start

```bash
# Initialize beads in the project (run once)
bd init

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
2. **Run quality gates** (if code changed) - Tests, linters, builds
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
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
