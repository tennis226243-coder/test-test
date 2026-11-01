import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/systems/GameState.js';
import { getDate, advanceTime, sleep, dayType, isFestival, LAST_DAY } from '../src/systems/TimeSystem.js';

const at = (day, time = 'morning') => ({ ...createInitialState(), day, time });

test('getDate maps day index to calendar', () => {
  assert.deepEqual(getDate(at(0)), { month: 4, date: 1, weekday: 3, weekdayLabel: '水' });
  assert.equal(getDate(at(30)).month, 5); assert.equal(getDate(at(30)).date, 1);
  assert.deepEqual([getDate(at(121)).month, getDate(at(121)).date], [7, 31]);
});

test('advanceTime cycles slots and rolls to next morning, resetting talks', () => {
  let s = { ...at(0), talkedToday: { hina: true } };
  s = advanceTime(s); assert.equal(s.time, 'noon');
  s = advanceTime(advanceTime(s)); assert.equal(s.time, 'night'); assert.equal(s.talkedToday.hina, true);
  s = advanceTime(s);
  assert.deepEqual([s.day, s.time], [1, 'morning']);
  assert.deepEqual(s.talkedToday, {});
});

test('sleep goes to next morning from any slot', () => {
  const s = sleep(at(5, 'noon'));
  assert.deepEqual([s.day, s.time], [6, 'morning']);
});

test('day never passes LAST_DAY', () => {
  assert.equal(LAST_DAY, 121);
  assert.equal(advanceTime(at(121, 'night')).day, 121);
  assert.equal(sleep(at(121, 'evening')).day, 121);
  assert.ok(isFestival(at(121)));
  assert.ok(!isFestival(at(120)));
});

test('dayType', () => {
  assert.equal(dayType(at(0)), 'weekday');
  assert.equal(dayType(at(3)), 'sat');
  assert.equal(dayType(at(4)), 'sun');
});

test('functions do not mutate input', () => {
  const s = at(0);
  advanceTime(s); sleep(s);
  assert.deepEqual([s.day, s.time], [0, 'morning']);
});

test('initial state shape', () => {
  const s = createInitialState();
  assert.equal(s.version, 1);
  assert.equal(s.money, 3000);
  assert.deepEqual(s.affection, { hina: 0, rei: 0, shiori: 0 });
});
