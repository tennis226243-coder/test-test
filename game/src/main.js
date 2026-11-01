import { store } from './store.js';
import { loadGameData } from './data/index.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { DialogueScene } from './scenes/DialogueScene.js';
import { EndingScene } from './scenes/EndingScene.js';

async function boot() {
  store.data = await loadGameData((p) => fetch(`src/data/${p}`));
  try {
    const res = await fetch('assets/manifest.json');
    if (res.ok) store.manifest = await res.json();
  } catch { /* no generated images yet: placeholders are used */ }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#0d0f14',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, WorldScene, HUDScene, DialogueScene, EndingScene],
  });

  game.debug = {
    state: () => store.state,
    setState: (patch) => store.setState({ ...store.state, ...patch }),
    player: () => { const w = game.scene.getScene('World'); return { x: w.player.x, y: w.player.y }; },
    teleportTo: (target) => game.scene.getScene('World').teleportTo(target),
    hasChoice: () => game.scene.isActive('Dialogue') && game.scene.getScene('Dialogue').hasChoice(),
  };
  window.__game = game;
}

boot().catch((e) => {
  const el = document.getElementById('error');
  el.style.display = 'block';
  el.textContent = `ゲームの起動に失敗しました。\n\n${e.message}`;
  console.error(e);
});
