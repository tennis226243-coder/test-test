# オープンワールド恋愛シミュレーション Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ブラウザで動く 2D 見下ろし型オープンワールド恋愛シミュレーション(ヒロイン3人、4〜7月)と、Gemini で実写風立ち絵・背景を一括生成するスクリプトを作る。

**Architecture:** ゲームロジック(時間・好感度・スケジュール・会話・セーブ)は Phaser 非依存の ES モジュール (`game/src/systems/`) にし Node で単体テストする。Phaser 3 のシーンはそれらを呼ぶ薄い層。シナリオ等は JSON。画像生成は Python スクリプトが Gemini REST API を叩き `game/assets/` に書き出す。

**Tech Stack:** Phaser 3.80.1(npm から取得し `game/vendor/phaser.min.js` に同梱 — CDN はこの環境から到達不可)、素の JS(ES modules, ビルドなし)、Node 22 `node --test`、Python 3 + Pillow + 標準 `urllib`(Gemini REST)、Playwright(プリインストール済み)。

**Spec:** `docs/superpowers/specs/2026-11-01-open-world-dating-sim-design.md`

## Global Constraints

- 登場人物はすべて成人(20〜24歳)。全年齢向けの恋愛表現のみ。
- 既存の `/index.html` は変更しない。ゲームは `game/`、生成ツールは `tools/` 以下。
- 時間帯 ID: `morning` `noon` `evening` `night`(表示: 朝/昼/夕/夜)。
- 期間: 4月1日〜7月31日。7月31日が夏祭り(エンディング判定日)。
- ヒロイン ID: `hina`(20) `rei`(23) `shiori`(24)。
- 場所 ID: `campus` `library` `shopping` `cafe` `seaside` `shrine` `home` `station`。
- 表情 ID: `normal` `smile` `shy` `surprised` `sad`。
- 好感度・ステータス(`int` `charm` `stamina`)は 0〜100 にクランプ。
- イベント開放しきい値: `[20, 40, 60, 75, 90]`(各ヒロイン 5 段階)。
- 通常会話による好感度上昇は同じヒロインにつき 1 日 1 回まで。
- セーブ: localStorage、3 スロット、キー `ows_save_<slot>`、`version: 1`。自宅でのみセーブ。
- 画像パス: `game/assets/portraits/<id>/<expression>.png`(透過, 高さ1600px)、`game/assets/backgrounds/<location>.jpg`(1920×1080)。
- API キーは環境変数 `GEMINI_API_KEY`。ブラウザ側コードに API 呼び出しを入れない。
- ゲームは `game/` を静的配信(`npx http-server game` 等)して `index.html` を開けば動く。

## Review Focus

1. 夜に行動して日付が変わる/7月31日を越える — 日付が正しく進み、夏祭り日に必ずエンディングへ遷移し、8月に進まない。(Task 1, 2 にテスト)
2. 画像ファイルが無い状態での起動 — 404 でも落ちずにシルエット/単色背景にフォールバックする。(Task 7 に E2E 確認)
3. localStorage が壊れた JSON・旧バージョン・アクセス不可(例外) — 「破損」扱いでクラッシュしない。(Task 4 にテスト)
4. 会話データの参照ミス(存在しない分岐先・表情・ヒロイン) — データ検証テストで検出。(Task 5 にテスト)
5. Gemini の安全フィルタ拒否・レート制限・キー未設定 — スキップ/再試行/案内表示して他の画像生成は継続。(Task 8 にテスト)

---

### Task 1: プロジェクト土台 + GameState + TimeSystem

**Files:**
- Create: `package.json`(`"type": "module"`, scripts: `test` = `node --test game/tests/`, `serve` = `npx http-server game -p 8080 -c-1`; devDependencies: `phaser@3.80.1`)
- Create: `.gitignore`(`node_modules/`, `tools/out/`, `__pycache__/`)
- Create: `game/src/systems/GameState.js`, `game/src/systems/TimeSystem.js`
- Test: `game/tests/time.test.js`

