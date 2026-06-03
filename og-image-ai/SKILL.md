---
name: og-image-ai
description: "OpenAI GPT ImageモデルによるAIイラストと、Pillowによる決定的なテキスト合成を組み合わせて、Open Graph画像やSNSプレビュー画像を生成する。創造的/テーマ性のあるOG画像、イラスト入りブログ/記事カード、製品/ランディングページのSNSカード、`og-analysis.json` からのバッチ生成、または決定的な `og-image-creator` パイプラインのAI生成版が必要なときに使う。"
metadata:
  short-description: "AIイラストのOG画像を生成"
---

# OG Image AI

## 目的

AIが生成したビジュアル背景と鮮明な決定的テキストオーバーレイを組み合わせた、1200x630のOpen Graph画像を生成する。`og-image-creator` のクリエイティブな補完ツールとして使用し、ルート探索・メタデータ統合・プレビュー検証の代替として使用しないこと。

## 運用モデル

AIによるOG画像は、依然としてページのメタデータ契約の一部である。AIはテーマ・雰囲気・ビジュアルの具体性を担い、スクリプトはテキスト・セーフエリア・サイズ・ファイル名・manifest・プレビューページを管理する。

優先順位:

1. 正確なルートメタデータ、publicな画像パス、フレームワークネイティブな統合。
2. SNSプレビューのサムネイルサイズでも読めるテキスト。
3. 実際のプロジェクトに基づいたブランドとページタイプへの適合。
4. dry runと小さなバッチを先に行い、コストと反復を管理する。

生成前に以下を確認する:

- フレームワーク、ルーティングモデル、現在のメタデータの管理主体。
- 正規サイトURLとpublic/staticアセットディレクトリ。
- ブランドカラー、タイポグラフィ、ロゴの使い方、ビジュアルトーン、既存のOG画像。
- 安定したルートと、具体的なslugデータが必要な動的ルートパターンの区別。
- このプロジェクトにAI画像が適切かどうか、または決定的な `og-image-creator` カードがブランドに合っているかどうか。

## 使い分け

| シナリオ | og-image-ai を使う | og-image-creator を使う |
|----------|-----------------|----------------------|
| イラストや雰囲気のあるSNSカード背景 | Yes | No |
| 記事や製品ページごとのユニークなビジュアル | Yes | Maybe |
| 大規模でデザインシステムの一貫性が必要 | No | Yes |
| APIコストなし・完全に決定的な出力が必要 | No | Yes |
| メタデータ監査またはフレームワーク統合のみ | Maybe | Yes |
| 大量のルートセットの初回生成 | 小規模なキャリブレーションバッチの後のみ | Yes |

## 機能

- `og-image-creator` の `og-analysis.json` を再利用して、ルートを考慮したバッチ生成が可能。
- ページタイプとブランドカラーのpromptガイダンスを用いたGPT Image背景を生成。
- Pillowでタイトル・説明文・アクセントバー・オプションのサイト名を合成。
- デフォルトで動的ルートパターンをスキップし、`[slug]` カードを最終的なページ画像と誤認しない。
- 視覚的な確認用に `manifest.json` と `preview.html` を生成。

## 成果物

- `public/og/*.png`、またはプロジェクトに対応するpublicアセットパス。
- ルート・ファイル・サイズ・altテキストのレコードを含む `public/og/manifest.json`。
- SNSカードの比率で確認できる `public/og/preview.html`。
- ユーザーが統合を求めた場合のフレームワークネイティブなメタデータ更新。
- 生成したアセット・メタデータの編集・実施した検証の簡潔な最終サマリー。

## 参照ファイル

| トピック | ファイル | 使用場面 |
|-------|------|----------|
| Prompt設計 | [references/prompt-design.md](references/prompt-design.md) | スタイルプリセット・ページタイプヒント・カスタムprompt・テキスト禁止の指示を選ぶ場合 |
| 生成スクリプト | [scripts/generate_og_ai.py](scripts/generate_og_ai.py) | 単体画像の生成・dry-runのprompt確認・`og-analysis.json` からのバッチ生成 |

フレームワーク固有のメタデータ統合については、`og-image-creator` も使用し、その `references/framework-workflows.md` と `references/og-specifications.md` を参照すること。

