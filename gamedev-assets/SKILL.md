---
name: gamedev-assets
description: "2Dゲームプロジェクト向けのアセットパイプラインユーティリティ。アセットマニフェストをディスク上のPNGと照合検証し、スプライトシート/タイルセットを走査して中身のあるグリッドフレームを検出、PNG寸法を報告する。さらにタイルマップ/タイルセットのデバッグと再構築（参照画像に対するタイルマップのレンダリング、デバッグオーバーレイ生成、差分重ね合わせ、不一致タイルのハイライト、必要なら総当たりでのタイル自動補完）も行う。アートの追加/更新、欠落・未使用アセットのデバッグ、スプライトシートの監査、フレーム/サイズメタデータ作成、タイルセットグリッドのデバッグ、タイルマップからのシーン画像再現に使う。"
---

# Gamedev Assets

`scripts/` に同梱されたスクリプトを使用して、ゲームのアートパイプラインを一貫性のあるデバッグしやすい状態に保ちましょう。

## Asset Index の知見（Rocky Roads より）

asset-index の規約を確立したら、自分のリポジトリに短い「実例ドキュメント」を残しておくこと。

このリポジトリでは、Love2D の asset index を構築した際の「うまくいったこと / いかなかったこと」の実践メモを以下に置いている:
- `docs/asset-index-learnings.md`

asset index を構築・管理するときに適用すべき主なポイント:
- **ネイティブ**なmanifestフォーマット（Love2D なら Lua テーブル）を優先しつつ、エクスポート用に **JSON-shaped** に保つ。
- サイズだけでなく、**アセットの使い方**（`backgrounds`、`tilesets`、`images`、`spritesheets`）でカテゴリ分けする。
- タイルセットは最初に**タイルサイズ**を決め（このパックは一貫して **16×16**）、そこから `columns/rows` を導出する。
- 多くのスプライトシートは**スパース**として扱う: フルグリッドを仮定せず、alpha ベースで**空でない** `{col,row}` フレームを計算して保存する。
- **安定した・サニタイズ済みのキー**を使う; `path` はディスク上の実体（大文字小文字・スペースを保持）として扱う。
- アセット変更後は必ず**カバレッジチェック**を実行し、manifest の信頼性を維持する。

## アニメーション正規化の知見

AI 生成のスプライトストリップや抽出したビデオフレームをゲームサイズのアニメーションフレームにインポートするとき:

- ターゲットサイズの参照として、**承認済みのインゲームフレーム** を1つ使う。
- 配置には、メタデータからの**共通ランタイムアンカー** を1つ使う。
- シーケンス全体で**共通スケール**を1つ使う。ソースが本当に不均一でない限り、フレームごとに個別にスケーリングしない。
- 共通スケールの参照を意図的に選ぶ:
  - attack や hurt など、一部のフレームが背が高くなるがポーズごとにキャラクターを再スケーリングすべきでない状態には **baseline / median-lower** のポーズ高を使う
  - crouch のような状態には **最初のフレーム** を使う（フレーム `01` がアイドル高に合い、それ以降のフレームは目に見えて低くなるべきケース）
- ビデオフレームのインポートでは、フレームセット全体にわたって**ユニオンクロップ**を1つ計算し、同じボックスで全フレームをクロップする。
- **固定センター + 固定ボトム** や既知のランタイムアンカーなど、安定したルールでフレームを揃える。ソースフレームが独立したセルとして手作業で作られていない限り、各フレームを自身のローカルシルエットから再センタリングしない。

これが重要な理由:

- フレームごとのクロップ/アライメントは、偽の横方向ドリフトや「スケートボーディング」を生む
- フレームごとのスケーリングは、武器を振り上げたポーズやダメージリアクションなど背の高いポーズを縮小しやすい
- 多くの明らかなアニメーション問題は、実際にはインポート時に生じた登録ずれの問題
- ソース動画から全フレームを保持すると、ゲーム用ループではなく繰り返しサイクルになることが多い

実践ルール:

- まずシーケンスのフレーミングを保持する
- 次に正規化する
- コリジョン/ボディ境界の導出は、正規化済みエクスポートが存在してから行う

明示的なスケーリングモードをサポートするストリップインポーターでは、次を推奨する:

- attack、hurt、または上方向のポーズ変動がある状態には `median-lower`
- crouch やアイドルに近い立ちポーズから開始する enter-and-lower 状態には `first-frame`

ビデオ由来のアニメーションについては特に:

1. モーションを明確に確認する必要があれば、まず高密度抽出を行う。
2. その高密度シーケンスを、共通クロップ・共通スケール・共通アンカーで正規化する。
3. その結果を分析素材として扱う。
4. ランタイムアセット用に1つのクリーンなループサイクルを整理する。

このリポジトリの run-animation の実験から重要な区別が確立された:

- 高密度インポートは診断に有効
- キュレーションされた単一サイクルのエクスポートは実際のゲームアセットに適している

アニメーションが「スケーティング」や横滑りをしているように見える場合、次の順で確認する:

1. フレームが個別にクロップされていないか
2. フレームが個別にセンタリングされていないか
3. 背の高いポーズが低いポーズと異なるスケーリングをされていないか
4. ソースモーション自体に本物のルートモーションドリフトが含まれていないか

キャラクターが**影の上に浮いている**ように見えたり、方向によって高さが違ったりする場合は、visible alpha bounds を確認する:

1. 各フレームの最下部の非透明ピクセルを計測する
2. 方向や状態をまたいで底部ベースラインを比較する
3. 足が共通ベースラインに乗るよう PNG フレームを正規化する（一般的には `bottomY = frameHeight - 1`）
4. その後にエンジン側のスプライトオリジンやシャドウオフセットを調整する

足の配置の問題を最初に asset manifest で直そうとしない。manifest はフレームサイズ・atlas サイズ・フレーム数・fps・場合によってはエンジンピボットを記述できるが、PNG 内の透明パディングは修正できない。エンジンにアニメーションごとのピボットメタデータがあってチームがその使用を標準化している場合を除き、ランタイムのスプライトシートを修正することを優先する。

Nearest-neighbor インポートはピクセルを保持する。正しく正規化した後でも中間ポーズがぼやけて見える場合、そのぼやけはたいていソースフレームにすでに存在している。

## Asset Index の理論

asset index（manifest）は、ゲームのすべてのアートに対する単一の信頼できる情報源として機能する構造化メタデータファイルである。以下を実現する:
- **一元化されたロード** - 論理名ですべてのアセットを参照する単一の場所
- **フレームメタデータ** - グリッドサイズ、アニメーションシーケンス、タイミング
- **バリデーション** - ディスク上のファイルがコードの期待と一致しているかを確認

### 出力フォーマット

- **JSON**（推奨）- 汎用的、あらゆるエンジンで動作
- **Lua テーブル** - Love2D または他の Lua ベースのプロジェクト向け

### アセットカテゴリ

| カテゴリ | 目的 | 主なメタデータ |
|----------|---------|--------------|
| `backgrounds` | 視差/スクロールレイヤー、静的背景 | `path`, `width`, `height` |
| `tilesets` | グリッドベースのレベルタイル | `path`, `tileWidth`, `tileHeight`, `columns`, `rows`, `margin`, `spacing` |
| `images` | 静的スプライト（アニメーションなし） | `path`, `width`, `height` |
| `spritesheets` | アニメーションスプライト | `path`, `frameWidth`, `frameHeight`, `fps`, `frames` または `animations` |

### Manifest の構造

