---
name: aimi-code
description: >
  Agent Teams機能で複数候補を並列実装し、ビルド/テストで客観的に最良案を選定するスキル。
  TeamCreate/TaskList/SendMessage のチーム機能で並列実装→ビルド/テスト→競合評価→最良採用を行う。
  トリガー: "/aimi-code", "チームでコード実装", "チームで実装", "チームでコード".
  ソースコードの実装・修正タスクに使用。思考・企画・文章タスクには /aimi を使用すること。
allowed-tools: Agent, Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__web_reader__webReader
---

# Aimi Code

`/aimi-code <タスク>` — 実装タスクを投げるだけ。Agent Teams で並列実装→最良採用。

---

## 設定

| 項目 | デフォルト | 説明 |
|---|---|---|
| 候補数 | 4 | ワークツリー数（開始時にユーザーが指定可能） |
| Agentタイムアウト | 300s | 各候補の実装フェーズ上限（自動調整あり） |
| ビルドタイムアウト | 300s | 各ワークツリーのビルド上限 |
| テストタイムアウト | 600s | 各ワークツリーのテスト上限 |
| 成果物ディレクトリ | `.claude/aimi` | 候補ファイルを保存するディレクトリ |

**オプション:**
- `--no-baseline` — ベースラインビルド/テストをスキップ
- `--timeout N` — Agentタイムアウトを秒単位で指定
- `--build '...'` / `--test '...'` — ビルド/テストコマンドを手動指定

## ビルド/テストコマンド

自動検出を試みる。検出できなかった場合はLLM評価のみで判定し、ユーザーに警告表示。

| プロジェクト種別 | 検出ファイル | ビルド | テスト |
|---|---|---|---|
| Rust | `Cargo.toml` | `cargo build` | `cargo test` |
| Node | `package.json` | `npm run build` | `npm test` |
| Go | `go.mod` | `go build ./...` | `go test ./...` |
| Python | `pyproject.toml` | — | `pytest` |
| Makefile | `Makefile` | `make` | `make test` |

ユーザー指定オプションのパース:
- 入力から `--build '...'`、`--test '...'`、`--timeout N` を抽出し、残りをタスク本文として扱う
- ユーザー指定がある場合は自動検出より優先

## 前提条件

- 作業ディレクトリがgitリポジトリであること
- ワーキングツリーがクリーン（未コミット変更なし）

---

## 実行フロー

### Phase 1: Setup

**Step 1: 事前チェック**

1. `git status --porcelain` でワーキングツリーがクリーンか確認。未コミット変更があればエラー終了
2. 現在のブランチ名と開始コミットハッシュを取得し、AskUserQuestion でベースブランチ確認
   - `BASE_BRANCH=$(git branch --show-current)`
   - `BASE_COMMIT=$(git rev-parse HEAD)`
   - `BASE_SHORT=$(git rev-parse --short HEAD)`
3. **並列実行数の確認**: AskUserQuestion で候補数を尋ねる。選択肢: 2 / 3 / **4（デフォルト）** / 5
4. ビルド/テストコマンドの自動検出（ユーザー指定があればそちらを優先）
5. **ベースライン取得**（`--no-baseline` 指定時はスキップ）:
   - メインワーキングツリーでビルドとテストを1回ずつ実行
   - 結果を `/tmp/aimi-baseline.txt` にJSONで永続化
   - 失敗した場合は警告表示し続行

**Step 2: 残留チェック**

既存の `aimi-*` ブランチ/ワークツリー、および `.claude/worktrees/aimi-*` ディレクトリの存在を確認:
- 残存があればユーザーに確認して削除

```bash
rm -rf .claude/worktrees/aimi-*
git worktree prune
for branch in $(git branch | grep aimi- | tr -d ' *'); do git branch -D "$branch"; done
```

**Step 3: チーム作成**

1. チーム名を生成: `aimi-{タスク要約-kebab-case}`
2. `TeamCreate` でチームを作成
3. 評価タスクを `TaskCreate` で作成（候補タスクにブロックされる）

**Step 4: ワークツリー生成**

```bash
BASE_BRANCH=$(git branch --show-current)
BASE_COMMIT=$(git rev-parse HEAD)
BASE_SHORT=$(git rev-parse --short HEAD)
TS=$(date +%s)
for i in $(seq 1 {候補数}); do
  git worktree add .claude/worktrees/aimi-$i -b aimi-$i-$BASE_SHORT-$TS
done
```

