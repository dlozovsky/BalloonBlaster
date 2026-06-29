import { expect, test } from '@playwright/test';

test.describe('Balloon Blaster smoke tests', () => {
    test('loads the start screen and core UI', async ({ page }) => {
        await page.goto('/');

        await expect(page).toHaveTitle(/Balloon Blaster/i);
        await expect(page.locator('#start-screen')).toBeVisible();
        await expect(page.locator('#game-title')).toHaveText('BALLOON BLASTER');
        await expect(page.locator('#start-button')).toBeVisible();
        await expect(page.locator('#fatal-error-screen')).toBeHidden();
    });

    test('initializes WebGL canvas without fatal error', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(500);

        await expect(page.locator('#fatal-error-screen')).toBeHidden();
        await expect(page.locator('canvas')).toHaveCount(1);
    });

    test('starts arcade mode from the menu', async ({ page }) => {
        await page.goto('/');

        await page.locator('input[value="arcade"]').check();
        await page.locator('#start-button').click();

        await expect(page.locator('#start-screen')).toBeHidden();
        await expect(page.locator('#score')).toHaveText('0');
        await expect(page.locator('#level')).toHaveText('1');
    });

    test('persists versioned save data after interaction', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('balloonBlasterHighScore', JSON.stringify({
                bestScore: 42,
                bestLevel: 2,
            }));
        });

        await page.goto('/');
        await page.waitForTimeout(300);

        const migrated = await page.evaluate(() => {
            const raw = localStorage.getItem('balloonBlasterSave');
            return raw ? JSON.parse(raw) : null;
        });

        expect(migrated).not.toBeNull();
        expect(migrated.version).toBe(1);
        expect(migrated.arcadeHighScore.bestScore).toBe(42);
        expect(migrated.arcadeHighScore.bestLevel).toBe(2);
    });

    test('starts arcade mode on iPhone viewport', async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            hasTouch: true,
            isMobile: true,
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        });
        const page = await context.newPage();

        await page.goto('/');
        await expect(page.locator('#start-screen')).toBeVisible();

        await page.locator('#start-button').tap();

        await expect(page.locator('#start-screen')).toBeHidden({ timeout: 10_000 });
        await expect(page.locator('#score')).toHaveText('0');
        await expect(page.locator('#mobile-hint')).toBeVisible();

        await context.close();
    });

    test('loads on iPhone even if PointerLockControls is missing', async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            hasTouch: true,
            isMobile: true,
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        });
        const page = await context.newPage();

        await page.addInitScript(() => {
            Object.defineProperty(window, 'ontouchstart', { value: () => {}, configurable: true });
            Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
        });

        await page.goto('/');
        await page.evaluate(() => {
            delete window.THREE.PointerLockControls;
        });

        await expect(page.locator('#fatal-error-screen')).toBeHidden();
        await expect(page.locator('#start-screen')).toBeVisible();

        await page.locator('#start-button').tap();
        await expect(page.locator('#start-screen')).toBeHidden({ timeout: 10_000 });

        await context.close();
    });
});
