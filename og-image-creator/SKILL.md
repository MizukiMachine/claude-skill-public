---
name: og-image-creator
description: "Webプロジェクト向けに、ブランドに合ったOpen Graph画像とSNSプレビュー画像を生成、レビュー、統合する。OG画像、SNSカード、`og:image` や `twitter:image` metadataの追加、ソーシャル共有画像の監査、Next.js/Astro/React/Gatsby/static HTML/blog/docs/product/landing page向けのルート対応OG画像パイプライン作成を求められたときに使う。"
---

# OG Image Creator

## 目的

共有されるサイトに自然に馴染むOpen Graph画像を作成する。まずコードベースを調査してrouteとブランドシグナルを抽出し、レビュー可能な1200x630アセットを生成し、frameworkのネイティブスタイルでmetadataを統合する。

## 動作モデル

OG画像は単独のポスターではなく、ページコントラクトとブランドシステムの一部である。正確なプレビュー、小さなソーシャルカードでの可読性、再生成の容易さを最優先に最適化する。

優先順位:
1. 正確なroute metadata、寸法、URL、アクセシビリティ。
2. 既存の色、フォント、ロゴ、コンポーネント、トーンに基づいた本物のブランドフィット。
3. 強いヒエラルキーと安全なpaddingによるサムネイルの可読性。
4. 手作業の一回限りの画像ではなく、保守可能な生成パス。

実行前に以下を確認する:
- Frameworkとroutingモデル: Next.js App Router、Pages Router、Astro、Gatsby、React SPA、static HTML、またはカスタム。
- 現在のmetadata所有者: page exports、layout component、SEO component、HTML head、MD/MDX frontmatter、またはCMSデータ。
- ブランドソース: ロゴファイル、CSS変数、Tailwind/theme config、フォント、コンポーネント、スクリーンショット、既存の画像スタイル。
- 静的 vs 動的の必要性: 固定のマーケティングページ、多数のコンテンツroute、ユーザー生成route、またはslugごとの記事カード。
- `og:image` および `twitter:image` の絶対URLに使用するサイトの正規URL。

## 機能

- Webプロジェクトを分析し、framework、route、metadata、ブランドカラー、フォント、ロゴを含む `og-analysis.json` を生成する。
- route固有の画像を `public/og/` に生成し、レビュー用の `manifest.json` と `preview.html` も出力する。
- framework nativeのmetadataを更新して、ページが正しいOpen GraphとTwitterカードタグを公開するようにする。
- 汎用的なデザイン、古いmetadata、絶対URLの欠如、コントラスト不足、不正な寸法、ファイルサイズ過大など、既存のOG画像を監査する。

## リファレンスファイル

| トピック | ファイル | 使用するとき |
|-------|------|----------|
| OG仕様とバリデーション | [og-specifications.md](references/og-specifications.md) | 寸法、metadata、URL、画像のalt text、ファイルサイズ、プラットフォームのプレビュー動作の確認 |
| デザインとコンテンツの原則 | [design-principles.md](references/design-principles.md) | レイアウト、タイポグラフィ、ヒエラルキー、ブランド使用方法、ページタイプ別のバリエーション選択 |
| Frameworkワークフロー | [framework-workflows.md](references/framework-workflows.md) | Next.js、Astro、React SPA、Gatsby、static HTMLでのmetadata統合 |

## ワークフロー

### 1. 現状の把握

アナライザーで最初のパスを実行し、ギャップが報告された箇所はコードを直接確認する。

```bash
SKILL_ROOT="${CLAUDE_HOME:-$HOME/.claude}/skills/og-image-creator"
python3 "$SKILL_ROOT/scripts/analyze_codebase.py" /path/to/project
```

スクリプトは `/path/to/project/og-analysis.json` を書き出す。画像生成前に内容を確認すること。routeやブランドシグナルが欠けている場合は、`rg` でframeworkのファイルを直接調査し、JSONにパッチを当てるかアナライザーの結果を改善してから生成する。動的routeは `dynamic: true` でマークされる。`[slug]`、`:id`、`*` のrouteを最終的な静的ページとして扱わず、実際のデータから具体的なslugごとのエントリを生成すること。

調査対象:
- `package.json`、framework config、routeフォルダ、route config、SEOコンポーネント、layoutコンポーネント、MD/MDX frontmatter。
- 既存の `<Head>`、`metadata`、`generateMetadata`、`Helmet`、またはHTML `<meta>` の所有権。
- `public/`、`src/assets/`、CSSファイル、Tailwind config、theme tokens、favicon/appアイコン、ロゴアセット。
- 既存の生成画像とソーシャルプレビューへの参照。

### 2. 戦略の選択

安定したrouteおよびブランド重要ページには静的生成画像を使用する。動的なframework画像生成は、route数またはユーザー生成コンテンツによって静的アセットが非現実的になる場合にのみ使用する。

ページタイプ別の処理を選択する:
- Landing: ブランドを前面に出し、大きなバリューステートメント、補足コピーは最小限。
- Article/blog: カテゴリ・日付（存在する場合）、タイトル、抜粋、パブリッシャーマーク。
- Product/feature: 製品名、主要なベネフィット、実際のビジュアルまたはUIキュー（存在する場合）。
- Documentation: トピックラベル、構造的な印象、高い明瞭性、抑制されたアクセント。
- About/company: ロゴとアイデンティティを前面に出し、プロフェッショナルで直接的に。

