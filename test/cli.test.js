import { jest } from '@jest/globals';

// Mock functions
const mockImportClaudeChatsFromFile = jest.fn();
const mockAddArticle = jest.fn();
const mockAddInterest = jest.fn();
const mockAddChatHighlight = jest.fn();
const mockToggleClaudeChatSelection = jest.fn();
const mockLoadContent = jest.fn();
const mockSaveContent = jest.fn();
const mockGenerateMagazine = jest.fn().mockResolvedValue('path/to/magazine.epub');
const mockCreateTemplate = jest.fn();

// Mock readline
const mockReadlineInstance = {
    question: jest.fn((_query, cb) => cb('7')), // Auto-exit by choosing '7'
    close: jest.fn(),
};
const mockCreateInterface = jest.fn(() => mockReadlineInstance);

// Set up module mocks before importing
jest.unstable_mockModule('../src/contentManager.js', () => ({
  ContentManager: jest.fn().mockImplementation(() => ({
    importClaudeChatsFromFile: mockImportClaudeChatsFromFile,
    addArticle: mockAddArticle,
    addInterest: mockAddInterest,
    addChatHighlight: mockAddChatHighlight,
    toggleClaudeChatSelection: mockToggleClaudeChatSelection,
    loadContent: mockLoadContent,
    saveContent: mockSaveContent,
    content: {
      articles: [],
      interests: [],
      chatHighlights: [],
      claudeChats: [],
      metadata: {}
    }
  })),
}));

jest.unstable_mockModule('../src/magazineGenerator.js', () => ({
    MagazineGenerator: jest.fn().mockImplementation(() => ({
        generateMagazine: mockGenerateMagazine,
    })),
}));

jest.unstable_mockModule('../src/templateManager.js', () => ({
    createTemplate: mockCreateTemplate,
}));

jest.unstable_mockModule('readline', () => ({
    __esModule: true,
    default: {
        createInterface: mockCreateInterface,
    },
}));

// Import the CLI module after mocks are set up
const { runCli } = await import('../src/cli.js');


describe('CLI Argument Parsing and Functionality', () => {
  let originalArgv;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    originalArgv = [...process.argv];
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockImportClaudeChatsFromFile.mockClear();
    mockGenerateMagazine.mockClear();
    mockCreateTemplate.mockClear();
    // Reset other mocks if they were called
    mockAddArticle.mockClear();
    mockAddInterest.mockClear();
    mockAddChatHighlight.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks(); // Clears all mocks, including module mocks
  });

  test('--import-claude <filepath> calls contentManager.importClaudeChatsFromFile with the correct path', () => {
    const testFilePath = 'test/fixtures/sampleClaudeExport.json';
    process.argv = ['node', 'src/cli.js', '--import-claude', testFilePath];

    mockImportClaudeChatsFromFile.mockReturnValue(1); // Simulate one chat imported

    runCli();

    expect(mockImportClaudeChatsFromFile).toHaveBeenCalledTimes(1);
    expect(mockImportClaudeChatsFromFile).toHaveBeenCalledWith(testFilePath);
    expect(consoleLogSpy).toHaveBeenCalledWith(`Importing Claude chats from: ${testFilePath}`);
  });

  test('--import-claude without filepath shows error and usage', () => {
    process.argv = ['node', 'src/cli.js', '--import-claude'];

    runCli();

    expect(mockImportClaudeChatsFromFile).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error: --import-claude option requires a file path.');
    expect(consoleLogSpy).toHaveBeenCalledWith('Usage: node src/cli.js --import-claude <path_to_claude_export.json>');
  });

  test('--import-claude with filepath that results in zero imports', () => {
    const testFilePath = 'empty.json';
    process.argv = ['node', 'src/cli.js', '--import-claude', testFilePath];

    mockImportClaudeChatsFromFile.mockReturnValue(0); // Simulate zero chats imported

    runCli();

    expect(mockImportClaudeChatsFromFile).toHaveBeenCalledTimes(1);
    expect(mockImportClaudeChatsFromFile).toHaveBeenCalledWith(testFilePath);
    expect(consoleLogSpy).toHaveBeenCalledWith(`Importing Claude chats from: ${testFilePath}`);
  });

  test('--generate calls magazineGenerator.generateMagazine', async () => {
    process.argv = ['node', 'src/cli.js', '--generate'];

    runCli();

    // Wait for promises to resolve if generateMagazine is async
    await Promise.resolve();

    expect(mockGenerateMagazine).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith('Magazine generated: path/to/magazine.epub');
  });

  test('--template calls createTemplate', () => {
    process.argv = ['node', 'src/cli.js', '--template'];

    runCli();

    expect(mockCreateTemplate).toHaveBeenCalledTimes(1);
  });

  test('no arguments starts interactive session (mocked to exit)', () => {
     // process.argv will be reset by beforeEach to originalArgv,
     // then we set it to simulate no extra args
    process.argv = ['node', 'src/cli.js'];

    // The readline mock is set up to automatically choose '7' (Exit)
    // So, we just need to ensure runCli() is called.
    // The actual test for interactive session logic would be more complex and is out of scope here.
    runCli();

    // Check if the initial interactive message is logged
    expect(consoleLogSpy).toHaveBeenCalledWith('\n=== Personal Magazine Content Collector ===');
  });
});
