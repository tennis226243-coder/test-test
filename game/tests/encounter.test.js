import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/systems/GameState.js';
import { chooseEncounter, beginEncounter, giveGift, runAction } from '../src/systems/Encounter.js';

const hina = { id: 'hina', repeatLine: 'また明日', likes: ['sweets'], dislikes: ['book'] };
const ds = [
  { id: 't1', heroine: 'hina', type: 'talk', lines: [] },
  { id: 't2', heroine: 'hina', type: 'talk', lines: [] },
  { id: 'e1', heroine: 'hina', type: 'event', event: 1, location: 'campus', lines: [] },
];
const s0 = () => createInitialState();

test('initial state has an empty inventory', () => {
  assert.deepEqual(s0().inventory, {});
});

test('event wins over talk when unlocked', () => {
  const s = { ...s0(), affection: { ...s0().affection, hina: 20 } };
  assert.equal(chooseEncounter(s, hina, 'campus', ds, () => 0).dialogue.id, 'e1');
  assert.equal(chooseEncounter(s, hina, 'cafe', ds, () => 0).kind, 'talk');
});

test('unread talks are preferred', () => {
  const s = { ...s0(), flags: { seen_t1: true } };
  assert.equal(chooseEncounter(s, hina, 'campus', ds, () => 0).dialogue.id, 't2');
  const all = { ...s0(), flags: { seen_t1: true, seen_t2: true } };
  assert.equal(chooseEncounter(all, hina, 'campus', ds, () => 0.99).dialogue.id, 't2');
});

test('after talking today, the repeat line is used', () => {
  const s = { ...s0(), talkedToday: { hina: true }, affection: { ...s0().affection, hina: 50 } };
  const e = chooseEncounter(s, hina, 'campus', ds, () => 0);
  assert.equal(e.kind, 'repeat');
  assert.equal(e.dialogue.lines[0].text, 'また明日');
});

test('beginEncounter: talk gives +2 once and marks seen; event marks talked', () => {
  const t = beginEncounter(s0(), 'hina', { kind: 'talk', dialogue: ds[0] });
  assert.equal(t.affection.hina, 2);
  assert.equal(t.flags.seen_t1, true);
  assert.equal(t.talkedToday.hina, true);
  const e = beginEncounter(s0(), 'hina', { kind: 'event', dialogue: ds[2] });
  assert.equal(e.affection.hina, 0);
  assert.equal(e.talkedToday.hina, true);
  const r = beginEncounter(s0(), 'hina', { kind: 'repeat', dialogue: {} });
  assert.deepEqual(r, s0());
});

test('giveGift consumes an item and applies preference', () => {
  const s = { ...s0(), inventory: { sweets: 1, book: 2 } };
  const a = giveGift(s, hina, 'sweets');
  assert.equal(a.affection.hina, 8);
  assert.deepEqual(a.inventory, { book: 2 });
  assert.equal(giveGift(a, hina, 'sweets'), a); // nothing to give
  assert.equal(giveGift(s, hina, 'book').affection.hina, 0);
});

test('only one gift per heroine per day', () => {
  const s = { ...s0(), inventory: { sweets: 3 } };
  const a = giveGift(s, hina, 'sweets');
  assert.equal(a.giftedToday.hina, true);
  assert.equal(giveGift(a, hina, 'sweets'), a);
  const tomorrow = runAction(a, { id: 'rest', sleep: true }).state;
  assert.deepEqual(tomorrow.giftedToday, {});
  assert.equal(giveGift(tomorrow, hina, 'sweets').affection.hina, 16);
});

test('runAction: effects, purchases, rest, festival rest', () => {
  const work = runAction(s0(), { id: 'work', effects: { money: 2000, stats: { stamina: -2 } } });
  assert.equal(work.state.money, 5000);
  assert.equal(work.state.time, 'noon');
  assert.equal(work.advanced, true);
  const buy = runAction(s0(), { id: 'buy', item: 'book', cost: 1200 });
  assert.equal(buy.state.money, 1800);
  assert.deepEqual(buy.state.inventory, { book: 1 });
  assert.equal(buy.state.time, 'morning');
  assert.equal(runAction({ ...s0(), money: 100 }, { id: 'buy', item: 'book', cost: 1200 }).ok, false);
  const rest = runAction({ ...s0(), time: 'noon' }, { id: 'rest', sleep: true });
  assert.deepEqual([rest.state.day, rest.state.time], [1, 'morning']);
  const fest = runAction({ ...s0(), day: 121, time: 'evening' }, { id: 'rest', sleep: true });
  assert.deepEqual([fest.state.day, fest.state.time], [121, 'night']);
});