```json
{
  “meta”: {
    “version”: 1,
    “root”: “assets/game”,
    “defaultFps”: 10
  },
  “backgrounds”: {
    “clouds”: { “path”: “Backgrounds/clouds.png”, “width”: 256, “height”: 128 }
  },
  “tilesets”: {
    “desert”: {
      “path”: “Tilesets/desert.png”,
      “width”: 192, “height”: 96,
      “tileWidth”: 16, “tileHeight”: 16,
      “columns”: 12, “rows”: 6
    }
  },
  “images”: {
    “deco”: {
      “bush”: { “path”: “Deco/bush.png”, “width”: 32, “height”: 16 }
    }
  },
  “spritesheets”: {
    “enemies”: {
      “chicken”: {
        “path”: “Enemies/chicken.png”,
        “width”: 224, “height”: 64,
        “frameWidth”: 32, “frameHeight”: 32,
        “columns”: 7, “rows”: 2,
        “animations”: {
          “idle”: { “fps”: 6, “frames”: [[0,0], [1,0]] },
          “run”: { “fps”: 10, “frames”: [[0,1], [1,1], [2,1], [3,1]] }
        }
      }
    }
  }
}
```

### フレーム座標

フレームはスプライトシートグリッド内の `[column, row]` ペアで参照される:
- **ゼロベースのインデックス** - 最初のセルは `[0, 0]`
- **フレームサイズで定義されるグリッド** - `frameWidth × frameHeight` で画像を分割する
- **スパースシート** - すべてのセルにコンテンツが含まれていない場合、明示的な `frames` 配列を使用する
- **名前付きアニメーション** - `animations` オブジェクト配下でフレームシーケンスとタイミングをまとめる

### ワークフロー: Asset Index の構築

1. **インベントリ** - `asset_sizes.py` を実行してすべての PNG のサイズを取得する
2. **シートのプローブ** - `asset_sheet_probe.py --frame WxH --list` を実行して空でないセルを見つける
3. **カテゴリ分け** - 各アセットが background、tileset、静的画像、spritesheet のどれかを判断する
4. **アニメーション定義** - spritesheet の場合、フレームシーケンスと fps を特定する
5. **manifest の作成** - JSON（または Love2D プロジェクトなら Lua）を作成する
6. **バリデーション** - `asset_manifest_check.py` を実行して manifest とディスクの同期を確認する

## クイックスタート（推奨: `uv`）

リポジトリルートから実行:

```bash
# 1) manifest のカバレッジチェック（manifest ↔ ディスク）
uv run scripts/asset_manifest_check.py --manifest path/to/assets_index.lua --root assets

# 1b) Lua manifest をポータブルな JSON にエクスポート（非 Lua エンジン/ツールに推奨）
uv run scripts/asset_manifest_export_json.py --manifest path/to/assets_index.lua --out path/to/assets_index.json

# 2) PNG サイズの一覧表示
uv run scripts/asset_sizes.py --root assets --json tmp/asset_sizes.json

# 3) スプライトシートの空でないフレームをプローブ
uv run scripts/asset_sheet_probe.py path/to/sheet.png --frame 32x32 --list --json tmp/probe.json

# 3b) スプライトフレーム内の visible foot baseline を監査・修正
uv run scripts/asset_sprite_baseline.py assets/characters --frame 256x256 --json tmp/baselines.json
uv run scripts/asset_sprite_baseline.py assets/characters --frame 256x256 --target-bottom 255 --out-dir tmp/baseline-fixed

# 4) manifest 駆動の GUI エディタでタイルセット/タイルマップをデバッグ
uv run scripts/asset_tilemap_editor.py --manifest path/to/assets_index.json
```

`uv` なしの場合: Python 3.11+ と Pillow をインストール。

このスキルに同梱されているすべての Python スクリプトには PEP 723 メタデータ（`# /// script ...`）が含まれているため、`uv run <script.py>` で依存関係が自動インストールされる（手動での `pip install` 不要）。

## Asset Index のエクスポート（Lua → JSON）

既存の `assets_index.lua`（Love2D スタイル）がある場合、ポータブルな `assets_index.json` にエクスポートする:

```bash
uv run scripts/asset_manifest_export_json.py \
  --manifest path/to/assets_index.lua \
  --out path/to/assets_index.json
```

デフォルトでは、エクスポーターはすべての `path` エントリを出力 manifest フォルダからの相対パスに書き換え、`meta.root` を `”.”` に設定するため、結果フォルダをコピー/zip してもそのまま動作する。