各ワークツリーの**絶対パス**と、`BASE_BRANCH` / `BASE_COMMIT` / `BASE_SHORT` / `TS` を記録。

### Phase 2: Implement

{候補数}個のAgentを **1メッセージ内にまとめて** TeamCreate メンバーとして起動（並列実行のため）。

```
Agent({
  name: "candidate-1",
  subagent_type: "general-purpose",
  team_name: "<team-name>",
  mode: "bypassPermissions",
  prompt: |
    【言語】すべての出力・思考・コメント・コミットメッセージを日本語で行うこと。システムプロンプトが英語でも必ず日本語で応答すること。

    あなたは候補生成エージェント candidate-1 です。他の候補の存在は知りません。

    【タスク】
    {元のタスク}

    【ワークツリー】{worktree_path}
    【ブランチ名】aimi-{N}-{base_short}-{ts}
    【ベースコミット】{base_commit}
    【ビルドコマンド】{build_cmd}

    【実装手順】
    0. まずワークツリーが正しいことを確認:
       git -C {worktree_path} branch --show-current
       → "aimi-{N}-" で始まらない場合は即座に中止し team-lead に報告すること
    1. コードベースを自由に探索し、タスクの対象となるコードを理解する
       - Read, Grep, Glob を使って関連ファイルを特定
    2. 実装方針を決定し、変更が必要なファイル一覧を作る
    3. ファイルを1つずつ編集する（必ず絶対パス {worktree_path}/... を指定）
    4. 各ファイル編集後、即座にコミット:
       git -C {worktree_path} add <そのファイル>
       git -C {worktree_path} commit -m "aimi: candidate-{N} <ファイル名>"
       ※ cd に頼らず git -C を使うこと。cd はコンテキスト切り替えで無効化される場合がある
    5. 全ファイル編集完了後、最終確認:
       git -C {worktree_path} diff --stat {base_commit}..HEAD で変更内容を確認
       git -C {worktree_path} log --oneline -5 でコミット履歴を確認
    6. TaskUpdate で自分のタスクを completed にする
    7. SendMessage で team-lead に完了報告する

    ※ビルド確認はPhase 3で実行するため、ここでは行わない
})
```

- candidate-2 〜 candidate-{候補数} も同様（番号を置換）
- 各エージェントは **他の候補の存在を知らない** 前提で独立して実行
- 全ファイル操作で**絶対パスを使用**

**タイムアウトの自動調整:**

| 条件 | タイムアウト |
|------|------------|
| 行数300以下、かつ変更ファイル5以下 | 300s |
| 行数300超、または変更ファイル6-10 | 600s |
| 行数500超、または変更ファイル11+ | 900s |
| ベースラインビルドが60s超 | 上記に+300s |

**進捗監視:**

- チームメンバーからの `SendMessage` 完了通知を自動受信
- 通知を受け取るごとにユーザーに「candidate-N 完了 (N/{候補数})」をテキスト出力
- `TaskList` で全体進捗を確認可能
- 全候補完了したら次フェーズへ

**進捗判別ロジック（オーケストレーター側）:**

コミット有無で候補の状態を判別する:
- コミット0件 → 未着手 or ごく初期（まだ実行中。待つべき）
- コミットあり・完了通知未受信 → 実行中（待つべき）
- コミットあり・完了通知受信 → 完了（Phase 3へ）

**429エラー時のリトライ:**

完了通知に429エラーが含まれている場合、全候補の完了通知受信後にその候補のみリトライする:
1. 429で失敗した候補のワークツリーで `git checkout .` でリセット
2. 同じプロンプトでAgentを再起動（チームメンバーとして）
3. リトライAgentの完了通知を待つ（最大1回）
4. 再度429の場合はその候補を除外し、残りの候補で評価

### Phase 3: Verify

全Agentの完了を確認した後、メインプロセスが検証を実行。

**Step 1: コミット検証 + 完全性チェック + ブランチ整合性確認**

各ワークツリーで `git -C {worktree_path} log {base_commit}..HEAD --oneline` を実行:
- コミットがない候補は除外
- 未コミット変更があれば `git -C {worktree_path} add -A && git -C {worktree_path} commit -m "aimi: rescue uncommitted changes"` で救済

