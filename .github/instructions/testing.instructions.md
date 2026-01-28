---
applyTo:
  - "test/**/*.test.js"
  - "test/**/*.spec.js"
---

# Testing Instructions

## Test Framework

This project uses Jest with experimental VM modules support for ES modules compatibility.

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/test.test.js
```

## Test Structure

- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test how components work together
- **Naming Convention**:
  - Unit tests: `<component>.test.js`
  - Integration tests: `<component>.integration.test.js` (preferred) or `<component>.integration-test.js` (legacy)
  - Note: The codebase currently uses both integration test patterns; new tests should use `.integration.test.js`

## Test Patterns

1. **Arrange-Act-Assert**: Structure tests clearly with setup, execution, and verification phases
2. **Descriptive Test Names**: Use clear `describe` and `it` blocks that explain what is being tested
3. **Mock External Dependencies**: Use Jest mocks for file system, network calls, and external services
4. **Test Fixtures**: Store test data in `test/fixtures/` directory
5. **Isolation**: Each test should be independent and not rely on other tests

## Coverage Expectations

- Maintain high test coverage for core logic
- All new features should include tests
- Bug fixes should include regression tests

## Common Testing Utilities

- `jest.mock()` for mocking modules
- `jest.spyOn()` for spying on methods
- Supertest for HTTP endpoint testing (see `server.integration-test.js` and other integration tests)

## Testing Specific Components

### CLI Component Testing
- Test all command-line options and flags
- Verify interactive mode functionality
- Test error handling for invalid inputs

### Content Manager Testing
- Test CRUD operations for articles, interests, and chat highlights
- Verify Claude chat import functionality (both file and URL)
- Test page limit enforcement
- Test content validation

### Magazine Generation Testing
- Test EPUB generation with various content types
- Verify proper formatting and structure
- Test smart topic clustering functionality
- Test edge cases with large content volumes

### Web Interface Testing
- Test file upload functionality
- Verify chat selection and filtering
- Test EPUB generation via web interface
- Test session management and cleanup

### Scratch File Testing
- Test export and import functionality
- Verify chat selection preservation
- Test file format parsing and validation
- Test error handling for malformed files
