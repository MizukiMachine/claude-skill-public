---
name: gcommit
description: >
  作業ツリーの変更差分を分析し、新ブランチを作成してコミットする。
  変更が多い場合は意味単位で分割コミットする。
  トリガー: "gc", "コミットして", "変更をコミット", "git commit", "ブランチ切ってコミット".
allowed-tools: Bash, Read, Grep, Glob
---

# Git Commit Skill

## 手順

### 1. 変更の把握

```bash
git status --short
git diff --stat
git diff --name-only
git ls-files --others --exclude-standard
```

### 2. 安全性チェック（必須）

ステージング前に、全変更ファイルを以下の基準でスキャンする。
**該当ファイルが1つでもあれば、コミット前にユーザーに確認すること。**

#### 機密情報パターン（即確認）

| パターン | 例 |
|---|---|
| 環境変数ファイル | `.env`, `.env.*`（ただし `*.example`・`*.template`・`*.schema`・`*.d.ts` は許可リストとして除外）, `.envrc` |
| 認証情報 | `credentials.json`, `*.pem`, `*.key`, `*.p12`, `id_rsa`（`.pub`を除く）, `*.ppk` |
| APIキー・トークン | `./*token*`, `./*secret*`, `./*apikey*`（`src/`等ソースコード配下を除く） |
| クラウド設定 | `service-account*.json`, `*.gpg`, `*.kubeconfig` |
| CI/CD秘匿値 | `*.tfstate`, `*.tfstate.backup` |

#### 一般的にコミットすべきでないファイル（即確認）

| パターン | 例 |
|---|---|
| 大型バイナリ | `*.exe`, `*.dll`, `*.so`, `*.dylib`, `*.zip`, `*.tar.gz` |
| ビルド成果物 | `dist/`, `build/`, `target/`, `node_modules/` |
| IDE/エディタ設定 | `.idea/`, `.vscode/settings.json`（共有設定以外） |
| OS生成ファイル | `.DS_Store`, `Thumbs.db`, `desktop.ini` |
| ログファイル | `*.log` |

#### 実装

1. `git diff --name-only` と `git ls-files --others --exclude-standard` の出力から、許可リスト（例: `.env.example`, `.env.production.example`, `.env.template`, `.env.schema`, `.env.d.ts`）に該当するファイルを先に除外
2. 残ったファイルを上記パターンと照合
3. 該当ファイルがあれば、**コミット実行前に** ユーザーに一覧を提示:
   ```
   ⚠ 以下のファイルに機密情報・非推奨ファイルの可能性があります:
   - .env.local (環境変数ファイル)
   - secrets/token.json (認証情報)
   コミットに含めますか？
   ```
4. ユーザーが拒否したファイルはステージング対象から除外
5. ユーザーが承認したファイルのみステージング

> 注: 許可リストで除外したファイルでも、**diff の中身に実際の秘密値（APIキー・トークン・パスワード等）が含まれていれば秘匿扱いとし、コミット前に確認する**。パス名だけで安全と判断しない。

### 3. ブランチ名の生成

変更内容全体から Conventional Commits の scope と要約を推測し、ブランチ名を生成:

```
<type>/<短い要約>
```

例:
- `feat/skill-cleanup` — スキルの追加・整理
- `fix/auth-validation` — バグ修正
- `refactor/command-simplify` — リファクタリング
- `chore/config-update` — 設定変更

ブランチ名は30文字以内に収める。

### 4. 変更のグループ化

ファイル数が **10個以下** なら1つのコミットにまとめる。

ファイル数が **11個以上** の場合、以下の基準でグループ化して分割コミット:

| 優先度 | グループ条件 | 例 |
|---|---|---|
| 1 | 同じディレクトリ内のファイル | `skills/*/SKILL.md` の一括変更 |
| 2 | 同じ変更種別（追加/修正/削除） | スキル削除ファイル一式 |
| 3 | 論理的な関連性 | commands/ 配下の修正一式 |

各コミットメッセージは Conventional Commits 形式:

```
<type>(<scope>): <要約>
```

### 5. 実行

```bash
# 新ブランチ作成
git checkout -b <branch-name>

# グループごとにステージング & コミット
git add <file1> <file2> ...
git commit -m "<type>(<scope>): <要約>

Co-Authored-By: Claude <noreply@anthropic.com>"

# 次のグループ
git add <file3> <file4> ...
git commit -m "<type>(<scope>): <要約>

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 6. 確認

全コミット完了後:

```bash
git log --oneline -<N>
git status
```

> 注: コマンド出力はユーザーに自動表示されない。最終応答で**ブランチ名・各コミットのハッシュ/メッセージ・最終ステータス**を要約して提示する。

## コミットメッセージの type

| type | 用途 |
|---|---|
| `feat` | 新機能・新規追加 |
| `fix` | バグ修正 |
| `refactor` | 挙動を変えない構成変更 |
| `docs` | ドキュメントのみ |
| `chore` | 設定・メタデータ・クリーンアップ |
| `style` | フォーマット・空白・リネーム |
| `test` | テストのみ・テスト基盤 |

## 禁止事項

- `git add .` は禁止。対象ファイルを明示的に指定する
- `git add -A` も禁止
- `git commit --amend` は禁止
- `git commit --no-verify` は禁止。フックをスキップしない
- `git push` はこのスキルの範囲外。ユーザーが明示的に依頼しない限り push しない
- 結果の省略・スキップ・要約は禁止。全ての出力をユーザーに提示する
- 機密情報・非推奨ファイルの扱いは手順2（安全性チェック）に従う
