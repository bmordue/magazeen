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
