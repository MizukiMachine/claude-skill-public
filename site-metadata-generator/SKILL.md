---
name: site-metadata-generator
description: "Webプロジェクトのsite metadataを生成、監査、実装する。SEO meta tag、Open Graph/Twitter card、canonical URL、robots.txt、sitemap、Schema.org JSON-LDを含む。SEO改善、metadata追加、ソーシャル共有プレビュー作成、`sitemap.xml` 生成、構造化データ追加、crawlability監査、Next.js/Astro/Gatsby/React/Vue/Nuxt/static HTMLでのmetadata実装を求められたときに使う。"
---

# Site Metadata Generator

## 目的

このスキルを使って、Webプロジェクトを検索エンジン・ソーシャルプラットフォーム・AIクローラーに理解させる。汎用的なSEOコピーではなく、framework-nativeなmetadata・構造化データ・クロール対応ファイル・簡潔な監査記録を生成する。

## 動作モデル

metadataをセマンティックなコミュニケーションとして扱う。正しい出力は、そのページが実際に何であるか・誰のためのものか・機械がどう分類すべきかを記述する。

優先順位:

1. 正確なページの意味とユーザーの意図
2. クロール対応・canonical URL・robots.txt・sitemapの網羅
3. framework-nativeなmetadata APIと既存のプロジェクト規約
4. 重要な各ページに固有のtitle・description・ソーシャルタグ
5. ページ上に実際に存在するコンテンツに対してのみJSON-LD
6. 発見可能性に影響するパフォーマンス・モバイルの問題

実装前に確認すること:

- Framework・router・ビルドツール・既存のmetadata規約
- サイト名・canonical domain・locale・デフォルトソーシャル画像・ブランドボイス
- ページタイプ: home・product・service・article・documentation・FAQ・contact・legal・またはapp専用
- リクエストが監査・実装・sitemap生成・構造化データ作業・またはその全てかどうか
- credentialやproductionアクセスなしにローカルで実行できるチェック

## 制約事項

- production domain・評価・価格・レビュー数・著者名・公開日・住所・電話番号・ソーシャルハンドルを捏造しない。それらの情報が必要な場合は質問するか、明確に命名されたプロジェクトローカルのプレースホルダーを残す。
- canonical URL・`og:url`・sitemap URL・robotsのsitemapリンクは、同じproduction originとtrailing-slashポリシーを使用する。
- sitemapにはインデックスを意図したcanonical URLのみを含める。admin・API・auth・検索結果・リダイレクト・下書き・重複・`noindex`ページは除外する。
- JSON-LDは有効なJSONであり、frameworkが正しくレンダリングする方法で注入し、ページ上で表示・確認可能なコンテンツに限定する。
- metadataの所有権は単一であるべき。layout・route・component・CMSレイヤー間でtitle・canonical・Open Graph・JSON-LDの定義が競合しないようにする。
- ソーシャル画像のURLはproductionで解決できるものにする。frameworkが設定済みのmetadata baseからの相対アセットを確実に展開する場合を除き、絶対URLを使用する。

canonical production domain・ターゲットlocale・必要なビジネス情報が発見できず、生成されるURLや構造化データに重大な影響を与える場合は、編集前に簡潔な質問を1つする。それ以外の場合は保守的な実装を進め、前提条件を文書化する。

## 機能と成果物

このスキルでできること:

- 現在のmetadata・クロール対応・sitemap・robots・ソーシャルタグ・JSON-LDの網羅状況を監査する
- プロジェクトのnative frameworkパターンで不足しているmetadataを実装する
- `robots.txt`・framework robotsルート・`sitemap.xml`・framework sitemapルートを生成または更新する
- コンテンツを捏造せずにページタイプに適したSchema.org JSON-LDを追加する
- ブロッキングな問題・クイックウィン・変更ファイル・検証結果を含む簡潔なfindings summaryを生成する

想定される成果物:

- 編集されたroute・layout・SEOヘルパー・コンテンツ/frontmatter・設定・publicアセット・robots・またはsitemapファイル
- どのmetadataパターンがどこに適用されるかを示すページタイプマップ
- 実装ではなくレビューを求める場合の簡潔な監査レポート
- ローカル検証の出力と、デプロイ済みURLや外部アカウントが必要で実行していないチェックについての明確な注記

## リファレンスファイル

現在のタスクに必要なリファレンスのみ読み込む。

| トピック | ファイル | 使用場面 |
|-------|------|----------|
| 監査チェックリスト | [analysis-checklist.md](references/analysis-checklist.md) | 現在のSEO・クロール対応・ソーシャルタグ・schema・パフォーマンス・モバイルの基本をレビューするとき |
| Frameworkパターン | [framework-implementations.md](references/framework-implementations.md) | Next.js・Astro・Gatsby・React・Vue/Nuxt・またはstatic HTMLでmetadataを実装するとき |
| タグ完全リファレンス | [meta-tags-complete.md](references/meta-tags-complete.md) | meta・Open Graph・Twitter・canonical・robots・または検証タグを選択するとき |
| 構造化データ | [structured-data-schemas.md](references/structured-data-schemas.md) | Organization・WebSite・Article・Product・FAQPage・BreadcrumbList・LocalBusiness・Event・またはHowTo JSON-LDを追加するとき |

