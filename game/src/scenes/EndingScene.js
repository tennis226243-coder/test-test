import { store } from '../store.js';
import { text } from '../theme.js';
import { determineEnding } from '../systems/Affection.js';

export class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }

  create() {
    this.scene.stop('World');
    this.scene.stop('HUD');
    const result = determineEnding(store.state);
    const id = result === 'friend' ? 'ending_friend' : `${result}_ending`;
    const dialogue = store.data.dialogues.find((d) => d.id === id);
    store.recordEnding(result);
    store.setState({ ...store.state, ended: result });
    this.scene.launch('Dialogue', { dialogue, heroineId: dialogue.heroine, locationId: 'shrine', onDone: () => this.showEnd() });
  }

  showEnd() {
    const { width: W, height: H } = this.scale;
    this.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0);
    const t = text(this, W / 2, H / 2 - 20, 'END', 96, '#ffffff').setOrigin(0.5).setAlpha(0);
    text(this, W / 2, H / 2 + 70, 'Space / クリックでタイトルへ', 22, '#aab0c0').setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 1, duration: 1200 });
    const back = () => this.scene.start('Title');
    this.time.delayedCall(400, () => {
      this.input.keyboard.once('keydown', back);
      this.input.once('pointerdown', back);
    });
  }
}
