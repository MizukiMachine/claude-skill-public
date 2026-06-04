---
name: mcp-server-configurator
description: "Claude Code 向けにMCPサーバーを確実に設定する。提供元のドキュメント（docs/URL/設定スニペット）を、正しい `claude mcp add` コマンドや `.mcp.json` 設定に落とし込む。stdio/HTTP/SSE トランスポート、認証パターン、複数スコープ（local/project/user）への展開に対応する。"
metadata:
  short-description: "Configure MCP servers for Claude Code."
---

# MCP Server Configurator for Claude Code

Cursor/Claude Desktop 向けのドキュメントや URL しかない場合でも、Claude Code の MCP サーバーを確実に設定します。

## 方針: MCP セットアップを3つの決断に絞る

MCP の「セットアップの痛み」のほとんどは、フォーマットの混在と推測から来ています。推測せず、マッピングしましょう。

**サーバーを追加する前に確認すること:**
1. **Transport**: ローカルランチャー(**stdio**)かリモートエンドポイント(**HTTP/SSE**)か？
2. **Auth**: OAuth、bearer token、API key header、それともなしか？
3. **Scope**: このサーバーが必要な対象は誰か（ローカル開発専用、リポジトリでチーム共有、または全プロジェクト共通）？

**基本原則**
1. **MCP config をアクセス制御として扱う**: stdio サーバーはコードを実行できる。HTTP/SSE サーバーはリモートリソースにアクセスする。
2. **シークレットをファイルに含めない**: 環境変数を使う（`.mcp.json` では `${VAR}`、`claude mcp add` では `--env`）。
3. **スコープを理解する**: local（自分専用、プロジェクト内）、project（`.mcp.json` 経由で共有）、user（全プロジェクト共通）。
4. **配線後に確認する**: 動作を前提とせず、必ず Claude Code の `/mcp` または `claude mcp list/get` で確認する。

## ワークフロー: ドキュメント/Web サイト → 動作するサーバー設定

### Step 0 — 情報収集（最低限の確認事項）
- MCP サーバーのドキュメント URL は何か（またはインストール/設定スニペットを貼り付けてください）？
- Claude Code でのサーバー名は何にするか（例: `github`、`sentry`、`airtable`）？
- **stdio**（ローカル、コマンド駆動）と **HTTP/SSE**（リモート）のどちらにするか？不明な場合はスニペットを共有すれば推定します。
- **local**（自分だけ、現在のプロジェクト）、**project**（`.mcp.json` で共有）、**user**（全プロジェクト）のどれにするか？

Web サイトが JavaScript ヘビーで `curl` では設定が取得できない場合は、ユーザーに関連する「MCP config」ブロックをコピー＆ペーストしてもらいます。

### Step 1 — transport の特定

ドキュメントから以下のシグナルを確認します:
- **Stdio**: `command` + `args` が記載されている、「stdio」「run this locally」`npx`、`uvx`、`docker run`、または CLI バイナリが言及されている。
- **HTTP**: `https://mcp.example.com/mcp` のような URL が記載されている、「remote」「hosted」または OAuth ログインが言及されている。
- **SSE**: 旧式のリモート transport。Server-Sent Events を使った `https://` エンドポイントが示されている（HTTP に置き換えられた非推奨方式）。

### Step 2 — auth を Claude Code フィールドにマッピングする

**HTTP/SSE の場合** (`url = "https://..."`):
- **OAuth 対応**: 基本的なサーバーを設定後、Claude Code で `/mcp` を実行してブラウザ経由で認証する。
- **Bearer token**: `claude mcp add` に `--header "Authorization: Bearer ${API_TOKEN}"` を渡すか、`.mcp.json` に `"headers": { "Authorization": "Bearer ${API_TOKEN}" }` を設定する。
- **ヘッダー内の API key**: `--header "X-API-Key: ${API_KEY}"` または `.mcp.json` に `"headers": { "X-API-Key": "${API_KEY}" }` を使う。
- **カスタムヘッダー（シークレット）**: `.mcp.json` に `"headers": { "Header-Name": "${ENV_VAR}" }` として設定し、環境変数展開を利用する。

**Stdio の場合** (`command = "..."`):
- `claude mcp add` に `--env KEY=VALUE` で環境変数を渡すか、`.mcp.json` に `"env": { "KEY": "VALUE" }` を設定する。
- `.mcp.json` ではデフォルト値付きオプション展開のために `${VAR:-default}` 構文を使う。