## 依存関係

可能であればターゲットプロジェクトの環境を使用する:

```bash
python3 -m pip install openai Pillow
```

プロジェクトにインストールせずに実行する場合:

```bash
uv run --with openai --with Pillow python scripts/generate_og_ai.py --help
```

生成には `OPENAI_API_KEY` が必要。スクリプトのデフォルトは `gpt-image-2`・`1536x1024`・`medium` qualityで、1200x630にクロップする。調整には `--model`・`--size`・`--quality low|medium|high|auto` を使用。正確なコストを見積もる前にOpenAIの最新料金を確認すること。

## ワークフロー

### 1. 既存の状態を調査する

`og-image-creator` の決定的アナライザーから開始する:

```bash
OG_CREATOR_ROOT="${CLAUDE_HOME:-$HOME/.claude}/skills/og-image-creator"
python3 "$OG_CREATOR_ROOT/scripts/analyze_codebase.py" /path/to/project
```

生成前に `/path/to/project/og-analysis.json` を確認する。ルート・メタデータ・カラー・サイト名に誤りがあれば、プロジェクトを調査して分析結果を修正してから使用すること。

調査対象:

- `package.json`・フレームワーク設定・ルートファイル・SEOコンポーネント・レイアウト・MD/MDX frontmatter。
- 既存の `metadata`・`generateMetadata`・`<Head>`・Helmet・静的 `<meta>`・CMSによる管理。
- CSS変数・Tailwind/テーマ設定・フォント・favicon・アプリアイコン・ロゴファイル・既存のOGアセット。
- 動的ルート用の実データ。具体的なコンテンツなしに `[slug]`・`:id`・`*` パターンの最終カードを生成しないこと。

### 2. ビジュアル戦略を決める

コンテンツが雰囲気・メタファー・イラストから恩恵を受ける場合にAI背景を使う。プロジェクトが正確なブランドトークン・繰り返しのコーポレートカード・非常に低コスト・決定的な再生成を必要とする場合は `og-image-creator` を優先する。

プロジェクトのコンテキストからスタイルとコンテンツ入力を選ぶ:

- ランディングページ: 製品カテゴリ・オファー・ターゲット・ブランドカラー。
- 記事: トピック・カテゴリ・日付またはシリーズ（あれば）・ビジュアルメタファー。
- 製品: 実際の製品の表面・機能ドメイン・ワークフローの手がかり。
- ドキュメント: 控えめな技術的テクスチャと高いテキストの明瞭さ。
- 会社概要: 偽のロゴやテキストなしに、アイデンティティ・ミッション・チーム・ロケーションの手がかり。

### 3. Dry-Run Prompt

単体画像:

```bash
SKILL_ROOT="${CLAUDE_HOME:-$HOME/.claude}/skills/og-image-ai"
python3 "$SKILL_ROOT/scripts/generate_og_ai.py" \
  --title "Building Scalable APIs" \
  --description "A guide to API design patterns" \
  --style tech \
  --page-type article \
  --brand-colors "#2563eb,#14b8a6" \
  --dry-run
```

バッチのprompt確認:

```bash
SKILL_ROOT="${CLAUDE_HOME:-$HOME/.claude}/skills/og-image-ai"
python3 "$SKILL_ROOT/scripts/generate_og_ai.py" \
  --analysis ./og-analysis.json \
  --output ./public/og \
  --limit 3 \
  --dry-run
```

APIコールを使う前に、dry-run出力でありきたりな画像・ブランドの手がかりの欠落・テキスト描画リクエストの有無・ページタイプの不一致を確認する。

### 4. キャリブレーションセットを生成する

まず1〜3枚の画像を生成する:

```bash
SKILL_ROOT="${CLAUDE_HOME:-$HOME/.claude}/skills/og-image-ai"
python3 "$SKILL_ROOT/scripts/generate_og_ai.py" \
  --analysis ./og-analysis.json \
  --output ./public/og \
  --style tech \
  --quality low \
  --limit 3
```

