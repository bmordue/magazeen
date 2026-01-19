# Agent Instructions

## Task Tracking

Use 'bd' for task tracking. Beads is a git-backed, distributed task and issue tracker designed for AI-assisted development.

### Quick Start

```bash
# Initialize beads in the project (run once)
bd init

# Create a new task
bd create "Task description" -p 0

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
