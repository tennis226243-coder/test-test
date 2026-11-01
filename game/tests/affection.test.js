import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/systems/GameState.js';
import { advanceTime } from '../src/systems/TimeSystem.js';
import { addAffection, addStat, tryDailyTalk, giftDelta, determineEnding, findAvailableEvent, EVENT_THRESHOLDS } from '../src/systems/Affection.js';

const base = () => createInitialState();

test('affection and stats clamp to 0..100', () => {
  let s = { ...base(), affection: { hina: 95, rei: 3, shiori: 0 } };
  assert.equal(addAffection(s, 'hina', 10).affection.hina, 100);
  assert.equal(addAffection(s, 'rei', -10).affection.rei, 0);
  assert.equal(addStat(base(), 'int', -50).stats.int, 0);
  assert.equal(addStat(base(), 'int', 500).stats.int, 100);
});

test('daily talk raises affection once per day', () => {
  let s = tryDailyTalk(base(), 'hina', 2);
  assert.equal(s.affection.hina, 2);
  s = tryDailyTalk(s, 'hina', 2);
  assert.equal(s.affection.hina, 2);
  for (let i = 0; i < 4; i++) s = advanceTime(s);
  s = tryDailyTalk(s, 'hina', 2);
  assert.equal(s.affection.hina, 4);
});

test('giftDelta by preference', () => {
  const h = { likes: ['book'], dislikes: ['sweets'] };
  assert.equal(giftDelta(h, 'book'), 8);
  assert.equal(giftDelta(h, 'sweets'), -2);
  assert.equal(giftDelta(h, 'flowers'), 3);
});

test('determineEnding', () => {
  assert.equal(determineEnding(base()), 'friend');
  const s = { ...base(), eventStage: { hina: 5, rei: 5, shiori: 2 }, affection: { hina: 80, rei: 90, shiori: 100 } };
  assert.equal(determineEnding(s), 'rei');
  const tie = { ...s, affection: { hina: 90, rei: 90, shiori: 100 } };
  assert.equal(determineEnding(tie), 'hina');
});

test('findAvailableEvent respects stage and thresholds', () => {
  assert.deepEqual(EVENT_THRESHOLDS, [20, 40, 60, 75, 90]);
  const dialogues = [
    { id: 'e1', heroine: 'hina', type: 'event', event: 1, location: 'campus' },
    { id: 'e2', heroine: 'hina', type: 'event', event: 2, location: 'campus' },
  ];
  let s = { ...base(), affection: { hina: 19, rei: 0, shiori: 0 } };
  assert.equal(findAvailableEvent(s, 'hina', 'campus', dialogues), null);
  s = addAffection(s, 'hina', 1);
  assert.equal(findAvailableEvent(s, 'hina', 'campus', dialogues).id, 'e1');
  assert.equal(findAvailableEvent(s, 'hina', 'cafe', dialogues), null);
  s = { ...s, eventStage: { ...s.eventStage, hina: 1 }, affection: { ...s.affection, hina: 45 } };
  assert.equal(findAvailableEvent(s, 'hina', 'campus', dialogues).id, 'e2');
});
