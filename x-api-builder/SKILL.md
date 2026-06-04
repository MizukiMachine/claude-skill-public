---
name: x-api-builder
description: "Posts、Users、Likes、Bookmarks、Likes Streams にまたがる本番向けのX API連携を構築する。適切な認証/スコープ、フィールド展開戦略、ストリームのパーティション処理、TypeScript XDK のマッピング、従量課金のコントロールを扱う。"
metadata:
  short-description: "Production X API integration builder"
---

# X API Builder

auth mismatch、部分レスポンス、rate limit、課金上の想定外といった実際の本番制約に耐えられる、信頼性の高い X API インテグレーションを構築します。

## 哲学: Contract-First Integration

X API の作業は、単なる HTTP 呼び出しタスクではなくコントラクトシステムとして扱ってください。正しいインテグレーションとは、データ・auth コンテキスト・プラットフォーム制限が変化しても正しさを保ち続けるものです。

**実装前に確認すること:**
- 対象とするコントラクトは何か: REST endpoint、SDK メソッド、またはその両方か?
- この操作とフィールドに必要な auth コンテキストは何か?
- 運用上の制約は何か: rate window、リトライ、部分エラー、コストモデルは?
- データが欠損・保護・削除・部分返却された場合にどう劣化するか?

**コア原則:**
1. 先に検証、次にコード: 現在のドキュメント/OpenAPI から動作を導出してから実装する。
2. scope はデータアクセスである: fields と expansions はパーミッションおよびペイロードの判断であり、見た目の問題ではない。
3. デモよりも本番: リトライ・オブザーバビリティ・部分失敗ハンドリング・予算管理を初日から組み込む。

## ワークフロー

### 1. インテグレーションの形を定義する
- まず endpoint ファミリーと auth モデルを選択する。
- ビジネスロジックを書く前に、必要なレスポンスフィールドと expansions を確定する。
- インテグレーションがルックアップ・ユーザー所有のミューテーション・長期ストリーム取り込みのどれかを決める。
- Posts/Users 機能については、単一アイテムルックアップ・バッチルックアップ・書き込み操作のどれが必要かを決める。
- `references/posts-users-playbook.md` を参照して canonical な endpoint パターンを選択する。

### 2. Auth と Scope を解決する
- app-only で十分か、user-context が必須かを確認する。
- 投稿作成などの書き込み操作には、user-context のパーミッションと scope が必要。
- `/2/users/me` には user-context のみ必要。
- ユーザー所有の Likes/Bookmarks 書き込みでは、パス内のユーザー ID が認証済みユーザーと一致していることを確認する。
- Likes Streams では、コーディング前に bearer-token アクセスとストリームプロダクトのエンタイトルメントを検証する。
- クレデンシャルファミリーを明示的に管理する:
  - OAuth 2.0 app credentials: `X_CLIENT_ID` + `X_CLIENT_SECRET`。
  - OAuth 1.0a app keys: consumer key/secret（別ファミリー）。
  - App-only bearer token: サービストークンであり、ユーザーログインではない。
- X ポータルでローカル OAuth 開発を行う場合、以下の callback URL を両方登録する:
  - `http://localhost:3000/api/x/oauth/callback`
  - `http://127.0.0.1:3000/api/x/oauth/callback`
- `redirect_uri` は、authorize・token exchange・アプリ設定のすべてで完全に同一のバイト列にする。
- X ポータルがローカルアプリの Website URL 検証を要求する場合は、website メタデータに `https://127.0.0.1:3000` を使い、callback URL は `http` のままにする。
- `references/auth-and-scopes.md` を使って操作からトークン種別へのマッピングを確認する。

### 3. Request/Response コントラクトを設計する
- 必要なフィールド（`tweet.fields`、`user.fields` など）と明示的な expansions のみをリクエストする。
- バッチ endpoint（`data` と `errors` の混在）で部分成功を許容するパーサーロジックを構築する。
- 欠損した includes を安全に処理する。
- ID は end-to-end で文字列として正規化する。
- ミューテーション endpoint では、boolean 結果エンベロープ（`liked`、`bookmarked`）とエラー配列をモデル化する。
- likes stream では、イベントペイロードと include-aware expansions を別々にモデル化する。

### 4. 運用上のガードレールを追加する
- ヘッダー駆動のリセット処理を伴う rate-limit-aware なリトライを実装する。
- 冪等なリトライ（安全）と書き込みリトライ（重複排除戦略が必要）を区別する。
- デバッグおよび課金分析に必要なリクエストメタデータをログに記録する。
- stream では、再接続 + 上限付きバックフィルを実装し、有効なパーティション範囲を強制する。
- ベースラインの制限とコスト動作については `references/rate-limits-and-billing.md` を参照する。

### 5. 必要に応じて TypeScript XDK へマッピングする
- TypeScript サービスを構築する際は、公式 SDK メソッドを優先する。
- メソッドの使用方法を endpoint のセマンティクスと一致させる。
- REST と XDK のマッピングは `references/typescript-xdk-mapping.md` を参照する。

