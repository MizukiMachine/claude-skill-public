---
name: favicon-generator
description: "洗練されたfavicon、アプリアイコン、ブラウザタブアイコン、サイトアイコン、PWAアイコン一式を生成する。新規favicon、差し替え用favicon、フレームワークのアイコンmetadata、既存プロジェクトのfaviconアイデンティティレビューが必要なときに使う。Python CLI、ブラウザプレビュー、レイヤー効果ガイド、テンプレート、Lucideアイコン、文字モノグラム、絵文字モードを含む。"
metadata:
  short-description: "favicon一式を生成"
---

# Favicon Generator

## 概要

アプリの既存ブランドアイデンティティに合わせた、本番環境対応のfaviconセットを生成する。PNG・ICO・SVGアセットの生成、実際のブラウザサイズでのアイコンプレビュー、Next.js の `metadata.icons` や標準HTMLの `<link>` タグといったフレームワークメタデータの更新が可能。

## 参照ファイル

| トピック | ファイル | 使用タイミング |
|-------|------|----------|
| レンダリング効果 | [references/effects-guide.md](references/effects-guide.md) | shadow・glow・highlight・noise・スケーリング・カラー処理の実装詳細が必要な場合 |
| Python generator | [scripts/generate_favicon.py](scripts/generate_favicon.py) | プロジェクトディレクトリへの決定的なファイル生成やCI向け生成が必要な場合 |
| ブラウザスタジオ | [scripts/generate_favicon.html](scripts/generate_favicon.html) | クイックなビジュアル探索・手動調整・横並びプレビューが必要な場合 |

## 動作モデル

faviconは小さなブランドアーティファクトであり、単なる装飾ではない。優先順位は次のとおり:

1. プロジェクトの実際のブランドマーク・アイコンライブラリ・カラーに合わせる。
2. 16pxおよび32pxで読みやすさを保つ。
3. 繊細なレイヤーエフェクトで洗練度を高める。
4. 完全なアセットセットを生成してアプリに組み込む。

アプリがすでに使用しているロゴ・アイコンが存在する場合はそれを使用する。ブランドアイコンがない場合は、製品の機能とターゲットに合ったシンプルな文字・Lucideアイコン・絵文字を選ぶ。

## まず調査する

生成の前に、対象プロジェクトを調査する:

```bash
rg "from.*lucide-react|from.*@lucide" --type ts --type tsx
rg "Logo|Header|Nav|Brand|Icon" --type ts --type tsx
rg "favicon|apple-touch-icon|manifest|metadata" .
rg "primary|brand|--.*color|themeColor" .
```

抽出する情報:

- 既存のロゴまたはブランドアイコン
- 現在のfaviconファイルとpublicアセットの配置場所
- CSSカスタムプロパティ・Tailwind config・テーマファイル・デザイントークンからのブランドカラー
- アイコンメタデータのフレームワークエントリーポイント

コードベースに認識可能なブランドマークがすでに存在する場合は、汎用アイコンを新たに作成しない。

## 生成オプション

最終的なプロジェクトアセットにはCLIを使用する:

```bash
python3 /home/mizuki2/.claude/skills/favicon-generator/scripts/generate_favicon.py \
  --letter A --style modern --output ./public

python3 /home/mizuki2/.claude/skills/favicon-generator/scripts/generate_favicon.py \
  --lucide rocket --style vibrant --output ./public

python3 /home/mizuki2/.claude/skills/favicon-generator/scripts/generate_favicon.py \
  --emoji 🚀 --style vibrant --output ./public

python3 /home/mizuki2/.claude/skills/favicon-generator/scripts/generate_favicon.py \
  --letter N --bg "#0f172a" --bg2 "#1e293b" --fg "#22d3ee" \
  --shadow 0.5 --highlight 0.3 --glow 0.2 --noise 0.04 \
  --radius 0.22 --output ./public
```

依存パッケージ:

```bash
python3 -m pip install Pillow
# Lucide のレンダリングにはさらに以下が必要:
python3 -m pip install cairosvg
```

