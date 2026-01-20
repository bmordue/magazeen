# GitHub Copilot Configuration

This repository is configured with GitHub Copilot custom instructions and agents to provide context-aware assistance.

## Structure

### `.github/copilot-instructions.md`
Repository-wide instructions that provide context about:
- Project overview and architecture
- Build, test, and deployment procedures
- Critical timing and performance expectations
- Validation scenarios and workflows
- Common tasks and development patterns
- Coding standards and security guidelines

### `.github/agents/`
Custom agent definitions for specialized assistance:
- **coding.agent.md**: Main coding agent with project-specific workflows, documentation maintenance requirements, task tracking integration, and session completion procedures

### `.github/instructions/`
Path-specific instructions for different parts of the codebase:
- **testing.instructions.md**: Testing guidelines, patterns, and best practices for the test suite

## For Contributors

When working on this project, GitHub Copilot will automatically use these instructions to provide more relevant and accurate assistance. The instructions cover:

1. **Development Environment**: How to set up, build, and test the project
2. **Coding Standards**: ES modules, security practices, and code style
3. **Testing**: Test structure, patterns, and coverage expectations
4. **Workflows**: Task tracking with Beads, session completion procedures

## Updating Instructions

If you notice that Copilot instructions are outdated or could be improved:

1. Update the relevant file in `.github/`
2. Keep instructions concise and actionable
3. Focus on information that can't easily be inferred from the code
4. Test that the updated instructions improve Copilot's assistance

## Learn More

- [GitHub Copilot Custom Instructions Documentation](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- [Custom Agents Configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
