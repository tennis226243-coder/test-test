// End-to-end smoke test: node game/tests/e2e/smoke.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdir } from 'node:fs/promises';
import { startServer } from '../../../tools/serve.mjs';

const OUT = new URL('../../../tools/out/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });
const server = await startServer(8765);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(m.text()); });

const step = (name) => console.log(`- ${name}`);
const fail = (msg) => { throw new Error(msg); };
const sceneActive = (key) => page.evaluate((k) => window.__game?.scene.isActive(k) ?? false, key);
const waitScene = (key) => page.waitForFunction((k) => window.__game?.scene.isActive(k), key, { timeout: 10000 });
const state = () => page.evaluate(() => window.__game.debug.state());

try {
  await page.goto('http://localhost:8765/?renderer=canvas');
  await waitScene('Title');
  step('title shown');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter'); // ニューゲーム
  await waitScene('Dialogue');
  step('prologue started');
  for (let i = 0; i < 20 && (await sceneActive('Dialogue')); i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
  }
  await waitScene('World');
  if (await sceneActive('Dialogue')) fail('prologue did not finish');
  step('world shown');

  const before = await page.evaluate(() => window.__game.debug.player());
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
  const after = await page.evaluate(() => window.__game.debug.player());
  if (!(after.x > before.x)) fail(`player did not move: ${before.x} -> ${after.x}`);
  step('player moves');
  await page.screenshot({ path: `${OUT}world.png` });

  if (process.env.E2E_STAGE !== 'world') {
    // Task 7: talk to a heroine, pick a choice
    await page.evaluate(() => window.__game.debug.teleportTo('hina'));
    await page.waitForTimeout(200);
    const aff0 = (await state()).affection.hina;
    await page.keyboard.press('Space');
    await waitScene('Dialogue');
    step('dialogue with hina started');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}dialogue.png` });
    for (let i = 0; i < 30 && (await sceneActive('Dialogue')); i++) {
      const hasChoice = await page.evaluate(() => window.__game.debug.hasChoice());
      await page.keyboard.press(hasChoice ? 'Enter' : 'Space');
      await page.waitForTimeout(120);
    }
    const s1 = await state();
    if (!(s1.affection.hina > aff0)) fail(`affection did not rise: ${aff0} -> ${s1.affection.hina}`);
    if (s1.time !== 'noon') fail(`time did not advance: ${s1.time}`);
    step(`affection ${aff0} -> ${s1.affection.hina}, time advanced`);

    // Task 9: ending flow
    if (process.env.E2E_STAGE !== 'dialogue') {
      await page.evaluate(() => window.__game.debug.setState({ day: 121, time: 'evening', eventStage: { hina: 5, rei: 0, shiori: 0 }, affection: { hina: 95, rei: 0, shiori: 0 } }));
      await page.evaluate(() => window.__game.debug.teleportTo('home'));
      await page.keyboard.press('Space'); // open home menu
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter'); // 休む → festival night → ending
      await waitScene('Ending');
      step('ending started');
      for (let i = 0; i < 40 && !(await sceneActive('Title')); i++) {
        await page.keyboard.press('Space');
        await page.waitForTimeout(150);
      }
      await waitScene('Title');
      const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('ows_endings') ?? '[]'));
      if (!seen.includes('hina')) fail(`ending not recorded: ${seen}`);
      step('returned to title, ending recorded');
    }
  }
  if (errors.length) fail(`console errors:\n${errors.join('\n')}`);
  console.log('E2E PASS');
} catch (e) {
  await page.screenshot({ path: `${OUT}failure.png` }).catch(() => {});
  console.error('E2E FAIL:', e.message, errors.length ? `\nerrors: ${errors.join('\n')}` : '');
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