## タイルマップのデバッグ（Python タイルセット/タイルマップエディタ）

manifest 駆動のエディタを使って以下を確認する:
- `tileWidth`/`tileHeight` のグリッド計算と `columns`/`rows`
- カーソル移動が1キー押下で正確に1セル分であること
- JSON タイルマップの保存/ロードで同じレイアウトが保持されること

実行:

```bash
uv run scripts/asset_tilemap_editor.py --manifest path/to/assets_index.json
```

注意: この GUI は `tkinter` を使用しており、Python ディストリビューション/OS が提供する（`uv`/pip ではインストールされない）。

ヘッドレスエクスポート（`tkinter` 不要）:

```bash
# タイルセットのグリッドオーバーレイ PNG をエクスポート
uv run scripts/asset_tilemap_editor.py \
  --manifest path/to/assets_index.json --tileset <tileset_name> \
  --export-tileset-grid tmp/tileset_grid.png --label-ids --scale 6 --trim

# セルフテスト用タイルマップ（空でないタイルを全てその場に配置）を生成してレンダリング
uv run scripts/asset_tilemap_editor.py \
  --manifest path/to/assets_index.json --tileset <tileset_name> \
  --make-selftest-map tmp/selftest.json
uv run scripts/asset_tilemap_editor.py \
  --manifest path/to/assets_index.json --map tmp/selftest.json \
  --export-map-render tmp/selftest.png --scale 6 --trim

# オプション: 背景色を設定してタイルの背後に矩形を塗りつぶす（コンセプトモックアップに有用）
uv run scripts/asset_tilemap_editor.py \
  --manifest path/to/assets_index.json --map tmp/selftest.json \
  --export-map-render tmp/selftest_bg.png --scale 6 --bg ‘#77cfd8’ --fill-rect ‘0,40,24,6,#12a7d5’
```

操作方法:
- 矢印キー: カーソルをセル単位で移動
- `WASD`: タイルセット上のパレット選択を移動
- `Space/Enter`: 塗る、`X/Backspace`: 消す
- `[` / `]`: タイルセット切り替え、`+/-`: マップのズーム
- `F5`: クイックセーブ（デフォルトで `tilemap.json`）、`F9`: クイックロード（`--map` が必要）
- `G`: グリッド、`H`: ヘルプ

## シーンの再構築（タイルマップ → 参照画像）

これらのスクリプトは、タイル（および場合によっては背景）から組み立てられた**参照 PNG** があり、タイルセット + タイルマップからそれを再構築したい場合に使用する:
- 行ごとに反復できる（多くの場合「地面」から上方向へ）
- 決定論的なレンダリングで検証できる
- まだ差異があるタイルがどこにあるかを正確に確認できる

ヒューリスティクス（アライメント/パディング/背景）については `references/tilemap_to_reference.md` を、autofill のチューニングと将来の高速化アイデアについては `references/autofill_notes.md` を参照。

**ワークフロー（manifest 駆動、エンジン非依存）**

1) `assets_index.json` をエクスポート/準備する（Lua から始める場合）:

```bash
uv run scripts/asset_manifest_export_json.py \
  --manifest path/to/assets_index.lua \
  --out tmp/assets_index.json
```

2) 背景を合成する（オプション; 参照画像にタイルでは*ない*背景レイヤーが含まれる場合）:

```bash
uv run scripts/tile_backdrop_compose.py \
  --layers path/to/layer0.png path/to/layer1.png path/to/layer2.png \
  --out tmp/backdrop.png --scale 6 --out-scaled tmp/backdrop_x6.png
```

3) タイルに揃えた参照を準備する（ダウンスケール + グリッドオーバーレイ）:

```bash
uv run scripts/tile_reference_prepare.py \
  --reference path/to/reference.png --downscale 6 \
  --tile 16 --grid-cols 18 --grid-rows 11 --grid-origin-y 0 \
  --out-small tmp/ref_small.png --out-grid tmp/ref_grid.png --out-grid-scaled tmp/ref_grid_x6.png
```

