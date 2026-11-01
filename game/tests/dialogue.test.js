import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/systems/GameState.js';
import { DialogueRunner, checkCondition, applyEffects } from '../src/systems/DialogueRunner.js';
import { findAvailableEvent } from '../src/systems/Affection.js';

const base = () => createInitialState();
const dlg = {
  id: 'hina_event_1', heroine: 'hina', type: 'event', event: 1,
  lines: [
    { speaker: 'hina', expression: 'smile', text: 'A' },
    { choice: [
      { text: 'yes', effects: { affection: { hina: 5 } }, next: 'a' },
      { text: 'rich', condition: { money: 99999 }, next: 'a' },
      { text: 'no', effects: { affection: { hina: 1 } }, next: 'b' },
    ] },
  ],
  branches: { a: [{ speaker: 'hina', expression: 'shy', text: 'A2' }], b: [{ speaker: 'me', text: 'B2' }] },
  onComplete: { setFlag: 'hina_event_1_done' },
};

test('runner walks lines, applies choice effects, follows branch, completes', () => {
  const r = new DialogueRunner(dlg, base());
  assert.equal(r.current().text, 'A');
  r.next();
  const c = r.current().choice;
  assert.deepEqual(c.map((x) => x.text), ['yes', 'no']);
  r.choose(0);
  assert.equal(r.state.affection.hina, 5);
  assert.equal(r.current().text, 'A2');
  assert.equal(r.done, false);
  r.next();
  assert.equal(r.done, true);
  assert.equal(r.current(), null);
  assert.equal(r.state.flags.hina_event_1_done, true);
  assert.equal(r.state.eventStage.hina, 1);
});

test('choose index refers to visible choices', () => {
  const r = new DialogueRunner(dlg, base());
  r.next(); r.choose(1);
  assert.equal(r.state.affection.hina, 1);
  assert.equal(r.current().text, 'B2');
});

test('checkCondition keys', () => {
  const s = { ...base(), day: 3, time: 'noon', flags: { f: true }, money: 500 };
  assert.ok(checkCondition(undefined, s));
  assert.ok(checkCondition({ affection: { hina: 0 } }, s));
  assert.ok(!checkCondition({ affection: { hina: 1 } }, s));
  assert.ok(checkCondition({ stats: { int: 10 } }, s));
  assert.ok(!checkCondition({ stats: { int: 11 } }, s));
  assert.ok(checkCondition({ time: ['noon'] }, s));
  assert.ok(!checkCondition({ time: ['night'] }, s));
  assert.ok(checkCondition({ dayType: ['sat'] }, s));
  assert.ok(!checkCondition({ dayType: ['weekday'] }, s));
  assert.ok(checkCondition({ flag: 'f' }, s));
  assert.ok(!checkCondition({ notFlag: 'f' }, s));
  assert.ok(!checkCondition({ money: 501 }, s));
});

test('applyEffects never makes money negative', () => {
  const s = applyEffects(base(), { money: -99999, stats: { charm: 2 }, setFlag: 'x' });
  assert.equal(s.money, 0);
  assert.equal(s.stats.charm, 12);
  assert.equal(s.flags.x, true);
});

test('findAvailableEvent honours event conditions', () => {
  const ds = [{ id: 'e', heroine: 'hina', type: 'event', event: 1, condition: { time: ['night'] } }];
  const s = { ...base(), affection: { hina: 30, rei: 0, shiori: 0 } };
  assert.equal(findAvailableEvent(s, 'hina', 'campus', ds), null);
  assert.equal(findAvailableEvent({ ...s, time: 'night' }, 'hina', 'campus', ds).id, 'e');
});
