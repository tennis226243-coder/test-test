import { addAffection, addStat } from './Affection.js';
import { checkCondition } from './Conditions.js';

export { checkCondition };

export function applyEffects(state, effects) {
  if (!effects) return state;
  let s = state;
  for (const [id, d] of Object.entries(effects.affection ?? {})) s = addAffection(s, id, d);
  for (const [k, d] of Object.entries(effects.stats ?? {})) s = addStat(s, k, d);
  if (effects.money) s = { ...s, money: Math.max(0, s.money + effects.money) };
  if (effects.setFlag) s = { ...s, flags: { ...s.flags, [effects.setFlag]: true } };
  return s;
}

export class DialogueRunner {
  constructor(dialogue, state) {
    this.dialogue = dialogue;
    this._state = state;
    this.lines = dialogue.lines ?? [];
    this.index = 0;
    this._done = false;
    if (this.lines.length === 0) this._finish();
  }

  get state() { return this._state; }
  get done() { return this._done; }

  current() {
    if (this._done) return null;
    const line = this.lines[this.index];
    if (line.choice) return { choice: line.choice.filter((c) => checkCondition(c.condition, this._state)) };
    return line;
  }

  next() {
    if (this._done || this.lines[this.index]?.choice) return;
    this._advance();
  }

  choose(i) {
    const cur = this.current();
    if (!cur?.choice) return;
    const picked = cur.choice[i];
    if (!picked) return;
    this._state = applyEffects(this._state, picked.effects);
    if (picked.next) {
      this.lines = this.dialogue.branches?.[picked.next] ?? [];
      this.index = 0;
      if (this.lines.length === 0) this._finish();
    } else {
      this._advance();
    }
  }

  _advance() {
    this.index += 1;
    if (this.index >= this.lines.length) this._finish();
  }

  _finish() {
    this._done = true;
    this._state = applyEffects(this._state, this.dialogue.onComplete);
    if (this.dialogue.event) {
      const id = this.dialogue.heroine;
      this._state = { ...this._state, eventStage: { ...this._state.eventStage, [id]: Math.max(this._state.eventStage[id], this.dialogue.event) } };
    }
  }
}
