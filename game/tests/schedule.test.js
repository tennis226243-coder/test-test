import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/systems/GameState.js';
import { locationOf, heroinesAt } from '../src/systems/Schedule.js';

const empty = { morning: null, noon: null, evening: null, night: null };
const hina = { id: 'hina', schedule: {
  weekday: { ...empty, morning: 'campus' },
  sat: { ...empty }, sun: { ...empty, noon: 'shopping' } } };
const at = (day, time) => ({ ...createInitialState(), day, time });

test('locationOf follows schedule by day type', () => {
  assert.equal(locationOf(hina, at(0, 'morning')), 'campus');
  assert.equal(locationOf(hina, at(3, 'night')), null);
  assert.equal(locationOf(hina, at(4, 'noon')), 'shopping');
});

test('everyone is at the shrine on festival day', () => {
  assert.equal(locationOf(hina, at(121, 'night')), 'shrine');
});

test('heroinesAt filters by location', () => {
  assert.deepEqual(heroinesAt([hina], at(0, 'morning'), 'campus').map(h => h.id), ['hina']);
  assert.deepEqual(heroinesAt([hina], at(0, 'morning'), 'cafe'), []);
});