### Step 3 — Claude Code のスコープを理解する

Claude Code は MCP サーバー設定を3つのスコープで管理します。適切なものを選んでください:

| スコープ | ロード範囲 | 共有 | 保存先 | ユースケース |
|-------|----------|--------|-----------|----------|
| **local**（デフォルト） | 現在のプロジェクトのみ | いいえ、自分専用 | `~/.claude.json` | 個人用開発サーバー、実験的な設定、Git に入れたくない認証情報 |
| **project** | 現在のプロジェクトのみ | はい、バージョン管理経由 | プロジェクトルートの `.mcp.json` | チーム共有サーバー（全員が使う GitHub、Slack、データベースなど） |
| **user** | 全プロジェクト | いいえ、自分専用 | `~/.claude.json`（user セクション） | 個人用ユーティリティ、クロスプロジェクトツール（Sentry、モニタリングなど） |

### Step 4 — `claude mcp add` コマンドを生成する

サーバーを追加する主な方法は `claude mcp add` コマンドです。transport とスコープを選択してください:

#### HTTP server（リモート、OAuth フレンドリー）
```bash
# 基本（local スコープ、デフォルト）
claude mcp add --transport http <name> <url>

# bearer token 付き（設定にヘッダーとして保存）
claude mcp add --transport http <name> <url> \
  --header "Authorization: Bearer YOUR_TOKEN"

# チームと共有（project スコープ）
claude mcp add --transport http <name> --scope project <url>

# 全プロジェクト共通（user スコープ）
claude mcp add --transport http <name> --scope user <url>

# 実例:
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_GITHUB_PAT"

claude mcp add --transport http sentry https://mcp.sentry.dev/mcp  # OAuth は後で /mcp から実行
```

#### Stdio server（ローカルコマンド）
```bash
# 基本（local スコープ、デフォルト）
# 注意: -- は Claude のオプションとサーバーコマンドを分離する
claude mcp add --transport stdio <name> -- <command> [args...]

# 環境変数付き
claude mcp add --transport stdio <name> --env KEY=VALUE -- <command> [args...]

# project スコープ（リポジトリで共有）
claude mcp add --transport stdio <name> --scope project -- <command> [args...]

# 実例:
claude mcp add --transport stdio airtable -- npx -y airtable-mcp-server

claude mcp add --transport stdio database --scope project \
  --env DATABASE_URL=postgresql://localhost/mydb -- \
  npx -y @bytebase/dbhub
```

#### SSE server（リモート、非推奨）
```bash
# SSE は非推奨。代わりに HTTP を使うこと
claude mcp add --transport sse <name> <url>

# ヘッダー付き（例: API key）
claude mcp add --transport sse <name> <url> \
  --header "X-API-Key: YOUR_KEY"
```

### Step 5 — 手動での `.mcp.json` フォーマット（project スコープのサーバー向け）

`.mcp.json` を直接編集（リポジトリにチェックイン）したい場合は、プロジェクトルートに配置します:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_PAT}"
      }
    },
    "database": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub"],
      "env": {
        "DATABASE_URL": "${DB_URL:-postgresql://localhost/mydb}"
      }
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.dev/mcp"
    }
  }
}
```

**主なフィールド:**
- `type`: `"http"`、`"sse"`（非推奨）、`"stdio"`、`"ws"`（WebSocket）のいずれか。
- `url`: HTTP/SSE/WebSocket サーバー向け。
- `command` + `args`: stdio サーバー向け（command はプログラム、args は CLI 引数）。
- `headers`: HTTP ヘッダー（`${ENV_VAR}` または `${ENV_VAR:-default}` の展開が可能）。
- `env`: stdio サーバーに渡す環境変数（変数展開に対応）。
- `timeout`: サーバーごとのツール実行タイムアウト（ミリ秒、省略可能）。
- `alwaysLoad`: `true` に設定すると、遅延読み込みではなくサーバーのツールを起動時にロードする（省略可能）。

**`.mcp.json` における環境変数展開:**
- `${VAR}` は環境変数 `VAR` に展開される。
- `${VAR:-default}` は `VAR` が設定されていれば `VAR` に、そうでなければ `default` に展開される。
- `command`、`args`、`url`、`headers`、`env` の中で展開が有効。

### Step 6 — Claude Code で確認と認証を行う

サーバーを追加したら、正常にロードされるか確認し、必要に応じて認証を行います:

```bash
# List all configured servers
claude mcp list