4) タイルセット ID シートを生成する（手動修正用の「タイルピッカー」として便利）:

```bash
uv run scripts/tile_tileset_ids.py \
  --tileset path/to/tileset.png --tile 16 --scale 6 --out tmp/tileset_ids.png
```

5) ベースとなるレイヤードマップ JSON を作成する（このファイルとステップファイルを継続的に編集する）:

```json
{
  “meta”: {
    “gridWidth”: 18,
    “gridHeight”: 11,
    “tileOriginX”: 0,
    “tileOriginY”: 0,
    “canvasWidth”: 288,
    “canvasHeight”: 180,
    “layerOrder”: [“background”, “ground”, “foreground”]
  },
  “layers”: {
    “background”: [[0,0],[0,0]],
    “ground”: [[0,0],[0,0]],
    “foreground”: [[0,0],[0,0]]
  }
}
```

6) デバッグオーバーレイ + diff + 不一致タイルのハイライト付きでステップをレンダリングする:

```bash
uv run scripts/tilemap_render_step.py \
  --manifest tmp/assets_index.json --root assets --tileset your_tileset_key \
  --map path/to/recreation_map.json --steps path/to/steps --step 11 \
  --backdrop tmp/backdrop.png --reference path/to/reference.png --scale 6 \
  --out-prefix tmp/recon_step11 --write-diff --write-diff-tiles-debug \
  --diff-threshold 6 --diff-tile-threshold 6
```

出力:
- `*_render.png`: クリーンなレンダリング
- `*_debug.png`: マップ座標 + タイル ID + タイルセット座標（ピンポイントの修正に有用）
- `*_diff.png`: 不一致ピクセルを示す参照色のオーバーレイ
- `*_diff_tiles_debug.png` + `*_diff_tiles.json`: 不一致タイルセルのアウトラインと `{x,y}` リスト

解決済みインデックスを `tilemap.json` として出力したい場合（`asset_tilemap_editor.py` に読み込む用）は以下を追加:

```bash
  --out-tilemap tmp/tilemap.json
```

7)（オプション）行を autofill する（ナイーブなブルートフォース; ブートストラップに有用）:

```bash
uv run scripts/tilemap_autofill_row.py \
  --manifest tmp/assets_index.json --root assets --tileset your_tileset_key \
  --map path/to/recreation_map.json --steps path/to/steps --base-step 3 \
  --reference-small tmp/ref_small.png --backdrop tmp/backdrop.png \
  --row 10 --layer ground --min-improve 1.0 --out-step path/to/steps/step_04.json
```

8) レビュー用に GIF を作成する:

```bash
uv run scripts/make_gifs.py \
  --frames ‘tmp/*step*_debug.png’ --out tmp/steps_debug.gif \
  --diff-frames ‘tmp/*step*_diff.png’ --out-diff tmp/steps_diff.gif
```

## タイルマップがない場合は? 参照画像から `tilemap.json` を生成する（ベストエフォート）

タイルマップがまだ存在しない場合、以下から直接 `tilemap.json` の初回パスを生成できる:
- タイルセット（`assets_index.json` 経由）
- 参照画像（理想的には背景も）

これはナイーブなブルートフォースマッチングを使用しており、参照にタイル以外のピクセルが含まれる場合は完璧ではない（または解決不能な）場合がある。デバッグ/diff ツールで不一致を修正できるよう、マップを**ブートストラップ**するためのものである。

```bash
uv run scripts/tilemap_from_reference.py \
  --manifest tmp/assets_index.json --root assets --tileset your_tileset_key \
  --reference path/to/reference.png \
  --backdrop-layers path/to/bg0.png path/to/bg1.png path/to/bg2.png \
  --out-dir tmp/recon_out --min-improve 1.0
```

出力には以下が含まれる:
- `tmp/recon_out/tilemap.json`（インデックス）
- `tmp/recon_out/steps/step_*.json`（改良可能な配置）

## タイルマップのデバッグ（Love2D テストシーン）

