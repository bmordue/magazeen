import { test, expect } from '@playwright/test';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'fixtures');
const SAMPLE_EXPORT = join(FIXTURES_DIR, 'sampleClaudeExport.json');

// ─── Flow 1: Home Page ──────────────────────────────────────────────────────

test.describe('Home Page', () => {
  test('loads with the upload form', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Upload Chat Export');
    await expect(page.locator('#chatExport')).toBeVisible();
    await expect(page.locator('#upload-button')).toBeVisible();
    await expect(page.locator('#upload-button')).toHaveText('Upload and Select Chats');
  });
});

// ─── Flow 2 & 3: File Upload ─────────────────────────────────────────────────

test.describe('File Upload', () => {
  test('valid Claude JSON file shows chat selection page', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chatExport').setInputFiles(SAMPLE_EXPORT);
    await page.locator('#upload-button').click();

    // 15 s timeout allows for real file I/O and session storage on the server
    await expect(page.locator('h1')).toHaveText('Select Chats to Include', { timeout: 15_000 });
    // The fixture contains 4 chats (2 with messages + 2 malformed with no messages);
    // all are presented to the user for selection
    await expect(page.locator('input[name="selectedChats"]')).toHaveCount(4);
  });

  test('chat titles are displayed after a valid upload', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chatExport').setInputFiles(SAMPLE_EXPORT);
    await page.locator('#upload-button').click();

    await expect(page.locator('h1')).toHaveText('Select Chats to Include', { timeout: 15_000 });
    await expect(page.getByText('Trouble attaching file to Mastodon post with Node.js script')).toBeVisible();
    await expect(page.getByText('Second Chat Example')).toBeVisible();
  });

  test('non-JSON file upload shows an error page', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chatExport').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is not json'),
    });
    await page.locator('#upload-button').click();

    await expect(page.locator('h1')).toHaveText('An Error Occurred', { timeout: 10_000 });
    await expect(page.locator('.error-message')).toContainText('Invalid file type');
  });

  test('malformed JSON content shows an error page', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chatExport').setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ this is not valid json }'),
    });
    await page.locator('#upload-button').click();

    await expect(page.locator('h1')).toHaveText('An Error Occurred', { timeout: 10_000 });
    await expect(page.locator('.error-message')).toContainText('Error processing uploaded file');
  });

  test('error page has a link back to home', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chatExport').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not json'),
    });
    await page.locator('#upload-button').click();

    await expect(page.locator('h1')).toHaveText('An Error Occurred', { timeout: 10_000 });
    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await expect(page.locator('h1')).toHaveText('Upload Chat Export');
  });
});

// ─── Flow 4: Chat Selection UI ────────────────────────────────────────────────

test.describe('Chat Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#chatExport').setInputFiles(SAMPLE_EXPORT);
    await page.locator('#upload-button').click();
    await expect(page.locator('h1')).toHaveText('Select Chats to Include', { timeout: 15_000 });
  });

  test('generate button is disabled when no chats are selected', async ({ page }) => {
    await expect(page.locator('#generate-button')).toBeDisabled();
  });

  test('selecting a single chat enables the generate button', async ({ page }) => {
    await page.locator('input[name="selectedChats"]').first().check();
    await expect(page.locator('#generate-button')).toBeEnabled();
  });

  test('select-all checkbox checks every chat', async ({ page }) => {
    await page.locator('#select-all-chats').check();
    const checkboxes = page.locator('input[name="selectedChats"]');
    // The fixture has 4 chats (2 with messages + 2 malformed with no messages);
    // all are listed for selection regardless of whether they have content
    await expect(checkboxes).toHaveCount(4);
    await expect(checkboxes.nth(0)).toBeChecked();
    await expect(checkboxes.nth(1)).toBeChecked();
    await expect(page.locator('#generate-button')).toBeEnabled();
  });

  test('deselecting all chats disables the generate button again', async ({ page }) => {
    await page.locator('#select-all-chats').check();
    await expect(page.locator('#generate-button')).toBeEnabled();
    await page.locator('#select-all-chats').uncheck();
    await expect(page.locator('#generate-button')).toBeDisabled();
  });
});

// ─── Flow 5: Search / Filter ──────────────────────────────────────────────────

test.describe('Chat Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#chatExport').setInputFiles(SAMPLE_EXPORT);
    await page.locator('#upload-button').click();
    await expect(page.locator('h1')).toHaveText('Select Chats to Include', { timeout: 15_000 });
  });

  test('typing in the search box hides non-matching chats', async ({ page }) => {
    await page.locator('#chat-search').fill('Mastodon');
    await expect(page.getByText('Trouble attaching file to Mastodon post with Node.js script')).toBeVisible();
    await expect(page.getByText('Second Chat Example')).not.toBeVisible();
  });

  test('clearing search via the × button restores all chats', async ({ page }) => {
    await page.locator('#chat-search').fill('Mastodon');
    await expect(page.getByText('Second Chat Example')).not.toBeVisible();
    await page.locator('#search-clear').click();
    await expect(page.getByText('Second Chat Example')).toBeVisible();
  });
});

// ─── Flow 6: EPUB Generation ──────────────────────────────────────────────────

test.describe('EPUB Generation', () => {
  test('selecting chats with messages triggers an EPUB download', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chatExport').setInputFiles(SAMPLE_EXPORT);
    await page.locator('#upload-button').click();
    await expect(page.locator('h1')).toHaveText('Select Chats to Include', { timeout: 15_000 });

    // Select only the two chats that have actual messages (valid ones)
    await page.locator('input[name="selectedChats"][value="2b147e30-8e5e-4646-b70e-cbda3d1fbaf6"]').check();
    await page.locator('input[name="selectedChats"][value="a1b2c3d4-e5f6-7890-1234-abcdef123456"]').check();
    await expect(page.locator('#generate-button')).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      page.locator('#generate-button').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/magazine-\d{4}-\d{2}\.epub/);
  });

  test('selecting a single chat with messages triggers an EPUB download', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chatExport').setInputFiles(SAMPLE_EXPORT);
    await page.locator('#upload-button').click();
    await expect(page.locator('h1')).toHaveText('Select Chats to Include', { timeout: 15_000 });

    // Select only the first valid chat
    await page.locator('input[name="selectedChats"][value="2b147e30-8e5e-4646-b70e-cbda3d1fbaf6"]').check();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      page.locator('#generate-button').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/magazine-\d{4}-\d{2}\.epub/);
  });
});