# Get details on a specific server
claude mcp get <name>

# Remove a server
claude mcp remove <name>
```

Claude Code（インタラクティブセッション）でサーバーの状態を確認します:
```
/mcp
```

サーバーが OAuth を要求する場合（🔐 ロックアイコンまたは「Needs authentication」として表示）:
1. Claude Code で `/mcp` を実行する。
2. サーバーを選択してブラウザの OAuth フローを完了する。
3. トークンはシステムのキーチェーンに安全に保存され、自動的に更新される。

## 変換チートシート（他クライアント → Claude Code）

多くのドキュメントは次のような JSON を提供しています:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "headers": {
        "Authorization": "Bearer ${SUPABASE_TOKEN}"
      }
    }
  }
}
```

これを Claude Code 向けに変換するには:
1. サーバーエントリを `.mcp.json` にコピーする（`mcpServers` の構造は同じ）。
2. または `claude mcp add-json <name> '<json>'` で JSON から直接追加する。
3. または `claude mcp add --transport http supabase https://mcp.supabase.com/mcp --header "Authorization: Bearer YOUR_TOKEN"` を使う。

Claude Desktop の設定（同じ JSON フォーマットを使用）からインポートすることもできます:
```bash
claude mcp add-from-claude-desktop
```
これにより Claude Desktop の設定が読み込まれ、インタラクティブにサーバーをインポートできます。

## 避けるべきアンチパターン

❌ **`.mcp.json` にシークレットをハードコードする**: 代わりに `${ENV_VAR}` を使う。API キーは絶対にコミットしない。

❌ **スコープを混同する**: チーム共有サーバーを local スコープで追加してもチームメンバーには表示されない。`--scope project` を使い `.mcp.json` をバージョン管理にコミットする。

❌ **transport タイプを混在させる**: ドキュメントに URL が示されていれば HTTP（明示されている場合は SSE）を使い、コマンドが示されていれば stdio を使う。

❌ **`--` セパレータを忘れる**: stdio で `claude mcp add` を使う場合、`--` がないと Claude のフラグがサーバーのフラグとして解析されてしまう。

❌ **確認をスキップする**: 編集後は必ず `/mcp` または `claude mcp list` を実行してサーバーが接続できることを確認する。

## バリエーションのガイダンス（同じ回答に収束しないこと）

ドキュメントの内容に応じて出力を変えること:
- ドキュメントが**ランチャーコマンド**（npx/uvx/docker）を提供している場合 → **stdio** の `claude mcp add` コマンドまたは `.mcp.json` エントリを生成する。
- ドキュメントが**エンドポイント URL** を提供している場合 → **HTTP/SSE** のコマンドまたはエントリを生成する。
- ドキュメントが **JSON 設定**を提供している場合 → 手動で `.mcp.json` に変換するか `claude mcp add-json` を使う。
- **高リスクなサーバー**（コード実行、広範なデータアクセス）の場合 → 環境変数分離のための `--env KEY=VALUE` を提案し、`/mcp` で確認する。
- **チームサーバー**の場合 → 常に `--scope project` を推奨し、`.mcp.json` を Git にチェックインするよう案内する。

## よくある MCP 設定タスク

### ローカル stdio サーバーを追加する
```bash
claude mcp add --transport stdio my-tool -- npx my-tool-server
```

### token 認証付きのリモート HTTP サーバーを追加する
```bash
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer ${MY_TOKEN}"
```

### チーム共有サーバーを追加する（project スコープ）
```bash
claude mcp add --transport http github --scope project https://api.github.example.com/mcp
```

### Claude Code でサーバーの状態を確認する
```
/mcp
```

### OAuth 認証を完了する
1. `/mcp` または `claude mcp get <name>` でサーバーが「Needs authentication」として表示される。
2. Claude Code で `/mcp` を実行し、サーバーを選択する。
3. ブラウザフローを完了する。トークンは安全に保存される。

### `.mcp.json` で環境変数を使う
```json
{
  "mcpServers": {
    "api": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      }
    }
  }
}
```
`claude` を実行する前に、シェルまたは `.env` で `API_TOKEN` を設定してください。

## 参考リンク

- **Claude Code MCP ドキュメント**: https://code.claude.com/docs/en/mcp.md
- **MCP 仕様**: https://modelcontextprotocol.io/introduction
- **MCP サーバーディレクトリ**: https://claude.ai/directory（認証済みサーバーを閲覧）
