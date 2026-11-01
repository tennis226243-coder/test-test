import { store } from '../store.js';
import { generateTileTextures, heroineSprite } from '../art/tiles.js';

/** Loads whatever generated images exist (listed in assets/manifest.json) and builds procedural textures. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const { portraits = {}, backgrounds = [] } = store.manifest;
    for (const [id, exprs] of Object.entries(portraits)) {
      for (const e of exprs) this.load.image(`portrait_${id}_${e}`, `assets/portraits/${id}/${e}.png`);
    }
    for (const loc of backgrounds) this.load.image(`bg_${loc}`, `assets/backgrounds/${loc}.jpg`);
    this.load.on('loaderror', (file) => console.warn('画像を読み込めませんでした(代替表示を使います):', file.src));
  }

  create() {
    generateTileTextures(this);
    for (const h of store.data.heroines) heroineSprite(this, h);
    this.scene.start('Title');
  }
}