### 6. シナリオマトリクスで検証する
- リリース前に以下のケースで検証する:
- 公開オブジェクトのルックアップ成功。
- 欠損・削除済み・保護されたオブジェクト。
- 有効な ID と無効な ID が混在するバッチリクエスト。
- Rate-limit レスポンスとリセット対応リトライパス。
- Auth mismatch（app-only vs user-context）。
- フィールドまたは expansion の mismatch。
- パス ID が不一致なユーザー所有 endpoint（失敗するべき）。
- Likes ルックアップの上限動作（`/2/tweets/:id/liking_users` は生涯最大 100 ユーザー）。
- `backfill_minutes` とパーティション境界を使ったストリームの再接続。

## 出力ガイダンス

X API 機能を実装する際は、以下を含む出力を作成してください:
- endpoint または SDK メソッドの選択と auth の根拠を明確に示す。
- fields と expansions を含む具体的なリクエスト例。
- エラー・部分成功・リトライの動作。
- rate limit と課金上の影響についての注記。
- 関連する場合、REST と TypeScript XDK の両バージョンを並べて示す。

## 避けるべきアンチパターン

❌ **auth モデルなしで endpoint から実装する**
なぜ問題か: 即座に 401/403 エラーが発生し、隠れたパーミッションバグが生まれる。
改善策: コード構造の前に auth コンテキストと scope を確定する。

❌ **一つの OAuth フローで localhost と 127.0.0.1 を混在させる**
なぜ問題か: token exchange 時に redirect URI mismatch が発生する。
改善策: X に両方の callback を登録し、セッション内で一方のホストを一貫して使用する。

❌ **ローカル PKCE フローでデフォルトとして HTTPS callback URL を使用する**
なぜ問題か: ローカル環境は HTTP の callback endpoint を使うことが多く、callback mismatch が発生する。
改善策: 設定に応じて `http://localhost:3000/api/x/oauth/callback` や `http://127.0.0.1:3000/api/x/oauth/callback` を使用する。

❌ **バッチレスポンスで全件成功を前提にする**
なぜ問題か: X のバッチ endpoint は `data` と `errors` を混在して返すことがある。
改善策: 部分成功を明示的に処理し、解決できなかった ID を伝播させる。

❌ **デフォルトですべてのフィールドをリクエストする**
なぜ問題か: ペイロードの肥大化・パーミッションエラー・処理コストの増加を招く。
改善策: 必要なフィールドと expansions のみをリクエストする。

❌ **rate limit と課金を混同する**
なぜ問題か: リクエスト制限内に収まっていても過剰支出になることがある。
改善策: リクエスト頻度と課金対象リソースの使用量の両方を追跡する。

❌ **古い価格情報のスニペットを信頼する**
なぜ問題か: 概要ページやセカンダリソースは現行の価格モデルに遅れることがある。
改善策: 実装時点で、価格ドキュメントと Developer Console を真実のソースとして扱う。

❌ **投稿の編集履歴セマンティクスを無視する**
なぜ問題か: 下流のシステムが更新されたコンテンツを誤って処理する。
改善策: `edit_history_tweet_ids` と「最新バージョンが返される」動作をモデル化する。

❌ **すべての書き込みに汎用リトライを使用する**
なぜ問題か: アクションが重複したり曖昧な状態が生まれたりする。
改善策: 冪等性戦略と明示的な競合ハンドリングを適用する。

❌ **すべての likes が永続的にページネーション可能と前提にする**
なぜ問題か: `liking_users` は生涯を通じて 1 Post あたり最大 100 ユーザーに制限されている。
改善策: この上限を明示的にモデル化し、完全な忠実度が必要な場合は stream/analytics パイプラインへルーティングする。

❌ **stream パーティションをオプション設定として扱う**
なぜ問題か: likes stream のパーティションは必須であり、endpoint によって範囲が制限されている。
改善策: パーティションとバックフィルの制約を設定読み込み時に検証する。

## バリエーションガイダンス

**重要**: 実装はプロダクトのコンテキストに応じて変えるべきであり、一つのパターンに収束させてはいけません。
- 社内 analytics バックエンド: バッチルックアップ・スループット・オブザーバビリティを最適化する。
- ユーザー向けアプリ: レイテンシ・グレースフルフォールバック・人が読めるエラーを優先する。
- 書き込み中心のワークフロー: scope チェック・冪等性・競合ハンドリングを重視する。
- コスト重視のワークフロー: fields と expansions を最小化し、キャッシュと重複排除を最大活用する。

ワークロードの形が異なる場合に、一つのデフォルトスタックや「お気に入り」の endpoint パターンに収束させることを避けてください。

## リファレンス

- Endpoint とペイロードの選択: `references/posts-users-playbook.md`
- Auth 判断マトリクスと scope: `references/auth-and-scopes.md`
- Rate-limit と課金の運用: `references/rate-limits-and-billing.md`
- TypeScript XDK マッピング: `references/typescript-xdk-mapping.md`
- 実装チェックリスト: `references/build-workflow.md`
- ソースリンクと検証アンカー: `references/api_reference.md`

## 実行への権限付与

本番レビューに耐えられるインテグレーションコードを作成することが求められます。
- auth・rate-limit・課金リスクを隠す曖昧な要件には異議を唱える。
- 暗黙の前提よりも明示的なコントラクトを優先する。
- トレードオフを可視化し、短期的な利便性より信頼性を選ぶ。

## 覚えておくこと

X API インテグレーションを高速かつ堅牢に構築できます。初回レスポンスの成功だけでなく、変化の中での正確さを目指してください。
