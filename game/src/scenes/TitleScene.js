import { store } from '../store.js';
import { Menu } from '../ui/Menu.js';
import { text } from '../theme.js';
import { createInitialState } from '../systems/GameState.js';
import { TIME_LABELS } from '../systems/TimeSystem.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const { width: W, height: H } = this.scale;
    const bgKey = this.textures.exists('bg_seaside') ? 'bg_seaside' : null;
    if (bgKey) this.add.image(W / 2, H / 2, bgKey).setDisplaySize(W, H).setAlpha(0.55);
    else {
      const g = this.add.graphics();
      g.fillGradientStyle(0xffb3a7, 0xffd9a0, 0x3d8fc6, 0x1e4f7a, 1).fillRect(0, 0, W, H);
    }
    text(this, W / 2, 170, '潮風キャンパス', 84, '#ffffff', { stroke: '#1b2a3a', strokeThickness: 8 }).setOrigin(0.5);
    text(this, W / 2, 255, '― 海辺の街の、ひと夏の恋 ―', 26, '#ffffff', { stroke: '#1b2a3a', strokeThickness: 4 }).setOrigin(0.5);
    const seen = store.endingsSeen();
    if (seen.length) text(this, W / 2, H - 40, `到達したエンディング: ${seen.length} / 4`, 18, '#ffffff').setOrigin(0.5);
    this.mainMenu();
  }

  mainMenu() {
    const hasSave = store.saves.list().some((s) => s && !s.corrupt);
    new Menu(this, [{ label: 'ニューゲーム' }, { label: 'コンティニュー', disabled: !hasSave }], (i) => {
      if (i === 0) this.startGame(createInitialState(), true);
      else this.slotMenu();
    }, { y: 360, width: 360 });
  }

  slotMenu() {
    const slots = store.saves.list();
    const items = slots.map((s, i) => ({
      label: s == null ? `スロット${i + 1}: (空き)` : s.corrupt ? `スロット${i + 1}: 破損` : `スロット${i + 1}: ${s.month}月${s.date}日 ${TIME_LABELS[s.time]}`,
      disabled: s == null || s.corrupt,
    }));
    items.push({ label: '戻る' });
    new Menu(this, items, (i) => {
      if (i === slots.length) return this.mainMenu();
      const st = store.saves.load(i);
      if (st && !st.error) this.startGame(st, false);
      else this.mainMenu();
    }, { y: 330, width: 460, title: 'ロードするデータ', onCancel: () => this.mainMenu() });
  }

  startGame(state, isNew) {
    store.setState({ inventory: {}, ...state });
    this.scene.start('World', { isNew });
  }
}