プロジェクト固有の追加コンテキストには `--theme-hint` を使用する。`--custom-prompt` はプリセットでビジュアルの方向性を表現できない場合にのみ使用し、テキストなし・クリアゾーンの制約は維持すること。
`--brand-colors` を `--custom-prompt` と併用した場合、スクリプトはカスタムpromptの後にブランドパレットのガイダンスを追記する。

### 5. 確認と反復

`public/og/preview.html` を開くか、生成されたPNGを確認する。背景がテキストと干渉する・ありきたりに見える・ブランドが無視されている・不要なテキストが含まれる・オーバーレイで重要なビジュアルが隠れている場合は、キャリブレーションセットを再生成する。

スタイルが機能することを確認してから、安定したルートセット全体を生成する:

```bash
SKILL_ROOT="${CLAUDE_HOME:-$HOME/.claude}/skills/og-image-ai"
python3 "$SKILL_ROOT/scripts/generate_og_ai.py" \
  --analysis ./og-analysis.json \
  --output ./public/og \
  --style corporate \
  --quality medium
```

動的ルートはデフォルトでスキップされる。`--include-dynamic` はルートパターンの意図的なフォールバック画像を作成する場合にのみ使用する。最終的なslugごとのプレビューには、CMSまたはコンテンツデータから具体的なルートレコードを追加すること。
バッチ生成中に1つ以上のルートが失敗した場合、スクリプトは成功したルートのmanifestとpreviewを書き込み、失敗したルートのリストとともにnonzeroで終了する。

### 6. メタデータを統合する

ユーザーが統合を求める場合は、既存のフレームワークのメタデータパターンを使用する。ワンオフのタグブロックよりも既存のSEOヘルパーと共有レイアウトを優先する。

以下の不変条件を維持すること:

- 最終画像はpublicアセットディレクトリにある1200x630のPNG。
- `og:image` と `twitter:image` は、デプロイ済みのpublic URLまたはフレームワークで解決されるpublicパスに解決される。
- フレームワークがサポートする場合は幅・高さ・有用なaltテキストを含める。
- ソーステンプレートまたはレイアウトがメタデータを管理している場合は、生成された `dist/` やビルド出力を編集しない。

## アンチパターン

**調査前に生成する**

問題点: 画像が誤ったルート・メタデータ管理主体・カラー・アセットパスを使用する可能性がある。

改善策: `og-analysis.json` を実行または再利用し、不足点を確認してから生成する。

**モデルにタイトルを描かせるようpromptする**

問題点: 画像モデルはテキストを誤ってレンダリングする可能性があり、SNSカードのテキストは正確でなければならない。

改善策: 背景にテキストなしと指示し、すべてのタイポグラフィはPillowで合成する。

**初回から全サイトのバッチ生成を行う**

問題点: コストとスタイルの不一致がすぐに積み重なる。

改善策: dry-run promptを行い、小さなキャリブレーションセットを生成してからスケールする。

**動的ルートパターンを最終ページとして扱う**

問題点: `/blog/[slug]` のカードは、実際のコンテンツの完成したプレビューではない。

改善策: 意図的なフォールバックを作成する場合を除き動的ルートをスキップし、実データから具体的なslugごとのカードを生成する。

**正確なブランドシステムをありきたりなAIアートで置き換える**

問題点: ブランド認知が弱まり、製品から乖離した印象を与える可能性がある。

改善策: 決定的な `og-image-creator` カードを使用するか、AI画像をさりげないブランドに合った背景に限定する。

## 検証

完了前に確認すること:

- 生成ファイルが1200x630であることを確認する。
- `preview.html` を600x315以下のサイズで確認し、タイトルと説明文が読めることを確かめる。
- ラテン文字以外のタイトルの場合、選択したシステムフォントが代替ボックスではなく正しいグリフをレンダリングしていることを確認する。
- AI生成テキスト・偽のロゴ・重要な隠れた詳細が背景に含まれていないことを確認する。
- `manifest.json` のルート・ファイル名・サイズ・altテキストが正確であることを確認する。
- 統合を行った場合は、レンダリング済みまたはデプロイ済みのHTMLでメタデータを検証する。
- ファイルサイズがSNS共有に適切であることを確認し、大きすぎる場合は最適化または戦略を変更する。
