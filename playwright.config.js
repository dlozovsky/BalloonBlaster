import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'e2e',
    timeout: 30_000,
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: 'http://127.0.0.1:8080',
        headless: true,
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'npm start',
        url: 'http://127.0.0.1:8080',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
    },
    projects: [
        { name: 'chromium', use: { browserName: 'chromium' } },
    ],
});
