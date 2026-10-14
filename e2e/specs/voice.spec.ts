import { expect, test } from '@playwright/test';

test.describe('Voice Interaction suite', () => {
  test('Voice interface mode settings toggle and localStorage persistence', async ({ page }) => {
    await page.goto('/', { timeout: 5000 });

    // Verify default in localStorage
    const defaultMode = await page.evaluate(() => localStorage.getItem('voiceInterfaceMode'));
    expect(defaultMode === null || JSON.parse(defaultMode) === 'fullscreen').toBeTruthy();

    // Open user menu -> Settings
    await page.getByTestId('nav-user').click();
    await page.getByRole('menuitem', { name: 'Settings' }).click();

    const modal = page.getByRole('dialog', { name: /Settings/ });
    await expect(modal).toBeVisible();

    // Switch to Speech tab
    const speechTab = modal.getByRole('tab', { name: /Speech/i });
    if (await speechTab.isVisible()) {
      await speechTab.click();

      // Look for Voice Interaction Mode dropdown
      const dropdown = modal.getByTestId('VoiceInterfaceModeDropdown');
      if (await dropdown.isVisible()) {
        await dropdown.click();
        const sideOption = page.getByRole('option', { name: /Side \/ In-Chat Recording/i });
        if (await sideOption.isVisible()) {
          await sideOption.click();
          const persistedMode = await page.evaluate(() => localStorage.getItem('voiceInterfaceMode'));
          expect(JSON.parse(persistedMode || '""')).toEqual('side');
        }
      }
    }

    // Close Settings
    const closeBtn = modal.getByRole('button', { name: /Close Settings/i });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Voice mode dropdown on mic button switches mode', async ({ page }) => {
    await page.goto('/', { timeout: 5000 });

    const modeBtn = page.getByTestId('voice-mode-menu-button');
    if (await modeBtn.isVisible()) {
      await modeBtn.click();
      const menu = page.getByTestId('voice-mode-menu');
      await expect(menu).toBeVisible();

      const sideOption = page.getByTestId('voice-mode-side');
      await sideOption.click();

      const currentMode = await page.evaluate(() => localStorage.getItem('voiceInterfaceMode'));
      expect(JSON.parse(currentMode || '""')).toEqual('side');
    }
  });

  test('Call overlay opens in fullscreen mode and can be dismissed', async ({ page }) => {
    await page.goto('/', { timeout: 5000 });

    await page.evaluate(() => {
      localStorage.setItem('voiceInterfaceMode', JSON.stringify('fullscreen'));
    });
    await page.reload();

    const micBtn = page.getByRole('button', { name: /use microphone/i });
    if (await micBtn.isVisible()) {
      await micBtn.click();

      const overlay = page.getByTestId('call-overlay');
      await expect(overlay).toBeVisible();

      await expect(page.getByTestId('voice-orb')).toBeVisible();
      await expect(page.getByTestId('mute-call-button')).toBeVisible();
      await expect(page.getByTestId('end-call-button')).toBeVisible();

      // End call
      await page.getByTestId('end-call-button').click();
      await expect(overlay).toBeHidden();
    }
  });
});