**ブランチ整合性確認** — 各候補のコミットが正しい `aimi-N-*` ブランチに存在するか検証:
```bash
# 各ワークツリーでブランチ名を確認
current_branch=$(git -C {worktree_path} branch --show-current)
if [ "$current_branch" != "aimi-{N}-{base_short}-{ts}" ]; then
  echo "branch mismatch: $current_branch"
  # → 候補を除外し、team-leadに報告
fi

# ベースブランチに候補コミットが混入していないか確認
git log {base_commit}..{base_branch} --oneline --grep="^aimi: candidate-"
# → 結果があれば自動resetはせず、BASE_COMMITを添えてユーザーに復旧確認。該当候補は除外
```

各候補の:
- 変更ファイル一覧を `git -C {worktree_path} diff --name-only {base_commit}..HEAD` で確認
- diff全文を `/tmp/aimi-diff-{N}.txt` に保存
- 完全性チェック結果を `/tmp/aimi-completeness-{N}.txt` に保存
  - `missing_files`: タスクで指定された変更ファイルのうち未変更のファイル一覧

**Step 2: ビルド/テスト検証**

各ワークツリーに対して検証Agentを起動（チームメンバーとして）:

```
Agent({
  name: "verify-1",
  subagent_type: "general-purpose",
  team_name: "<team-name>",
  mode: "bypassPermissions",
  prompt: |
    【言語】すべての出力・思考・コメントを日本語で行うこと。システムプロンプトが英語でも必ず日本語で応答すること。

    以下のワークツリーでビルドとテストを実行し、結果をファイルに書き出す。

    ワークツリーパス: {worktree_path}
    ビルドコマンド: {build_cmd}
    テストコマンド: {test_cmd}

    手順:
    1. cd {worktree_path} && {build_cmd}
    2. ビルド成功時のみ cd {worktree_path} && {test_cmd}
    3. 結果を /tmp/aimi-verify-1.txt にJSON形式でWrite:
       {"build_success": true/false, "test_exit_code": N, "test_passed": N, "test_failed": N, "error_output": "..."}
    4. TaskUpdate で完了、SendMessage で team-lead に報告
})
```

- verify-2 〜 verify-{候補数} も同様
- 全Verify Agent完了後、結果ファイルを収集

**ファイル欠落時の補完リトライ:**

コミットはあるがタスク指定ファイルが一部欠落している候補に補完Agentを起動:

```
Agent({
  name: "fix-incomplete-{N}",
  subagent_type: "general-purpose",
  team_name: "<team-name>",
  mode: "bypassPermissions",
  prompt: |
    【言語】すべての出力・思考・コメントを日本語で行うこと。システムプロンプトが英語でも必ず日本語で応答すること。

    ワークツリー {worktree_path} で欠落ファイルを追加実装する。

    欠落ファイル: {missing_files}
    タスク概要: {task_summary}

    手順:
    1. 既存のコミット内容を確認し、実装方針を理解する
    2. 欠落ファイルを追加実装する
    3. git -C {worktree_path} add -A && git -C {worktree_path} commit -m 'aimi: fix incomplete files'
    4. 結果を /tmp/aimi-fix-incomplete-{N}.txt にJSON書き出し:
       {"fixed": true/false, "added_files": ["..."]}
    5. TaskUpdate + SendMessage で報告
})
```

- 修正成功 → 通常のビルド/テスト検証フローに合流
- 修正失敗 → 除外

**ビルド失敗時の修正リトライ:**

ビルド失敗した候補に修正Agentを起動:

```
Agent({
  name: "fix-{N}",
  subagent_type: "general-purpose",
  team_name: "<team-name>",
  mode: "bypassPermissions",
  prompt: |
    【言語】すべての出力・思考・コメントを日本語で行うこと。システムプロンプトが英語でも必ず日本語で応答すること。

    ワークツリー {worktree_path} でビルドエラーを修正する。
    ビルドコマンド: {build_cmd}

    エラー: {error_output}

    手順:
    1. エラーを読んで原因特定
    2. 該当ファイルを修正
    3. git -C {worktree_path} add -A && git -C {worktree_path} commit -m 'aimi: candidate-{N} fix build'
    4. cd {worktree_path} && {build_cmd} で確認（最大3回）
    5. 結果を /tmp/aimi-fix-{N}.txt にJSON書き出し
    6. TaskUpdate + SendMessage で報告
})
```

