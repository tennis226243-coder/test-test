import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/systems/GameState.js';
import { createSaveSystem, SLOT_COUNT } from '../src/systems/SaveSystem.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };

test('save then load round-trips', () => {
  const ss = createSaveSystem(memory());
  const s = { ...createInitialState(), day: 10, money: 1234 };
  assert.equal(ss.save(0, s), true);
  assert.deepEqual(ss.load(0), s);
});

test('empty slot is null and list reports metadata', () => {
  const store = memory();
  const ss = createSaveSystem(store);
  assert.equal(SLOT_COUNT, 3);
  assert.equal(ss.load(1), null);
  ss.save(2, { ...createInitialState(), day: 30, time: 'night' });
  store.setItem('ows_save_1', '{broken');
  const l = ss.list();
  assert.equal(l[0], null);
  assert.deepEqual(l[1], { corrupt: true });
  assert.equal(l[2].month, 5); assert.equal(l[2].date, 1); assert.equal(l[2].time, 'night');
  assert.equal(typeof l[2].savedAt, 'number');
});

test('corrupt data: bad json, wrong version, throwing storage', () => {
  const store = memory();
  const ss = createSaveSystem(store);
  store.setItem('ows_save_0', 'not json');
  assert.deepEqual(ss.load(0), { error: 'corrupt' });
  store.setItem('ows_save_0', JSON.stringify({ savedAt: 1, state: { ...createInitialState(), version: 2 } }));
  assert.deepEqual(ss.load(0), { error: 'corrupt' });
  const bad = createSaveSystem({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } });
  assert.deepEqual(bad.load(0), { error: 'corrupt' });
  assert.equal(bad.save(0, createInitialState()), false);
});

test('out-of-range slots are rejected', () => {
  const ss = createSaveSystem(memory());
  assert.equal(ss.save(3, createInitialState()), false);
  assert.equal(ss.save(-1, createInitialState()), false);
  assert.equal(ss.load(3), null);
});

test('right version but missing or malformed fields is corrupt', () => {
  const store = memory();
  const ss = createSaveSystem(store);
  const put = (state) => store.setItem('ows_save_0', JSON.stringify({ savedAt: 1, state }));
  put({ version: 1, day: 3, time: 'noon' });
  assert.deepEqual(ss.load(0), { error: 'corrupt' });
  assert.deepEqual(ss.list()[0], { corrupt: true });
  put({ ...createInitialState(), time: 'midnight' });
  assert.deepEqual(ss.load(0), { error: 'corrupt' });
  put({ ...createInitialState(), affection: { hina: 'a', rei: 0, shiori: 0 } });
  assert.deepEqual(ss.load(0), { error: 'corrupt' });
  put({ ...createInitialState(), day: 2.5 });
  assert.deepEqual(ss.load(0), { error: 'corrupt' });
});

test('older save without newer optional fields still loads with defaults', () => {
  const store = memory();
  const ss = createSaveSystem(store);
  const { inventory, giftedToday, ...old } = createInitialState();
  store.setItem('ows_save_0', JSON.stringify({ savedAt: 1, state: old }));
  const loaded = ss.load(0);
  assert.deepEqual(loaded.inventory, {});
  assert.deepEqual(loaded.giftedToday, {});
});
