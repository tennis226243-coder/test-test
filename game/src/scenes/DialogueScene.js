import { store } from '../store.js';
import { Menu } from '../ui/Menu.js';
import { text, COLORS } from '../theme.js';
import { DialogueRunner } from '../systems/DialogueRunner.js';
import { ensurePortrait, ensureBackground } from '../art/placeholders.js';

const CHAR_MS = 28;

/** Visual-novel style conversation overlay. data: { dialogue, heroineId, locationId, onDone } */
export class DialogueScene extends Phaser.Scene {
  constructor() { super('Dialogue'); }

  create({ dialogue, heroineId, locationId, onDone }) {
    const { width: W, height: H } = this.scale;
    this.onDone = onDone;
    this.runner = new DialogueRunner(dialogue, store.state);
    this.heroineId = heroineId ?? dialogue.heroine;

    const loc = store.location(locationId ?? dialogue.location ?? 'home');
    this.bg = this.add.image(W / 2, H / 2, ensureBackground(this, loc)).setDisplaySize(W, H);
    if (store.state.time === 'night') this.add.rectangle(0, 0, W, H, 0x0b1440, 0.35).setOrigin(0);
    else if (store.state.time === 'evening') this.add.rectangle(0, 0, W, H, 0xff7a30, 0.12).setOrigin(0);
    this.portrait = this.add.image(W / 2, H - 40, '__DEFAULT').setOrigin(0.5, 1).setVisible(false);

    this.add.rectangle(40, H - 210, W - 80, 180, COLORS.panel, COLORS.panelAlpha).setOrigin(0).setStrokeStyle(2, 0xffffff, 0.25);
    this.nameBox = this.add.rectangle(60, H - 234, 220, 44, COLORS.accent, 0.95).setOrigin(0);
    this.nameText = text(this, 76, H - 226, '', 24, '#1a1020');
    this.body = text(this, 70, H - 180, '', 26, COLORS.text, { wordWrap: { width: W - 140, useAdvancedWrap: true }, lineSpacing: 10 });
    this.hint = text(this, W - 70, H - 50, '▼', 20, COLORS.sub).setOrigin(1, 1);
    this.tweens.add({ targets: this.hint, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });

    this.input.keyboard.on('keydown', (e) => {
      if (['Space', 'Enter', 'NumpadEnter'].includes(e.code)) this.proceed();
    });
    this.input.on('pointerdown', () => this.proceed());
    this.ready = false;
    this.time.delayedCall(150, () => { this.ready = true; });
    this.show();
  }

  hasChoice() { return Boolean(this.menu && !this.menu.destroyed); }

  show() {
    const cur = this.runner.current();
    if (!cur) return this.finish();
    if (cur.choice) return this.showChoice(cur.choice);
    this.setPortrait(cur);
    const name = cur.speaker === 'narration' ? '' : cur.speaker === 'me' ? 'あなた' : store.heroine(cur.speaker)?.name ?? '';
    this.nameBox.setVisible(Boolean(name));
    this.nameText.setText(name);
    this.fullText = cur.text;
    this.shown = 0;
    this.body.setText('');
    this.typing?.remove();
    this.typing = this.time.addEvent({
      delay: CHAR_MS, repeat: cur.text.length - 1,
      callback: () => { this.shown += 1; this.body.setText(this.fullText.slice(0, this.shown)); },
    });
  }

  setPortrait(line) {
    const id = store.heroine(line.speaker) ? line.speaker : null;
    if (!id) return; // narration / player keep the current portrait
    const key = ensurePortrait(this, store.heroine(id), line.expression ?? 'normal');
    this.portrait.setTexture(key).setVisible(true);
    const scale = Math.min(680 / this.portrait.height, 1);
    this.portrait.setScale(this.textures.get(key).key.startsWith('ph_') ? 1 : 680 / this.portrait.height);
    if (scale > 1) this.portrait.setScale(1);
  }

  proceed() {
    if (!this.ready || this.hasChoice() || this.finished) return;
    if (this.shown < (this.fullText?.length ?? 0)) {
      this.typing?.remove();
      this.shown = this.fullText.length;
      this.body.setText(this.fullText);
      return;
    }
    this.runner.next();
    this.show();
  }

  showChoice(choices) {
    this.hint.setVisible(false);
    this.menu = new Menu(this, choices.map((c) => ({ label: c.text })), (i) => {
      this.hint.setVisible(true);
      this.runner.choose(i);
      this.ready = false;
      this.time.delayedCall(120, () => { this.ready = true; });
      this.show();
    }, { y: 170, width: 640 });
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    store.setState(this.runner.state);
    const cb = this.onDone;
    this.scene.stop();
    cb?.();
  }
}
