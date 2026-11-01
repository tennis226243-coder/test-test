# 潮風キャンパス

海辺の地方都市を舞台にした、2D見下ろし型のオープンワールド恋愛シミュレーションです。
4月1日から7月31日の夏祭りまで、大学生活を送りながら3人のヒロイン(全員成人)と仲を深めます。

## 遊び方

```bash
npm run serve        # http://localhost:8080/ をブラウザで開く
```

| 操作 | キーボード | スマホ |
|---|---|---|
| 移動 | 矢印キー / WASD | 左下のパッド |
| 話す・調べる・決定 | Space / Enter | 右下の「話す」ボタン、タップ |
| メニューを閉じる | Esc | 「やめる」 |

- 歩くだけでは時間は進みません。会話・場所での行動・休むと時間帯(朝→昼→夕→夜)が進みます。
- 通常会話で好感度が上がるのは1人につき1日1回まで。商店街で買ったプレゼントを渡すこともできます。
- 好感度が 20 / 40 / 60 / 75 / 90 を超えると、各ヒロインの特別イベントが起こります。
- 自宅でセーブ(3スロット)、タイトルからロードできます。
- 7月31日の夜にエンディング。最終イベントまで見たヒロインのうち、好感度が最も高い人のエンディングになります。

## Gemini で立ち絵・背景を作る

画像がなくても、名前入りのシルエットで遊べます。実写風の画像は次の手順で作ります。

1. Google AI Studio で API キーを発行し、環境変数 `GEMINI_API_KEY` に設定する
2. `pip install -r tools/requirements.txt`
3. `python3 tools/generate_portraits.py`
   - 立ち絵 3人×5表情 と 背景8か所 を `game/assets/` に保存し、`game/assets/manifest.json` を更新します
   - 結果の一覧: `tools/out/contact_sheet.html`
   - 作り直し: `--only hina:smile`(背景は `--only bg:cafe`)、全部作り直すなら `--force`
   - モデル変更: `GEMINI_IMAGE_MODEL=<モデル名>`(使えるモデルは `--list-models` で確認)

## 開発

```bash
npm install                                  # Phaser を取得(game/vendor に同梱済み)
npm test                                     # ゲームロジックとデータ検証
npm run e2e                                  # Playwright でタイトル→会話→エンディングを通しで確認
python3 -m unittest tools/test_generate.py   # 画像生成スクリプトのテスト
python3 tools/build_map.py                   # マップと場所データを再生成
```

- `src/systems/` … Phaser に依存しないゲームロジック(Node でテスト)
- `src/scenes/` … Phaser のシーン(タイトル・街・HUD・会話・エンディング)
- `src/data/` … ヒロイン設定・場所・マップ・会話シナリオ(JSON)