タイルサイズ/タイルセットグリッドがエンジン内で揃わない場合、このリポジトリの組み込み Love2D シーンを使って以下を確認する:
- タイルセットのグリッド計算（tileW/tileH, columns/rows, margin/spacing）
- カーソルが1キー押下で正確に1セル分移動すること
- 保存した `.lua` マップが同一の状態で読み込まれること

リポジトリルートから実行:

```bash
love .
```

操作方法:
- `1` タイルセットインスペクター: 矢印キーでセル単位に選択を移動; `[`/`]` でタイルセット切り替え; `g` でグリッド; `+/-` でズーム
- `2` タイルマップエディタ:
  - 矢印キーでマップカーソルをセル単位に移動
  - `WASD` でタイルセットシート上のパレット（選択タイル）を移動
  - `Space/Enter` で塗る、`X/Backspace` で消す
  - `Ctrl+S` でクイックセーブ、`Ctrl+L` でクイックロード（`F5`/`F9` も動作）
  - 保存されたマップは Love のセーブディレクトリの `maps/` に置かれる（保存後に表示）

## ツール

### 1) Manifest カバレッジチェック（`asset_manifest_check.py`）

ディスク上のすべての PNG が manifest に存在し、またその逆も成立することを確認する。

```bash
uv run scripts/asset_manifest_check.py
uv run scripts/asset_manifest_check.py --json tmp/coverage.json
```

### 1b) Manifest エクスポート（`asset_manifest_export_json.py`）

`assets_index.lua` を `assets_index.json` にエクスポートする（エンジン/ツール間でポータブル）:

```bash
uv run scripts/asset_manifest_export_json.py --manifest path/to/assets_index.lua --out path/to/assets_index.json
```

### 2) スプライトシートプローブ（`asset_sheet_probe.py`）

スプライトシートグリッドの空でないセルを見つける。`frames` 配列の構築に必須。

```bash
uv run scripts/asset_sheet_probe.py image.png --frame 32x32
uv run scripts/asset_sheet_probe.py folder/ --frame 16x16 --list --json tmp/probe.json
```

### 2b) スプライトベースライン監査/修正（`asset_sprite_baseline.py`）

スプライトシートグリッド内の visible alpha bounds を監査し、オプションでベースライン補正済みのコピーを出力する。

以下の場合に使用する:
- キャラクターがある方向では影の上に浮いているが別の方向では浮いていない
- 攻撃フレームから方向別のアイドルが作られた
- AI 生成シートで足の下の透明パディングが不均一
- エンジンのオリジンは正しいが、視覚的な足の配置がまだ異なる

```bash
# フレームごとの alpha bounds、visible bottom pixel、必要なシフト量をレポート
uv run scripts/asset_sprite_baseline.py public/assets/kaede --frame 256x256 --json tmp/kaede-baselines.json

# visible な足が y=255 に乗るよう修正したコピーを出力
uv run scripts/asset_sprite_baseline.py public/assets/kaede --frame 256x256 --target-bottom 255 --out-dir tmp/kaede-baseline-fixed

# オプション: ソースがアイドル/立ちポーズ想定の場合、水平センターも正規化する
uv run scripts/asset_sprite_baseline.py public/assets/kaede/idle-n.png --frame 256x256 --target-bottom 255 --target-center-x 128 --out tmp/idle-n-fixed.png
```

このスクリプトをランタイムエクスポートのガードレールとして扱う。アニメーションの品質を判断するものではなく、最終的な PNG フレームがエンジンのスプライトオリジンおよびシャドウの前提と一致していることを検証するものである。

### 3) PNG サイズ一覧（`asset_sizes.py`）

フォルダ配下のすべての PNG のサイズを取得する。

```bash
uv run scripts/asset_sizes.py
uv run scripts/asset_sizes.py --root assets/ --json tmp/sizes.json
```

### 4) タイルセット/タイルマップエディタ（`asset_tilemap_editor.py`）

タイルを選択してグリッドに描画し、タイルセットの仮定を検証する GUI ツール。

```bash
uv run scripts/asset_tilemap_editor.py --manifest path/to/assets_index.json
```