**Interfaces:**
- Produces:
  - `createInitialState(): GameState` — `{ version:1, day:0, time:'morning', money:3000, stats:{int:10,charm:10,stamina:10}, affection:{hina:0,rei:0,shiori:0}, eventStage:{hina:0,rei:0,shiori:0}, flags:{}, talkedToday:{}, ended:null }`
  - `TIME_SLOTS = ['morning','noon','evening','night']`, `TIME_LABELS = {morning:'朝',noon:'昼',evening:'夕',night:'夜'}`
  - `LAST_DAY = 121`(day 0 = 4/1, day 121 = 7/31)。`START_WEEKDAY = 3`(4/1 は水曜、0=日)
  - `getDate(state) -> { month, date, weekday, weekdayLabel }`
  - `dayType(state) -> 'weekday'|'sat'|'sun'`
  - `advanceTime(state) -> GameState`(新オブジェクトを返す純関数。night の次は翌日 morning、`talkedToday` を `{}` に。`day` は `LAST_DAY` を超えない)
  - `sleep(state) -> GameState`(翌日 morning へ)
  - `isFestival(state) -> boolean`(`day === LAST_DAY`)

- [ ] **Step 1: テストを書く** — `game/tests/time.test.js`:
  - `getDate(day0)` → `{month:4,date:1,weekday:3}`; `day:30` → `{month:5,date:1}`; `day:121` → `{month:7,date:31}`
  - `advanceTime` を4回で day 1 morning、`talkedToday` がリセットされる
  - `sleep` は noon からでも翌日 morning
  - `day:121, time:'night'` で `advanceTime` しても `day` は 121 のまま
  - `dayType`: day 3(4/4 土) → `'sat'`、day 4 → `'sun'`、day 0 → `'weekday'`
  - 元の state オブジェクトが変更されていない
- [ ] **Step 2:** `npm install && npm test` → FAIL(モジュールなし)
- [ ] **Step 3:** 実装
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** commit `feat: game state and time system`

### Task 2: Affection + Schedule

**Files:**
- Create: `game/src/systems/Affection.js`, `game/src/systems/Schedule.js`
- Test: `game/tests/affection.test.js`, `game/tests/schedule.test.js`

**Interfaces:**
- Consumes: `GameState`, `dayType`, `isFestival`
- Produces:
  - `EVENT_THRESHOLDS = [20,40,60,75,90]`
  - `addAffection(state, id, delta) -> GameState`(0〜100 クランプ)
  - `addStat(state, stat, delta) -> GameState`(0〜100 クランプ)
  - `tryDailyTalk(state, id, delta) -> GameState`(`talkedToday[id]` が真なら好感度は変えない。常に `talkedToday[id]=true` を立てる)
  - `giftDelta(heroine, itemId) -> number`(`heroine.likes` に含む +8、`heroine.dislikes` に含む -2、それ以外 +3)
  - `findAvailableEvent(state, heroineId, locationId, dialogues) -> Dialogue|null` — `dialogue.event === state.eventStage[id]+1`、`affection >= EVENT_THRESHOLDS[stage]`、かつ `checkCondition`(Task 3)を満たす最初のもの。Task 3 の前は condition 無しとして扱い、Task 3 で接続。
  - `determineEnding(state) -> 'hina'|'rei'|'shiori'|'friend'` — `eventStage[id] >= 5` のうち好感度最大(同点は hina, rei, shiori の順)。いなければ `'friend'`。
  - `locationOf(heroine, state) -> locationId|null` — `heroine.schedule[dayType][time]`、夏祭りの日は全員 `'shrine'`
  - `heroinesAt(heroines, state, locationId) -> Heroine[]`

- [ ] **Step 1: テストを書く** — クランプ(95+10→100, 3-10→0)、`tryDailyTalk` 2回目は不変、`advanceTime` で日付変更後は再び上がる、`giftDelta` 3パターン、`determineEnding`(誰も stage5 でない→friend、hina:stage5/80 と rei:stage5/90 → rei、同点→hina)、`locationOf`(平日朝、土曜夜 null、夏祭り日 shrine)
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** commit `feat: affection and schedule systems`

### Task 3: DialogueRunner(条件・効果・分岐)