## ワークフロー

1. プロジェクトの構成を把握する。

   ```bash
   rg --files | rg '(^|/)(package\.json|next\.config\.(js|mjs|ts)|astro\.config\.(mjs|ts)|gatsby-config\.(js|ts)|nuxt\.config\.(js|ts)|vite\.config\.(js|ts)|index\.html|robots\.txt|sitemap\.xml|src/|app/|pages/|public/|static/)'
   rg -n "metadata|generateMetadata|<Head|next/head|react-helmet|Helmet|useHead|<title>|meta name=|property=\"og:|twitter:|application/ld\\+json|canonical|robots" .
   ```

   出力が大きい場合は、対象のrouteやページフォルダに絞って検索する。

2. 必要に応じてバンドルされたアナライザーを実行する。

   ```bash
   python3 <skill-dir>/scripts/analyze_seo.py <project-path>
   ```

   `<skill-dir>` はこの `SKILL.md` を含むディレクトリに置き換える。出力は出発点として使用し、完全な判断材料としない。一般的なファイルやタグは検出できるが、すべての動的metadataやコンテンツ戦略は理解できない。

3. ページタイプとmetadata所有権を特定する。

   metadataをroot layout・routeレベルのファイル・pageコンポーネント・content collection・CMSデータ・または共有ヘルパーのどこに置くかを決定する。新しい抽象化を追加する前に、既存のヘルパーや命名規約を再利用する。

4. サイトのmetadataコントラクトを定義する。

   canonical origin・trailing slashポリシー・デフォルトlocale・サイト名・デフォルトソーシャル画像・noindexルール・ページ情報のソースを確定する。これらのいずれかが不明でかつ要求された出力に必要な場合は、production URLを書く前に確認する。

5. ページの事実からmetadataを書く。

   Titleは固有であり、通常50〜60文字。Descriptionは固有・正確であり、通常150〜160文字。ソーシャルmetadataはクリック重視にしてもよいが、コンテンツに一致させる必要がある。

6. 表示可能なコンテンツに裏付けられた場合のみ構造化データを追加する。

   `@context: "https://schema.org"` のJSON-LDを優先する。ページが複数の関連するschemaを必要とする場合は `@graph` を使用する。ページが実際に公開していないProduct・Review・FAQ・Event・LocalBusinessのプロパティは追加しない。

7. クロール対応ファイルが不足している場合は追加する。

   `robots.txt`・framework-nativeなrobotsルート・static `sitemap.xml`・またはframework-nativeなsitemapルートを作成または更新する。sitemapにはインデックス可能なcanonical URLのみを含める。

8. ローカルで検証する。

   利用可能なプロジェクトチェックの中で最小限のものを実行し、可能であればレンダリングされたHTMLを確認し、生成されたXML/JSONを検証する。外部バリデーターはユーザーが求める場合、またはローカル環境がすでにアクセス権を持っている場合のみ使用する。

## 実装ガイダンス

### Metadataの必須事項

インデックス対象の全ページに必要なもの:

```html
<title>Page Title | Site Name</title>
<meta name="description" content="Accurate page-specific summary.">
<link rel="canonical" href="https://example.com/page">
<meta property="og:type" content="website">
<meta property="og:url" content="https://example.com/page">
<meta property="og:title" content="Page Title">
<meta property="og:description" content="Accurate page-specific summary.">
<meta property="og:image" content="https://example.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
```

frameworkがmetadata APIを提供している場合は、タグを手動編集せずにそれに合わせる。

### ページタイプの判断

| ページタイプ | Metadataの優先事項 | 構造化データ |
|-----------|-------------------|-----------------|
| ホーム・ランディング | ブランド・カテゴリー・主要な価値・デフォルトソーシャル画像 | Organization・WebSite・関連する場合はBreadcrumbList |
| 商品・ecommerce | 商品名・カテゴリー・価格/在庫状況（あれば） | 表示済みかつ正確な場合のみProduct・Offer・AggregateRating |
| 記事・ブログ | 記事タイトル・著者・公開/更新日・画像 | Article または BlogPosting・BreadcrumbList |
| ドキュメント | 具体的なタスクまたは概念・関連する場合はバージョン | 実際のQ&Aやステップに対してのみTechArticle・HowTo・FAQPage |
| FAQ | 質問指向のtitleとsummary | FAQPage |
| ローカルビジネス | サービス・市区町村/地域・問い合わせ意図 | 実際の住所/営業時間/連絡先を持つLocalBusiness |
| 法的・アカウント専用 | 基本的なmetadata・多くの場合noindex | 通常なし |

### Sitemaps

静的プロジェクトやルート発見の補助にジェネレーターを使用する:

```bash
python3 <skill-dir>/scripts/generate_sitemap.py <project-path> --domain https://example.com --output <project-path>/public/sitemap.xml
```

