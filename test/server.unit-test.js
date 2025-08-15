import { jest } from '@jest/globals';

const mockReadFile = jest.fn();
const mockUnlink = jest.fn();
const mockKvSet = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({
  readFile: mockReadFile,
  unlink: mockUnlink,
}));

jest.unstable_mockModule('@vercel/kv', () => ({
  kv: {
    set: mockKvSet,
  },
}));

describe('Server Tests', () => {
  let processUploadedFile;

  beforeAll(async () => {
    const serverModule = await import('../src/server.js');
    processUploadedFile = serverModule.processUploadedFile;
  });

  beforeEach(() => {
    mockReadFile.mockReset();
    mockUnlink.mockReset();
    mockKvSet.mockReset();
  });

  it('should process a valid file and return session data', async () => {
    const chatData = [{ uuid: '123', name: 'Test Chat' }];
    mockReadFile.mockResolvedValue(JSON.stringify(chatData));

    const { sessionId, chats, originalFilename } = await processUploadedFile('fake/path.json', 'test.json');

    expect(mockReadFile).toHaveBeenCalledWith('fake/path.json', 'utf-8');
    expect(mockUnlink).toHaveBeenCalledWith('fake/path.json');
    expect(mockKvSet).toHaveBeenCalledWith(sessionId, JSON.stringify(chats), { ex: 900 });
    expect(sessionId).toBeDefined();
    expect(chats.length).toBe(1);
    expect(chats[0].title).toBe('Test Chat');
    expect(originalFilename).toBe('test.json');
  });

  it('should throw an error for empty chat data', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify([]));

    await expect(processUploadedFile('fake/path.json', 'test.json')).rejects.toThrow(
      'No processable chats found in the uploaded file.'
    );
  });

  it('should throw an error for invalid JSON', async () => {
    mockReadFile.mockResolvedValue('invalid json');

    await expect(processUploadedFile('fake/path.json', 'test.json')).rejects.toThrow();
  });
});