**Files:**
- Create: `game/src/systems/DialogueRunner.js`
- Modify: `game/src/systems/Affection.js`(`findAvailableEvent` で `checkCondition` を使う)
- Test: `game/tests/dialogue.test.js`

**Interfaces:**
- Consumes: `addAffection`, `addStat`
- Produces:
  - `checkCondition(cond, state) -> boolean` — 対応キー: `affection:{id:min}`, `stats:{stat:min}`, `time:[...]`, `dayType:[...]`, `flag:"name"`, `notFlag:"name"`, `money:min`。`cond` が未定義なら true。
  - `applyEffects(state, effects) -> GameState` — `affection:{id:delta}`, `stats:{stat:delta}`, `money:delta`(0未満にしない), `setFlag:"name"`
  - `class DialogueRunner { constructor(dialogue, state); current(): Line|{choice:Choice[]}|null; next(); choose(index); get state(); get done() }`
    - Line: `{speaker, expression, text}`(speaker は heroine id または `'me'` / `'narration'`)
    - Choice: `{text, effects?, next?, condition?}` — `current()` が返す choice は condition を満たすものだけ
    - `next` で `dialogue.branches[next]` に切り替え、分岐末尾で終了。終了時に `onComplete` 効果を適用し、`dialogue.event` があれば `eventStage[heroine] = event`
- Dialogue 形式は spec 3.8 に `event?: number`(1〜5)と `type: 'talk'|'event'|'ending'` を追加。

- [ ] **Step 1: テストを書く** — 行を順に進む、選択肢で効果が適用され分岐先に移る、条件付き選択肢が隠れる、終了で `onComplete.setFlag` と `eventStage` 更新、`checkCondition` 各キー、`money` が 0 未満にならない
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** commit `feat: dialogue runner`

### Task 4: SaveSystem

**Files:**
- Create: `game/src/systems/SaveSystem.js`
- Test: `game/tests/save.test.js`

**Interfaces:**
- Produces: `createSaveSystem(storage) -> { save(slot, state): boolean, load(slot): GameState|null|{error:'corrupt'}, list(): Array<null|{corrupt:true}|{month,date,time,savedAt}> }`。`SLOT_COUNT = 3`, キー `ows_save_<slot>`。`storage` は `getItem/setItem` を持つオブジェクト(テストではメモリ実装、ゲームでは `window.localStorage`)。

- [ ] **Step 1: テストを書く** — 保存→読込で同値、空スロット null、不正 JSON → `{error:'corrupt'}`、`version !== 1` → corrupt、`getItem` が例外 → corrupt、`setItem` が例外 → `save` が false、スロット範囲外(3, -1)は false/null
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** commit `feat: save system`

### Task 5: ゲームデータ(ヒロイン・場所・マップ・会話)+ 検証テスト

**Files:**
- Create: `game/src/data/heroines.json` — 各ヒロイン `{id, name, age, role, personality, appearance(英語, 画像プロンプト用), likes[], dislikes[], color, schedule:{weekday|sat|sun:{morning..night: locationId|null}}}`
- Create: `game/src/data/locations.json` — `{id, name, rect:{x,y,w,h}(タイル単位), door:{x,y}, actions:[{id,label,effects,cost?}]}`。行動: campus 授業(平日昼のみ, int+3)、library 自習(int+2)、cafe バイト(money+2000, stamina-2)、seaside ランニング(stamina+3)、shrine お参り(charm+2)、home 休む/セーブ、shopping プレゼント購入(花束1500/本1200/アクセサリー3000/スイーツ800)
- Create: `game/src/data/map.json` — 60×40 タイル。`tiles` は文字列行の配列(`.`道 `g`草 `w`水 `b`建物 `t`木 `s`砂)、`spawn:{x,y}`
- Create: `game/src/data/dialogues/{hina,rei,shiori}.json` — 各ヒロイン: 通常会話 3 本以上(`type:'talk'`, 選択肢付き)、イベント 5 本(`event:1..5`、各しきい値以上)、エンディング 1 本(`type:'ending'`)。`game/src/data/dialogues/common.json` に友達エンドと序盤のナレーション
- Create: `game/src/data/index.js` — `loadGameData(fetchFn) -> {heroines, locations, map, dialogues}`(全 JSON を読み込む)
- Test: `game/tests/data.test.js`