### 3. レビュー可能な画像の生成

ターゲット環境にレンダリング依存関係がない場合はインストールする:

```bash
python3 -m pip install playwright
python3 -m playwright install chromium
```

```bash
SKILL_ROOT="${CLAUDE_HOME:-$HOME/.claude}/skills/og-image-creator"
python3 "$SKILL_ROOT/scripts/generate_og_images.py" /path/to/project
```

期待される出力:
- `public/og/<route>.png`
- `public/og/manifest.json`
- `public/og/preview.html`

ビジュアル品質が重要な場合は `preview.html` を開くかスクリーンショットを撮ること。`og-analysis.json`、route、metadata、アセット、またはジェネレーターを編集した後は再生成すること。

ジェネレーターはデフォルトで動的パラメータ化routeをスキップする。`--include-dynamic` はrouteパターンのフォールバック画像を意図的に生成する場合にのみ使用すること。

### 4. Metadataの統合

検出されたframeworkに対して [framework-workflows.md](references/framework-workflows.md) を参照する。プロジェクトにすでにmetadata abstractionがある場合はそれを優先する。abstractionが存在せず複数のページにmetadataが必要な場合は、長いタグブロックを重複させるのではなく、小さな共有SEOヘルパーを作成する。

frameworkが自動解決しない場合は、デプロイ済みのソーシャルタグに絶対URLを使用する。可能な限り `og:image:width`、`og:image:height`、`og:image:alt` を含めること。

### 5. 検証

失敗モードに対応したチェックを実行する:
- 画像の寸法が1200x630であること。
- テキストがセーフエリアに収まり、小さなプレビューサイズでも読みやすいこと。
- ファイルサイズが適切であること。実用的な範囲で200 KB未満を推奨。
- Metadataがデプロイ済みHTMLの到達可能な絶対画像URLを指していること。
- キャッシュリフレッシュ後にソーシャルプレビューツールが意図した画像を表示すること。
- Metadata統合中に無関係なユーザー変更が上書きされていないこと。

## コマンドパターン

プロジェクトを分析してカスタム分析パスに書き出す:

```bash
SKILL_ROOT="${CLAUDE_HOME:-$HOME/.claude}/skills/og-image-creator"
python3 "$SKILL_ROOT/scripts/analyze_codebase.py" . --output ./tmp/og-analysis.json
```

レビュー済みの分析ファイルから生成する:

```bash
SKILL_ROOT="${CLAUDE_HOME:-$HOME/.claude}/skills/og-image-creator"
python3 "$SKILL_ROOT/scripts/generate_og_images.py" . --analysis ./tmp/og-analysis.json --out-dir ./public/og
```

イテレーション中にいくつかのrouteのみ生成する:

```bash
SKILL_ROOT="${CLAUDE_HOME:-$HOME/.claude}/skills/og-image-creator"
python3 "$SKILL_ROOT/scripts/generate_og_images.py" . --limit 3
```

それが意図した結果である場合にのみ、動的routeパターンのフォールバック画像を生成する:

```bash
SKILL_ROOT="${CLAUDE_HOME:-$HOME/.claude}/skills/og-image-creator"
python3 "$SKILL_ROOT/scripts/generate_og_images.py" . --include-dynamic
```

## アンチパターン

**調査前に生成する**

問題: 結果はrouteが欠けていたり、間違ったmetadata所有者を使っていたり、製品から乖離した印象になりがちである。

改善策: 分析を実行し、routeとブランドソースを確認してから生成する。

**すべてのrouteに同一レイアウトを使用する**

問題: ランディングページ、docs、記事、製品はそれぞれ異なる役割を持つ。

改善策: ページタイプ別にレイアウト、ヒエラルキー、ラベル、ビジュアルの強調を変える。

**汎用グラデーション＋タイトル**

問題: どのサイトにも当てはまる印象になり、ブランド認知が弱まる。

改善策: 実際のブランドトークン、ロゴアセット、コンポーネントシェイプ、スペーシング、タイポグラフィパターンを使用する。

**最終的なmetadataに相対的なソーシャル画像URLを使用する**

問題: 一部のクローラーは絶対的なパブリックURLを要求し、ローカルパスを解決できない。

改善策: サイトの正規originまたはframeworkのmetadata baseを通じて画像を解決する。

**カードに情報を詰め込みすぎる**

問題: ソーシャルプレビューはサムネイルとして表示されることが多い。

改善策: 1つの主要なアイデア、短い補足コピー、大きなフォント、安全なpaddingを使用する。

## バリエーションガイダンス

以下に基づいてバリエーションを持たせる:
- ページタイプ、コンテンツ密度、対象読者、共有コンテキスト。
- ブランドの成熟度: 確立されたデザインシステムは正確なトークンを再利用すべき。若いプロジェクトは現在のUIに合わせた抑制された生成スタイルが必要な場合がある。
- アセットの利用可能性: 実際の製品やUIビジュアルが役立つ場合は使用する。装飾的なプレースホルダーは避ける。
- 規模: 少数の静的routeは手動でレビュー可能。何百ものrouteにはテンプレート化と動的生成が必要。

以下への収束を避ける:
- すべてのページで同一のタイトル・ロゴの配置。
- サイト自体がより豊かなパレットを持つ場合の単一の支配的な色相。
- 小さなフォントに押し込まれた長いタイトル。
- プロジェクトの確立されたSEOパターンを無視したmetadata編集。