リトライ完了後:
- 修正成功 → テスト検証へ（テスト失敗リトライの対象にもなる）
- 修正失敗 → 除外
- ベースラインと比較してリグレッション検出

**テスト失敗時の修正リトライ:**

ビルド成功だがテストにリグレッション（ベースライン比で増加した失敗）がある候補に修正Agentを起動:

```
Agent({
  name: "fix-test-{N}",
  subagent_type: "general-purpose",
  team_name: "<team-name>",
  mode: "bypassPermissions",
  prompt: |
    【言語】すべての出力・思考・コメントを日本語で行うこと。システムプロンプトが英語でも必ず日本語で応答すること。

    ワークツリー {worktree_path} でテスト失敗を修正する。
    テストコマンド: {test_cmd}
    ベースラインの失敗数: {baseline_failures}

    テストエラー:
    {error_output}

    手順:
    1. エラーを読んで原因特定（ベースラインから増加した失敗のみを対象とする）
    2. 該当ファイルを修正
    3. git -C {worktree_path} add -A && git -C {worktree_path} commit -m 'aimi: candidate-{N} fix test'
    4. cd {worktree_path} && {test_cmd} で確認（最大2回）
    5. 結果を /tmp/aimi-fix-test-{N}.txt にJSON書き出し:
       {"test_fixed": true/false, "test_passed": N, "test_failed": N, "remaining_errors": "..."}
    6. TaskUpdate + SendMessage で報告
})
```

リトライ完了後:
- 修正成功（リグレッション0） → 通常評価に合流
- 修正成功（リグレッション残り） → 評価に合流するが客観指標で減点
- 修正失敗 → 除外

### Phase 4: Evaluate

**除外候補の処理:**

タイムアウト・失敗・消失した候補は除外。有効候補が1件以上あれば評価続行。全滅時はユーザーに報告して再試行。

**Step 1: 客観指標によるランク付け**

| 優先度 | 指標 | 説明 |
|---|---|---|
| ゲート | ビルド成功 | 失敗は即除外 |
| 1次 | リグレッション数 | 新規テスト失敗が少ない方を優先 |
| 2次 | テスト通過（exit code） | 0（全通過）を優先 |
| 3次 | ビルド時間 | 参考値 |

**Step 2: 個別LLM採点（並列Agentで実行）**

ビルド成功した有効候補ごとに採点Agentをチームメンバーとして起動し、**1メッセージ内にまとめて** 並列実行。

評価基準（各10点満点、計50点）:

| 基準 | 説明 |
|------|------|
| Completeness | タスクの全要件をカバー |
| Correctness | 技術的に正確、エッジケース考慮 |
| Code Quality | 可読性、保守性、適切な設計パターン |
| Practicality | 実用的で後方互換 |
| Test Adequacy | 適切なテストが追加/修正されているか |

```
Agent({
  name: "eval-1",
  subagent_type: "general-purpose",
  team_name: "<team-name>",
  mode: "bypassPermissions",
  prompt: |
    【言語】すべての出力・思考・コメントを日本語で行うこと。システムプロンプトが英語でも必ず日本語で応答すること。

    あなたはコードレビュー評価者です。候補を評価してください。

    【タスク】
    {元のタスク}

    【実装完全性情報】
    {/tmp/aimi-completeness-1.txt の内容 — is_complete, missing_files等を含む}

    【候補のdiff】
    {/tmp/aimi-diff-1.txt の内容をそのまま全文を含める。要約不可}

    【評価基準】各10点満点、計50点:
    1. Completeness — タスクの全要件をカバー。以下を満たさない場合は3点以下:
       - 変更箇所一覧の全ファイルが更新されているか
       - 削除対象のファイル/行が正しく削除されているか
    2. Correctness — 技術的に正確、エッジケースを考慮
    3. Code Quality — 可読性、保守性、適切な設計パターン
    4. Practicality — 実用的で後方互換
    5. Test Adequacy — 適切なテストが追加/修正されているか

    結果を /tmp/aimi-score-1.txt にWriteツールで書き出す。形式:
    {
      "scores": {"completeness": N, "correctness": N, "code_quality": N, "practicality": N, "test_adequacy": N},
      "total": N,
      "strengths": "優れた点の簡潔なサマリー（2-3文）",
      "weaknesses": "課題点の簡潔なサマリー（2-3文）"
    }

    TaskUpdate で完了、SendMessage で team-lead に報告すること。
})
```