`--emoji` はシステムにカラー絵文字フォントがインストールされている必要がある（Linuxなら `sudo apt install fonts-noto-color-emoji` でNoto Color Emojiを導入；macOSとWindowsはデフォルトで搭載）。フォントがない場合は先頭文字のモノグラムにフォールバックする。

ローカルのPythonに `pip` がない場合や隔離された単発実行が必要な場合は `uv` を使用する:

```bash
uv run --with Pillow --with cairosvg python \
  /home/mizuki2/.claude/skills/favicon-generator/scripts/generate_favicon.py \
  --lucide rocket --style vibrant --output ./public
```

ビジュアルの反復調整が重要な場合はブラウザスタジオを使用する:

```bash
xdg-open /home/mizuki2/.claude/skills/favicon-generator/scripts/generate_favicon.html
```

## テンプレート

| テンプレート | 特徴 | 適したユースケース |
|----------|-----------|----------|
| `modern` | クリーンなインディゴ/パープル | SaaSおよび生産性アプリ |
| `vibrant` | エネルギッシュなピンク/オレンジ | コンシューマーおよびソーシャルアプリ |
| `minimal` | ダークで抑えたデザイン | 開発者ツールおよびユーティリティ |
| `glass` | 輝きのあるブルー/シアン | ダッシュボードおよびアナリティクス |
| `neon` | シアングローのダーク | ゲームおよびクリエイティブツール |
| `warm` | アンバー/レッド | 食べ物・ライフスタイル・コミュニティ |
| `forest` | グリーン/ティール | 健康・環境・金融 |
| `mono` | ブラック/ホワイト | ニュートラルまたは柔軟なブランド |

組み込みLucideアイコン:

`package-plus`, `rocket`, `zap`, `star`, `heart`, `code`, `box`, `compass`, `flame`, `globe`, `layers`, `music`, `send`, `shield`, `sparkles`, `sun`, `target`, `terminal`, `wand`

プロジェクトが組み込み外のLucideアイコンを使用している場合は、`node_modules/lucide-react/dist/esm/icons/<icon-name>.js` からその定義を読み取り、SVG path要素を抽出して、generatorにローカルのワンオフエントリーを追加するか、小さなプロジェクト固有のスクリプトを作成する。

## 出力の仕様

CLIが生成するファイル:

```text
output/
├── favicon.ico
├── favicon.svg
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-48x48.png
├── favicon-64x64.png
├── favicon-128x128.png
├── apple-touch-icon.png
├── favicon-192x192.png
└── favicon-512x512.png
```

フレームワークが別の場所を要求しない限り、アプリのpublic/staticアセットディレクトリに配置する。

## インテグレーション

Next.js App Router:

```typescript
// app/layout.tsx
export const metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};
```

HTML:

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

PWA manifest:

```json
{
  "icons": [
    { "src": "/favicon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## 品質チェック

完了前に確認する:

- `favicon-16x16.png` と `favicon-32x32.png` を確認し、マークがぼやけてまとまってしまう場合はシンプルにする。
- 生成されたファイルがフレームワークの配信アセットディレクトリにあることを確認する。
- metadataまたはlinkタグが生成されたパスを正しく参照していることを確認する。
- プロジェクトがブランドトークンを公開している場合は、デフォルトテンプレートカラーよりブランドカラーを優先する。
- noiseとglowは控えめに保つ。洗練度を高めるものであり、視覚的な雑然さを生んではならない。

## 避けること

- 理由なく実際のブランドアイコンを汎用モノグラムに置き換えること。
- 512pxアイコンのみを生成してブラウザタブサイズをスキップすること。
- 大きなプレビュー用アイコンが16pxでもそのまま機能すると思い込むこと。
- プロジェクトに定義済みのカラーがあるにもかかわらず任意のブルー/パープルグラデーションを使用すること。
- faviconのインテグレーション中に無関係なブランドやレイアウトファイルを変更すること。
