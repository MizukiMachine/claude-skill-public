---
name: sprite-sheet-maker
description: "フレームPNG画像のディレクトリを、ゲーム用スプライトシートPNGにまとめる。アニメーションフレーム、番号付きスプライトフレーム、ピクセルアートフレーム、キャラクターアクションフレーム、2Dゲーム用アセット列をスプライトシートへパックする必要があるときに使う。特に16フレームのフォルダを4x4シートにする場合に使う。"
---

# Sprite Sheet Maker

## 目的

同梱の `scripts/make_spritesheet.py` スクリプトを使って、PNGアニメーションフレームを1枚のスプライトシートにまとめる。スクリプトは純粋なPythonで書かれており、Pillow・ImageMagick・npmパッケージは不要。

## ワークフロー

1. 指定された入力ディレクトリと出力パスを使用する。いずれかが不明または曖昧な場合のみ確認する。
2. デフォルトでは自然順ファイル名ソートを行うため、`frame_2.png` は `frame_10.png` より前に並ぶ。
3. ユーザーがレイアウトを指定しない限り、デフォルトの正方形に近いグリッドを使用する。16フレームのディレクトリは `4x4` になる。
4. デフォルトで透明度を維持し、透明背景を使用する。
5. サイズが可変なキャラクターフレームには、アニメーションの足元/ベースラインのジッターを抑えるためにデフォルトの `--align bottom-center` を維持する。汎用アイコンやエフェクトには `--align center` を使用する。
6. エンジン統合でフレーム矩形やソースオフセットが必要な場合は、JSONメタデータを生成する。

## クイックコマンド

デフォルトのスプライトシート生成:

```bash
python3 "<skill>/scripts/make_spritesheet.py" --input-dir "frames" --output "spritesheet.png"
```

4列に固定してPNGの隣にメタデータを出力:

```bash
python3 "<skill>/scripts/make_spritesheet.py" --input-dir "frames" --output "spritesheet.png" --columns 4 --metadata
```

固定セルサイズ・中央揃え・スペーシングを使用:

```bash
python3 "<skill>/scripts/make_spritesheet.py" --input-dir "frames" --output "spritesheet.png" --columns 4 --cell-width 256 --cell-height 256 --align center --spacing 2
```

ファイルを書き出さずに出力内容をプレビュー:

```bash
python3 "<skill>/scripts/make_spritesheet.py" --input-dir "frames" --output "spritesheet.png" --dry-run
```

## スクリプトの動作

- 入力: RGBA・RGB・グレースケール・グレースケール+アルファ・インデックスカラーPNGを含む、非インターレース8ビットPNGファイル。
- 出力: 8ビットRGBA PNG。
- デフォルトセルサイズ: 全入力フレーム中の最大幅・最大高さ。
- デフォルトグリッド: `ceil(sqrt(frame_count))` 列と必要な行数。16フレームの場合は `4x4`。
- デフォルト順序: 自然順ファイル名ソート。
- デフォルト揃え位置: `bottom-center`。
- デフォルトのマージン・スペーシング: `0`。
- デフォルト背景: 透明。

## オプション

- `--pattern "*.png"`: `--input-dir` 内の入力ファイルを絞り込む。
- `--columns N` / `--rows N`: グリッドレイアウトを制御する。
- `--cell-width N` / `--cell-height N`: セルサイズを固定する。最大フレームより小さいセルは拒否される。
- `--align VALUE`: `top-left`・`top-center`・`top-right`・`center-left`・`center`・`center-right`・`bottom-left`・`bottom-center`・`bottom-right` のいずれか。
- `--margin N`: 外側のマージン（ピクセル単位）。
- `--spacing N`: セル間のスペーシング（ピクセル単位）。
- `--background transparent|#RRGGBB|#RRGGBBAA`: 背景の塗りつぶし。
- `--metadata [path]`: JSONメタデータを書き出す。パスを省略すると `<output>.json` に書き出す。
- `--order natural|lex`: ファイル名ソートの動作を選択する。

## トラブルシューティング

- アニメーションジッターが発生する: キャラクターには `--align bottom-center`、エフェクトには `--align center` で再実行する。
- 出力セルが大きすぎる: 入力フレームの寸法を確認する。サイズ可変なフレームはセルサイズに最大フレームサイズが使用される。
- エンジンが1行のみを想定している: `--columns <frame-count>` または `--rows 1` を使用する。
- エンジンが正確なセルサイズを想定している: `--cell-width` と `--cell-height` を指定する。
- サポートされていないPNGエラー: ソースフレームを先に非インターレース8ビットPNGに変換する。