**Interfaces:**
- Produces: 上記 JSON 形式、`loadGameData`

- [ ] **Step 1: 検証テストを書く** — すべての会話で: `heroine` と `speaker` が既知の ID、`expression` が 5 種のいずれか、`next` が `branches` に存在、`location` が既知、各ヒロインに event 1〜5 と ending が 1 本ずつある、`schedule` の値が既知の場所か null、マップの全行が同じ長さで `rect`/`door`/`spawn` が範囲内、age が 20〜24
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** データを書く(シナリオは日本語。全年齢向け)
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** commit `feat: game data and validation`

### Task 6: Phaser 起動 + Title / World / HUD シーン

**Files:**
- Create: `game/index.html`(`vendor/phaser.min.js` を読み込み、`src/main.js` を `type="module"` で)
- Create: `game/vendor/phaser.min.js`(`node_modules/phaser/dist/phaser.min.js` をコピーしてコミット)
- Create: `game/src/main.js`(1280×720、`Phaser.Scale.FIT`、pixelArt false、シーン登録、`window.__game` を公開して E2E から状態を読めるように)
- Create: `game/src/store.js` — `{ state, data, save }` を持つ共有ストア(`setState(newState)` で更新し `'change'` イベント発火)
- Create: `game/src/art/tiles.js` — `generateTileTextures(scene)`: Graphics で各タイル 32×32 とプレイヤー/ヒロインのドット絵風スプライトを生成(ヒロインは `heroine.color`)
- Create: `game/src/scenes/TitleScene.js` — ニューゲーム/コンティニュー(スロット一覧、corrupt は「破損」表示で選択不可)
- Create: `game/src/scenes/WorldScene.js` — マップ描画、プレイヤー移動(矢印/WASD、タッチ時は画面左下に仮想パッド)、建物・水・木は衝突、カメラ追従。ヒロインを `locationOf` の場所の `door` 付近に配置し頭上に名前。Space/Enter/タップで: 近くのヒロイン → 会話開始、場所のドア → 行動メニュー。行動実行で `applyEffects` → `advanceTime`。`isFestival` かつ夜になったらエンディングへ
- Create: `game/src/scenes/HUDScene.js` — 左上に「4月1日(水) 朝」、所持金、ステータス、ヒロイン 3 人のハート(好感度)
- Create: `game/src/ui/Menu.js` — 選択肢リスト UI(上下キー/クリック)。行動メニュー・会話の選択肢・タイトルで共用

**Interfaces:**
- Consumes: Task 1〜5 の全関数とデータ
- Produces: `store`、`Menu`(`new Menu(scene, items:[{label, disabled?}], onSelect(index))`)、シーンキー `'Title' 'World' 'HUD' 'Dialogue' 'Ending'`、`scene.scene.launch('Dialogue', {dialogue, heroineId, locationId})`

- [ ] **Step 1:** `npm run serve` で起動し、Playwright スクリプト `game/tests/e2e/smoke.mjs` を書く: タイトル表示 → ニューゲーム → World で矢印キー移動するとプレイヤー座標が変わる → スクリーンショット `tools/out/world.png`
- [ ] **Step 2:** 実行 → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** 実行 → PASS、スクリーンショットを目視確認、ブラウザコンソールエラーなし
- [ ] **Step 5:** commit `feat: title, world and hud scenes`

### Task 7: Dialogue / Ending シーン + 画像フォールバック