`<skill-dir>` はこの `SKILL.md` を含むディレクトリに置き換える。プロジェクトがすでに使用している場合は、Next.js App Router・Astroインテグレーション・Gatsbyプラグイン・またはNuxtモジュールのframework-nativeなsitemapルートを優先する。admin・API・auth・検索結果・重複・noindex・リダイレクト・未公開ページは除外する。

### Robots.txt

公開サイトの場合、許可的なデフォルトから始め、既知のプライベートまたはインデックス不要なエリアのみをブロックする:

```txt
User-agent: *
Allow: /

Disallow: /admin/
Disallow: /api/
Disallow: /private/

Sitemap: https://example.com/sitemap.xml
```

stagingおよびpreviewデプロイメントは慎重に確認する。production環境の `Disallow: /` はブロッキング問題であり、ブロックされていないstagingサイトもブロッキング問題になり得る。

## 監査モード

ユーザーがレビューまたは監査を求める場合、実装の注記よりもfindingsを先に示す。問題を深刻度順に並べる:

1. ブロッキング: インデックス除外リスク・壊れたcanonical host・無効なJSON-LD・non-canonical URLだらけのsitemap・重要ページのmetadata欠落
2. 主要: 重複したtitle/description・共有可能なページにソーシャルmetadataがない・主要なページタイプに構造化データがない・クロール/レンダリングに影響するモバイルまたはパフォーマンスの問題
3. 軽微: 表現の改善・任意の検証タグ・優先度の低いschemaの機会・metadata一貫性のクリーンアップ

各findingについて、影響を受けるファイルまたはルート・その重要性・具体的な修正方法を記載する。観察された問題に対応していない限り、一般的なSEOアドバイスはレポートから除外する。

## アンチパターン

**キーワードの詰め込み**

問題点: 繰り返しはスパム的なsnippetを生み出し、ページの価値を誤って表現する。

改善策: 実際のページと検索意図に合った具体的なtitleとdescriptionを書く。

**全ページ同一のdescription**

問題点: 検索エンジンが重複したdescriptionを無視する可能性があり、ユーザーがページを区別できなくなる。

改善策: 重要なルートにページ固有のdescriptionを生成し、優先度の低いページにのみ合理的なデフォルトを使用する。

**非表示コンテンツへのSchema**

問題点: ページに表示されていないレビュー・FAQ・価格・イベント・場所を主張する構造化データは、検索ガイドラインに違反する可能性がある。

改善策: ユーザーがページで確認・検証できる情報にのみschemaを追加する。

**Frameworkのバイパス**

問題点: 手動の `<head>` タグは重複除去・上書き・またはサーバーレンダリングの見落としが起きる可能性がある。

改善策: プロジェクトのmetadata API・layout規約・headコンポーネント・またはプラグインシステムを使用する。

**SitemapをRouteのダンプとして使用**

問題点: non-canonical・プライベート・重複・またはnoindexのURLを含めると、クロールバジェットが無駄になり、矛盾したシグナルを送ることになる。

改善策: インデックスを意図したcanonical URLのみを含める。

## バリエーションガイダンス

以下の要素に応じてアプローチを変える:

- Framework: Next.js metadata API・Astro layout props・Gatsby Head exports・React Helmet・Vue/Nuxt headヘルパー・またはstatic HTML
- 業種: ecommerce・SaaS・ローカルサービス・ドキュメント・編集系・ポートフォリオ・イベント・またはapp shell
- LocaleとDomain: canonical host・hreflang・region・および翻訳されたmetadata
- ページの重要度: 重要なページには包括的なmetadata・低価値ページには軽量なデフォルト
- コンテンツソース: ハードコードされたページ・markdown/frontmatter・CMSレコード・databaseルート・または生成されたドキュメント

以下への収束を避ける:

- 全ページタイプで同じtitleフォーマット
- 「Welcome to our website」などの汎用的なdescription
- サイズが不明またはrelative-onlyなproduction URLのソーシャル画像
- サイトに合わせずにサンプルからコピーされたJSON-LD
- 小さなnativeな変更で十分な場合に広範なSEO依存関係を追加する

## 検証

プロジェクトに合ったチェックを使用する:

```bash
python3 <skill-dir>/scripts/analyze_seo.py .
python3 -m py_compile <skill-dir>/scripts/*.py
```

また以下を確認する:

- 利用可能であればプロジェクトのlint・typecheck・テスト・またはビルドが通る
- レンダリングされたHTMLにtitleが1つ・canonical URLが1つ・期待されるdescription・ソーシャルタグ・有効なJSON-LDが含まれている
- `robots.txt` と `sitemap.xml` がアプリのpublic出力またはframeworkルートからアクセス可能
- Sitemap XMLが解析でき、canonical URLのみを含んでいる
- JSON-LDがtrailing commentやframeworkのエスケープ問題なしで解析できる
- Open Graph画像URLがproduction環境では絶対URLであり、実際の画像に解決できる

production credential・デプロイ済みURL・Search Console・または外部バリデーターが必要で実行しなかったチェックがあれば報告する。