**重要:** eval Agentのプロンプト構築時は、`/tmp/aimi-completeness-{N}.txt` と `/tmp/aimi-diff-{N}.txt` の内容を **Readツールで先に読み込み、その全文をプロンプトに直接展開** すること。ファイルパスの参照だけではAgentが内容にアクセスできない。

- eval-2 〜 eval-{有効候補数} も同様
- 全eval Agent完了後、`/tmp/aimi-score-{N}.txt` をReadツールで収集
- JSONパース失敗の候補はスコアnullとして扱い、客観指標のみで評価

**LLM評価スキップ条件** — 以下のいずれかを満たす場合はStep 2をスキップ:
1. ビルド成功候補が1件のみ
2. リグレッション0の候補が1件だけで、他はリグレッションあり

**Step 3: スコア比較で最良候補決定**

全採点Agentの結果を収集後、メインセッションで比較:
1. 客観指標のゲート: ビルド失敗は除外済み
2. LLMスコアのtotal値で降順ソート
3. 同点のtie-break: リグレッション数 → テスト通過 → ビルド時間 → candidate番号
4. LLMスコアがnullの候補: 客観指標のみで他候補と比較

### Phase 5: Merge & Cleanup

**Step 1: ユーザーへの報告**

1. 各候補のビルド/テスト結果サマリ
2. 評価スコア（客観指標 + LLM評価）
3. 採用案と選定理由
4. ユーザーにマージの可否を確認

**Step 2: マージ**

ユーザー承認後:
```bash
git merge --no-ff aimi-N-<base_short>-<ts> -m "aimi: <タスク概要>"
```

**Step 3: クリーンアップ**

1. `SendMessage({ to: "candidate-N", message: { type: "shutdown_request" } })` で各メンバーを終了
2. `TeamDelete` でチームリソースを削除
3. ワークツリー削除:
   ```bash
   for i in $(seq 1 {候補数}); do
     git worktree remove .claude/worktrees/aimi-$i --force
     git branch -D aimi-$i-<base_short>-<ts>
   done
   ```
4. 一時ファイル削除:
   ```bash
   rm -f /tmp/aimi-*.txt
   ```

---

## legacy-code（旧版）との違い

| | legacy-code | aimi-code（現行） |
|---|---|---|
| 起動方法 | `Agent` + `run_in_background` | `TeamCreate` + `Agent(team_name)` |
| 進捗管理 | バックグラウンド通知 | `TaskList` + `SendMessage` |
| 評価 | `claude -p` 外部プロセス | チーム採点Agent並列実行 |
| クリーンアップ | worktree手動削除 | `shutdown_request` + `TeamDelete` |
| チーム機能 | なし | TaskList/SendMessage で状態共有 |
| ワークツリー | `.claude/worktrees/aimi-code-*` | `.claude/worktrees/aimi-*` |
| 一時ファイル | `/tmp/aimi-code-*` | `/tmp/aimi-*` |

## エラーハンドリング

| 状況 | 対応 |
|---|---|
| Agentタイムアウト/失敗 | その候補を除外し、残りで評価続行 |
| 全候補ビルド失敗 | 結果を報告し、クリーンアップ。再試行を提案 |
| ビルド失敗 | fix Agent起動で修正リトライ（最大3回） |
| テスト失敗（リグレッション） | fix-test Agent起動で修正リトライ（最大2回） |
| コミットなし候補 | Phase 3 Step 1で検出し除外 |
| ファイル欠落候補 | fix-incomplete Agent起動で補完リトライ（最大1回） |
| ブランチ汚染（ベースブランチに誤コミット） | 自動resetせず、`BASE_COMMIT` を提示してユーザー承認後に復旧。該当候補を除外 |
| ビルド成功候補0件 | Phase 4をスキップし、結果を報告 |
| マージコンフリクト | ユーザーに報告、手動対応を依頼 |
| マージ拒否 | ワークツリー・ブランチを保持 |
| ビルド/テストコマンド検出不可 | LLM評価のみで判定。警告表示 |
| テストなしプロジェクト | ビルド成功のみで客観指標ランク付け |

## フォールバック時のtie-breaker

客観指標のみで評価する場合の優先順位:
1. リグレッション数が少ない方
2. テスト通過（exit code 0）の方
3. ビルド時間が短い方
4. candidate番号が小さい方
