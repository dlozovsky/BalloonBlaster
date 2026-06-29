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

    test('starts survival mode from the menu', async ({ page }) => {
        await page.goto('/');

        await page.locator('input[value="survival"]').check();
        await page.locator('#start-button').click();

        await expect(page.locator('#start-screen')).toBeHidden();
        await expect(page.locator('#level')).toHaveText('SURVIVAL');
        await expect(page.locator('#timer')).toHaveText('90');
    });

    test('pauses and resumes arcade mode with Escape', async ({ page }) => {
        await page.goto('/');

        await page.locator('#start-button').click();
        await expect(page.locator('#start-screen')).toBeHidden();

        await page.keyboard.press('Escape');
        await expect(page.locator('#pause-screen')).toBeVisible();

        await page.locator('#resume-button').click();
        await expect(page.locator('#pause-screen')).toBeHidden();
    });

    test('toggles mute from the HUD', async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            hasTouch: true,
            isMobile: true,
        });
        const page = await context.newPage();

        await page.goto('/');
        await page.locator('#start-button').tap();
        await expect(page.locator('#start-screen')).toBeHidden();

        const muteButton = page.locator('#mute-button');
        await expect(muteButton).toHaveAttribute('aria-label', 'Mute sound');

        await muteButton.tap();
        await expect(muteButton).toHaveAttribute('aria-label', 'Unmute sound');

        await page.waitForTimeout(600);
        await muteButton.tap();
        await expect(muteButton).toHaveAttribute('aria-label', 'Mute sound');

        await context.close();
    });

    test('popping a balloon increases the score in test mode', async ({ page }) => {
        await page.goto('/?test=1');
        await page.locator('#start-button').click();
        await page.waitForFunction(() => window.__bbTest?.getBalloonCount() > 0);

        await expect(page.locator('#score')).toHaveText('0');
        await page.evaluate(() => window.__bbTest.hitFirstBalloon());
        await expect(page.locator('#score')).not.toHaveText('0');
    });

    test('test hooks are only enabled with ?test=1', async ({ page }) => {
        await page.goto('/');
        await page.locator('#start-button').click();
        await page.waitForTimeout(500);

        const hasHooks = await page.evaluate(() => typeof window.__bbTest !== 'undefined');
        expect(hasHooks).toBe(false);
    });

    test('quit from pause returns to the start screen', async ({ page }) => {
        await page.goto('/');
        await page.locator('#start-button').click();
        await expect(page.locator('#start-screen')).toBeHidden();

        await page.keyboard.press('Escape');
        await expect(page.locator('#pause-screen')).toBeVisible();

        await page.locator('#pause-quit-button').click();
        await expect(page.locator('#start-screen')).toBeVisible();
        await expect(page.locator('#score')).toHaveText('0');
    });

    test('chains combo multiplier after consecutive pops in test mode', async ({ page }) => {
        await page.goto('/?test=1');
        await page.locator('#start-button').click();
        await page.waitForFunction(() => window.__bbTest?.getBalloonCount() > 1);

        const hits = await page.evaluate(() => window.__bbTest.hitNormalBalloons(2));
        expect(hits).toBe(2);
        await expect(page.locator('#combo')).toHaveText('x2');
    });

    test('animation loop advances frame count during gameplay', async ({ page }) => {
        await page.goto('/?test=1');
        await page.locator('#start-button').click();
        await page.waitForFunction(() => window.__bbTest?.getFrameCount() > 20, null, {
            timeout: 10_000,
        });

        const frameCount = await page.evaluate(() => window.__bbTest.getFrameCount());
        expect(frameCount).toBeGreaterThan(20);
    });

    test('advances to level 2 when level target is met at timer expiry', async ({ page }) => {
        await page.goto('/?test=1');
        await page.locator('#start-button').click();
        await page.waitForFunction(() => window.__bbTest?.getTargetScore() === 15);

        await page.evaluate(() => window.__bbTest.setScore(15));
        await page.evaluate(() => window.__bbTest.expireLevelTimer());

        await expect(page.locator('#level')).toHaveText('2');
        await expect(page.locator('#game-over-screen')).toBeHidden();
    });

    test('shows level failed when timer expires below target score', async ({ page }) => {
        await page.goto('/?test=1');
        await page.locator('#start-button').click();
        await page.waitForFunction(() => window.__bbTest?.getTargetScore() === 15);

        await page.evaluate(() => window.__bbTest.setScore(0));
        await page.evaluate(() => window.__bbTest.expireLevelTimer());

        await expect(page.locator('#game-over-screen')).toBeVisible();
        await expect(page.locator('#game-over-title')).toHaveText('LEVEL FAILED');
    });

    test('persists first_pop achievement after popping a balloon', async ({ page }) => {
        await page.goto('/?test=1');
        await page.locator('#start-button').click();
        await page.waitForFunction(() => window.__bbTest?.getBalloonCount() > 0);

        await page.evaluate(() => window.__bbTest.hitFirstBalloon());

        const achievements = await page.evaluate(() => window.__bbTest.getUnlockedAchievements());
        expect(achievements).toContain('first_pop');

        const stored = await page.evaluate(() => {
            const raw = localStorage.getItem('balloonBlasterSave');
            return raw ? JSON.parse(raw).achievements : [];
        });
        expect(stored).toContain('first_pop');
    });

    test('maintains healthy average frame time during gameplay', async ({ page }) => {
        await page.goto('/?test=1');
        await page.locator('#start-button').click();
        await page.waitForFunction(() => window.__bbTest?.getFrameCount() > 30, null, {
            timeout: 10_000,
        });

        const stats = await page.evaluate(() => window.__bbTest.getPerformanceStats());
        expect(stats.avgFrameMs).toBeGreaterThan(0);
        expect(stats.avgFrameMs).toBeLessThan(250);
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
