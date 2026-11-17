import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import type { Players } from '../../src/data/types';
import { playersForConsideration } from '../../src/domain/eligibility';
import { reviseRankings } from '../../src/domain/rankings';

const { players } = reviseRankings(
  playersForConsideration(
    JSON.parse(fs.readFileSync('public/data/players.json', 'utf8')) as Players,
  ),
);
const batter = players.records.find((r) => r.role === 'batter' && r.methods.B.rank === 1)!;
const bowlers = players.records
  .filter((r) => r.role === 'bowler')
  .sort((a, b) => a.methods.B.rank! - b.methods.B.rank!)
  .slice(0, 3);

test('two-minute path: ranking, bowler profile, then three-bowler comparison', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('table', { name: 'Batting pressure rankings' })).toContainText(
    batter.methods.B.master!.toFixed(1),
  );
  const topBowler = players.identities.find((p) => p.playerId === bowlers[0].playerId)!;
  await page
    .getByRole('table', { name: 'Bowling pressure rankings' })
    .getByRole('link', { name: topBowler.name, exact: true })
    .click();
  await expect(page.getByRole('heading', { name: topBowler.name, exact: true })).toBeVisible();
  await page.goto(`/#/compare?role=bowler&ids=${bowlers.map((r) => r.playerId).join(',')}&m=B`);
  const verdict = page.getByRole('region', { name: 'Comparison Verdict' });
  await expect(verdict).toContainText(topBowler.name);
  await page.getByRole('radio', { name: 'Option C — Consistency Adjusted' }).click();
  await expect(verdict).toContainText('(Option C — Consistency Adjusted)');
  await expect(
    page.getByRole('img', { name: /Pressure score by actual match date/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('responsive layouts and full browser axe scan on each screen', async ({ page }) => {
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      '/',
      `/#/player?role=batter&id=${batter.playerId}&m=B`,
      `/#/compare?role=bowler&ids=${bowlers.map((r) => r.playerId).join(',')}&m=B`,
    ]) {
      await page.goto(route);
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('combobox')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
      ).toEqual([]);
    }
  }
});

test('independent pagination survives method and Back navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'See more batters' }).click();
  await page.getByRole('button', { name: 'Page 2', exact: true }).click();
  await page.getByRole('button', { name: 'Page 3', exact: true }).click();
  await page.getByRole('radio', { name: 'Option C — Consistency Adjusted' }).click();
  await expect(page).toHaveURL(/bp=3/);
  await expect(
    page.getByRole('table', { name: 'Bowling pressure rankings' }).getByRole('row'),
  ).toHaveCount(11);
  await page
    .getByRole('table', { name: 'Batting pressure rankings' })
    .getByRole('link')
    .first()
    .click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/bp=3/);
  await expect(
    page.getByRole('table', { name: 'Batting pressure rankings' }).getByRole('row'),
  ).toHaveCount(51);
});