**Files:**
- Create: `game/src/scenes/DialogueScene.js` — 背景 `bg_<location>`、立ち絵 `portrait_<id>_<expr>`(画面中央下、高さ 680px に縮小)、テキストウィンドウ(1文字ずつ表示、クリック/Space で全表示→次へ)、話者名、選択肢は `Menu`。会話選択: `findAvailableEvent` があればイベント、なければ未読優先で `type:'talk'` からランダム。通常会話の好感度は `tryDailyTalk(+2)` で付与。終了で `advanceTime` して World に戻る
- Create: `game/src/scenes/EndingScene.js` — `determineEnding` の結果のエンディング会話を再生 → 「END」表示 → タイトルへ
- Create: `game/src/art/placeholders.js` — `ensurePortrait(scene, id, expr)` / `ensureBackground(scene, loc)`: テクスチャが無ければ Graphics で名前入りシルエット(ヒロイン色)/ グラデーション背景を生成
- Create: `game/src/assetsManifest.js` — 全立ち絵・背景のパス一覧を返す。Preload で `load.image` し、`loaderror` は握りつぶしてフォールバックに任せる
- Modify: `game/tests/e2e/smoke.mjs` — ヒロインの位置へ移動(テスト用に `window.__game.debug.teleportTo(heroineId)` を用意)→ 会話 → 選択肢選択で好感度が変わる → 画像なしでもエラーなし → スクリーンショット `tools/out/dialogue.png`

- [ ] **Step 1:** E2E を拡張
- [ ] **Step 2:** 実行 → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** 実行 → PASS、スクリーンショット目視
- [ ] **Step 5:** commit `feat: dialogue and ending scenes with placeholder art`

### Task 8: Gemini 画像生成スクリプト

**Files:**
- Create: `tools/generate_portraits.py`
- Create: `tools/prompts/portrait.txt`, `tools/prompts/expression.txt`, `tools/prompts/background.txt`
- Create: `tools/requirements.txt`(`Pillow`)
- Test: `tools/test_generate.py`(`python3 -m unittest tools/test_generate.py`)

**Interfaces:**
- Consumes: `game/src/data/heroines.json`(`appearance`, `age`)、`locations.json`
- Produces: CLI `python3 tools/generate_portraits.py [--only hina:smile|bg:cafe] [--force] [--list-models]`
  - `MODEL = "..."` 定数 1 か所。`--list-models` で `GET /v1beta/models` を表示(実行時にこれで選んだ画像生成モデルに設定する)
  - `build_portrait_prompt(heroine) -> str`(テンプレートに appearance と「adult woman, age N」「photorealistic, knee-up, plain chroma green background #00FF00」を埋める)
  - `call_gemini(prompt, ref_image_bytes=None) -> bytes` — `POST /v1beta/models/{MODEL}:generateContent`、`inline_data` で参照画像、レスポンスから画像 part を取り出す。429/5xx は 2,4,8,16 秒で最大 4 回再試行。画像 part が無い(安全フィルタ等)場合は `GenerationRefused` 例外
  - `remove_green(img: PIL.Image) -> PIL.Image`(緑優位ピクセルを透過、縁は半透明、緑かぶり除去)
  - `plan_jobs(heroines, locations, only, force, exists_fn) -> list[Job]`(既存はスキップ。normal が無い表情差分ジョブは normal の後に並ぶ)
  - キー未設定なら設定方法を表示して exit 2。拒否されたジョブは最後に一覧表示。`tools/out/contact_sheet.html` を出力

- [ ] **Step 1: テストを書く** — `plan_jobs`(既存スキップ、`--only` 絞り込み、`--force`、表情差分が normal より後)、`remove_green`(純緑→alpha 0、赤→alpha 255)、`call_gemini` を `urllib` モックで: 429→成功で再試行される、画像 part なし→`GenerationRefused`、プロンプトに "adult" と年齢が含まれる、キー未設定で exit 2
- [ ] **Step 2:** `python3 -m unittest tools/test_generate.py` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** → PASS
- [ ] **Step 5:** `GEMINI_API_KEY` が設定されていれば実行して画像生成し、contact sheet を確認・コミット。未設定ならスキップしてその旨を報告
- [ ] **Step 6:** commit `feat: gemini portrait generator`

### Task 9: 仕上げ

**Files:**
- Create: `game/README.md`(遊び方・起動方法・画像生成方法)
- Modify: `game/tests/e2e/smoke.mjs` — デバッグで 7/31 夜まで進めてエンディング → タイトルに戻ることを確認

- [ ] **Step 1:** E2E にエンディング経路を追加 → 実行 → PASS
- [ ] **Step 2:** `npm test` と `python3 -m unittest tools/test_generate.py` 全 PASS
- [ ] **Step 3:** commit `docs: game readme` & push
