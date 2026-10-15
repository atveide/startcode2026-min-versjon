import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const firstTitle = 'En ny måte å oppleve byen på';

test('home loads local fonts and assets without runtime errors', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:5173')) externalRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ditt nyhetsbilde' })).toBeVisible();
  await expect(page.locator('.lead-image')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('700 16px Bitter') && document.fonts.check('400 16px Inter'))).toBe(true);
  expect(await page.locator('.lead-image').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
  await page.screenshot({ path: `docs/previews/home-${testInfo.project.name}.png` });
});

test('category navigation selects the matching editorial lead', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Nyhetskategorier' }).getByRole('button', { name: 'Sport', exact: true }).click();
  await expect(page.locator('.lead-title')).toHaveText('Det viktigste er å ha noen å spille med');
  await expect(page.getByRole('heading', { name: 'Sport', exact: true })).toBeVisible();
});

test('search, category and empty-state reset compose correctly', async ({ page }) => {
  await page.goto('/#/search');
  const field = page.getByRole('searchbox');
  await field.fill('Hyllen');
  await expect(page.locator('.story-card')).toHaveCount(1);
  await expect(page.locator('.card-title')).toHaveText('Hyllen som ga ting en ny runde');
  await page.getByRole('group', { name: 'Filtrer søkeresultater etter kategori' }).getByRole('button', { name: 'Sport' }).click();
  await expect(page.getByRole('heading', { name: 'Ingen treff denne gangen.' })).toBeVisible();
  await page.getByRole('button', { name: 'Nullstill søket' }).click();
  await expect(field).toHaveValue('');
  await expect(page.locator('.story-card')).toHaveCount(8);
  await field.fill('x'.repeat(150));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('saved stories persist across a reload and can be removed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: `Lagre saken: ${firstTitle}`, exact: true }).click();
  await page.goto('/#/saved');
  await expect(page.locator('.story-card')).toHaveCount(1);
  await expect(page.locator('.card-title')).toHaveText(firstTitle);
  await page.reload();
  await expect(page.locator('.story-card')).toHaveCount(1);
  await page.getByRole('button', { name: `Fjern fra lagrede: ${firstTitle}` }).click();
  await expect(page.getByRole('heading', { name: 'En god historie er verdt å ta vare på.' })).toBeVisible();
});

test('article route, visible attribution and sharing fallback work', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Blocked in test')) }, configurable: true }); });
  await page.goto('/');
  await page.getByRole('link', { name: firstTitle, exact: true }).click();
  await expect(page).toHaveURL(/#\/article\/byen-i-lomma$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(firstTitle);
  await expect(page.locator('.article-figure').getByRole('link', { name: 'Addrexoline' })).toBeVisible();
  await page.getByRole('button', { name: 'Del saken', exact: true }).click();
  await expect(page.getByLabel('Lenke til saken')).toHaveValue(/#\/article\/byen-i-lomma$/);
  await page.getByRole('link', { name: 'Tilbake til nyhetene' }).click();
  await expect(page.getByRole('heading', { name: 'Ditt nyhetsbilde' })).toBeVisible();
});

test('theme persists and uses semantic dark tokens', async ({ page }, testInfo) => {
  await page.goto('/#/account');
  await page.getByRole('button', { name: 'Mørkt', exact: true }).click();
  await expect(page.locator('.news-app')).toHaveAttribute('data-theme', 'dark');
  expect(await page.locator('.news-app').evaluate(el => getComputedStyle(el).getPropertyValue('--color-brand').trim())).toBe('#83C9ED');
  await page.reload();
  await expect(page.locator('.news-app')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/');
  await page.screenshot({ path: `docs/previews/dark-${testInfo.project.name}.png` });
});

test('component gallery shows validation, toggles and source details', async ({ page }) => {
  await page.goto('/#designsystem');
  await page.getByRole('button', { name: 'Valider eksempel' }).click();
  await expect(page.getByLabel('E-postadresse')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('E-postadresse').fill('demo@eksempel.no');
  await page.getByRole('button', { name: 'Valider eksempel' }).click();
  await expect(page.locator('#email-feedback')).toContainText('Ingenting er sendt');
  await page.getByRole('button', { name: 'Lagre eksempel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lagret eksempel' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByText('Bilder, kilder og bruksstatus', { exact: true }).click();
  await expect(page.locator('.source-credits').getByRole('link', { name: 'Cato Edvardsen' })).toBeVisible();
});

test('unknown article and corrupt local data recover gracefully', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('adressa-hackathon:saved', '{broken'));
  await page.goto('/#/article/unknown');
  await expect(page.getByRole('heading', { name: 'Denne saken finnes ikke i demoen.' })).toBeVisible();
  await page.goto('/#/saved');
  await expect(page.getByRole('heading', { name: 'En god historie er verdt å ta vare på.' })).toBeVisible();
});

test('routes fit a 320 px viewport without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const route of ['/', '/#/search', '/#/account', '/#/article/byen-i-lomma', '/#designsystem']) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true);
  }
});

test('key routes have no automated WCAG 2.1 A/AA violations in either theme', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.goto('/#/account');
    await page.getByRole('button', { name: theme === 'light' ? 'Lyst' : 'Mørkt', exact: true }).click();
    for (const route of ['/', '/#/search', '/#/article/en-tur-uten-klokke', '/#designsystem']) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(results.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })), `${route} ${theme}`).toEqual([]);
    }
  }
});
