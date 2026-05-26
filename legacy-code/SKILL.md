---
name: legacy-code
description: >
  （旧版）ワークツリー分離で複数の候補を並列実装し、ビルド/テストで客観的に最良案を選定。
  Agent Teams版の /aimi-code に移行済み。トリガー: "/legacy-code".
allowed-tools: Agent, Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__web_reader__webReader
---

# Aimi Code

`/aimi-code <タスク>` — 実装タスクを投げるだけ。裏で勝手にやる。

---

## 設定

| 項目 | デフォルト | 説明 |
|---|---|---|
| `AIMI_CODE_EVAL_MODEL` | `claude-opus-4-7` | LLM評価フェーズ用モデル。環境変数で上書き |
| 候補数 | 3 | ワークツリー数 |
| Agentタイムアウト | 300s | 各候補の実装フェーズ上限（自動調整あり） |
| ビルドタイムアウト | 300s | 各ワークツリーのビルド上限 |
| テストタイムアウト | 600s | 各ワークツリーのテスト上限 |
| Verify Agentタイムアウト | 900s | ビルド+テストの合計上限 |
| Codexタイムアウト | 300s | Codex改善の上限（Monitor timeout_ms と同一） |

**オプション:**
- `--no-baseline` — ベースラインビルド/テストをスキップ（直近のビルドが成功していることが自明な場合）
- `--timeout N` — Agentタイムアウトを秒単位で指定（デフォルト: 300s。大規模タスクでは自動で600sに引き上げ）
- `--build '...'` / `--test '...'` — ビルド/テストコマンドを手動指定（自動検出より優先）

モデル更新:
- 一時: `AIMI_CODE_EVAL_MODEL=claude-opus-5-0 /aimi-code タスク`
- 恒久: 上記デフォルト値を書き換える

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
- LLM評価使用時、`claude` CLIが `--model` で指定したモデルにアクセス可能
- 外部ツール（`jq`等）への依存なし。LLM評価のJSONパースはReadツールで直接行う

---

## 実行フロー

### Phase 1: Setup

**Step 1: 事前チェック**
1. `git status --porcelain` でワーキングツリーがクリーンか確認。未コミット変更があればエラー終了
2. 現在のブランチ名とコミットハッシュを取得し、ユーザーに確認:
   - `git branch --show-current` でブランチ名、`git rev-parse --short HEAD` でコミットハッシュを取得
   - AskUserQuestion で「**ベースブランチ: `{branch}`** (`{hash}`)。このブランチからワークツリーを作成しますがよろしいですか？」と確認
   - ユーザーが承認 → 続行。拒否 → エラー終了（正しいブランチに切り替えて再実行を促す）
3. ビルド/テストコマンドの自動検出（ユーザー指定があればそちらを優先）
4. `which claude` で `claude` CLIの可用性を確認。不在の場合は「LLM評価をスキップします」とユーザーに通知
5. **ベースライン取得**（`--no-baseline` 指定時はスキップ）: メインワーキングツリーでビルドとテストを1回ずつ実行し、結果を `/tmp/aimi-code-baseline.txt` にJSONで永続化する（コンテキスト圧縮対策）
   - ビルド: 成功/失敗を記録。失敗した場合は警告表示し続行する（候補のビルド判定に影響しないよう注意）
   - テスト: パス/フェイル/スキップ数とexit codeを記録。これがリグレッション検出の基準になる。exit code 0（全通過）を主判定とし、詳細数は参考値。失敗した場合は警告表示し続行（既存の失敗テストはリグレッション判定から除外）
   - `--no-baseline` 指定時は「リグレッション検出をスキップします」とユーザーに警告表示する
   - `claude` CLIが不在の場合はベースライン取得もスキップし、客観指標のみで評価する
6. コンテキスト収集や影響範囲スキャンは**行わない**。各候補Agentが自律的にコードベースを探索する

**Step 2: 残留チェック**

既存の `aimi-code-*` ブランチ/ワークツリー、および `.claude/worktrees/aimi-code-*` ディレクトリの存在を確認:
- 残存があれば「前回の実行のワークツリーが残っています。削除しますか？」とユーザーに確認
- 承認された場合のみ削除:

```bash
# git worktree list | grep aimi-code
# git branch | grep aimi-code
rm -rf .claude/worktrees/aimi-code-*
git worktree prune
for branch in $(git branch | grep aimi-code | tr -d ' *'); do git branch -D "$branch"; done
```

**Step 3: ワークツリー生成**

`.claude/worktrees/` 配下に3個のワークツリーを生成。ブランチ名にタイムスタンプを含めて一意性を保証する。

```bash
BASE=$(git rev-parse --short HEAD)
TS=$(date +%s)
for i in $(seq 1 3); do
  git worktree add .claude/worktrees/aimi-code-$i -b aimi-code-$i-$BASE-$TS
done
```

各ワークツリーの**絶対パス**を記録。

### Phase 2: Implement

3個のAgentを `run_in_background: true` で同時起動する。全3個を1つのメッセージ内にまとめる（並列実行のため）。

- Agent名: `candidate-1` 〜 `candidate-3`
- `subagent_type: "general-purpose"`
- 各Agentに同じタスクを与える。「他の候補の存在は知らない」前提で、それぞれ自分の最善を独立に出す
- 候補間で情報は一切共有しない

各Agentに渡す情報:
- ワークツリーの**絶対パス**
- 元のタスク
- **ビルドコマンド**（Phase 1 で検出したもの）

各Agentは自由にコードベースを探索・調査し、独自の判断で実装方針を決定すること。

**重要:**
- 全Agent起動を1つのメッセージ内にまとめる（並列実行のため）
- **`run_in_background: true`** を指定してバックグラウンド起動する
- 各Agentは**全てのファイル操作で絶対パスを使用すること**。`cd` に依存してはいけない（Bashツールではシェルステートが維持されないため）。Bash呼び出しは `cd /abs/path && command` の形式で毎回プレフィックスすること
- 候補間で情報は一切共有しない
- 各Agentは段階的コミット方式でファイルを1つずつ編集→コミットする

**段階的コミット（クラッシュ対策）:**

各Agentは**ファイルを編集するたびにコミットする**こと。Agentがクラッシュやタイムアウトした場合でも途中成果が残るようにするため。
ビルド確認はPhase 3で一括して行うため、Phase 2では**コード記述に集中**する。

Agentプロンプトに以下の指示を含める:

```
【タスク】
{元のタスク}

【ワークツリー】{worktree_path}
【ビルドコマンド】{build_cmd}

【実装手順】
1. コードベースを自由に探索し、タスクの対象となるコードを理解する
   - Read, Grep, Glob を使って関連ファイルを特定
   - 型や関数の使用箇所をgrepで確認し、変更の影響範囲を把握
2. 実装方針を決定し、変更が必要なファイル一覧を作る
3. ファイルを1つずつ編集する
4. 各ファイル編集後、即座にコミット:
   cd {worktree_path} && git add <そのファイル> && git commit -m "aimi: candidate-N <ファイル名>"
5. 全ファイル編集完了後、最終確認:
   cd {worktree_path} && git diff --stat HEAD~N で変更内容を確認し、漏れがあれば追加編集→コミット

※ビルド確認はPhase 3で実行するため、ここでは行わない
```

**オーケストレーター側の進捗判別ロジック:**

オーケストレーターは、コミット有無で候補の状態を判別できる:
- コミット0件 → 未着手 or ごく初期（まだ実行中。待つべき）
- コミットあり・Agent完了通知未受信 → 実行中（待つべき）
- コミットあり・Agent完了通知受信 → 完了（Phase 3へ）

**タイムアウトの自動調整:**

タスクの規模に応じてAgentタイムアウトを引き上げる。オーケストレーターはPhase 2のAgentプロンプト構築時に、以下の手順で判定する:
1. タスクテキストの行数をカウント
2. 大規模と判定する条件とタイムアウト:

| 条件 | タイムアウト | 典型例 |
|------|------------|--------|
| 行数300以下、かつ変更ファイル5以下 | 300s（デフォルト） | 単一ファイルのbug fix、小規模feature |
| 行数300超、または変更ファイル6-10 | 600s | 複数クレートを跨ぐ中規模変更 |
| 行数500超、または変更ファイル11+ | **900s** | 大規模リファクタ、多ステップ移行タスク |

3. さらに、Phase 1のベースラインビルドの所要時間が60s超の場合、上記に+300sを追加する
4. ユーザーが `--timeout N` で手動指定した場合はそちらを優先

**進捗監視:**

Agent完了通知ベースで進捗を管理する。ステータスファイルやMonitorツールのpollingは使用しない。

- `run_in_background: true` で起動したAgentの完了通知（task-notification）を受け取る
- 通知を受け取るごとにユーザーに「candidate-N 完了 (完了数/総数)」をテキスト出力
- **全N件の通知を受信するまで次フェーズに進まない**
- 通知がまだ届いていない候補がある場合は「待機中: candidate-N」と出力し、ターンを終了して通知を待つ
- **通知が1件も届いていない状態でコミット確認やリトライを実行してはならない**

**429エラー時のリトライ:**

完了通知に429エラーが含まれている場合、全候補の完了通知受信後にその候補のみリトライする:
1. 429で失敗した候補のワークツリーで `git checkout .` でリセット
2. 同じプロンプトでAgentを再起動（`run_in_background: true`）
3. リトライAgentの完了通知を待つ（最大1回）
4. 再度429の場合はその候補を除外し、残りの候補で評価

### Phase 3: Verify

全Agentの完了を確認した後、メインプロセスが検証を実行。

**Step 1: コミット検証 + 完全性チェック + ビルド品質ゲート**

各ワークツリーで `git log {base}..HEAD --oneline` を実行。
- コミットがある候補 → 段階的コミット方式により、部分実装でもコミットが存在するはず。続きを確認
- コミットがない候補は「変更なし」として除外
- 未コミット変更（最後のファイル編集後のコミット漏れ等）がある場合は `git add -A && git commit` を自動実行して救済

**実装完全性チェック（コミット検証直後に実行）:**

コミット検証の直後に、各候補の変更ファイル一覧を確認する:

1. 各候補で `cd {worktree_path} && git diff --name-only {base}..HEAD` を実行して変更ファイル一覧を取得
2. タスク記述から推測される対象ファイルと照合
3. 完全性チェック結果は `/tmp/aimi-code-completeness-{N}.txt` にJSONで保存:
   ```
   {"is_complete": true/false, "missing_files": ["path/a.rs", ...], "total_required": N, "covered": N}
   ```
4. 各候補のdiff全文を `/tmp/aimi-code-diff-{N}.txt` に保存（Phase 4 Step 2 のLLM採点で使用）:
   ```
   cd {worktree_path} && git diff {base}..HEAD > /tmp/aimi-code-diff-{N}.txt
   ```

**Step 2: ビルド/テスト検証（Agentツールで並列実行）**

各ワークツリーに対して1つのAgentを起動し、ビルドとテストを一貫して実行させる。全てのAgentを1つのメッセージ内に `run_in_background: true` でまとめる（並列実行のため）。

**Verify Agentタイムアウト**: ビルド（300s）+ テスト（600s）= 最大900sかかるため、Agent起動時に十分なタイムアウトを設定すること。

**ビルドコマンド不在時**: ビルドコマンドが検出できないプロジェクト（Python等）では、ビルドステップをスキップし全候補を「ビルド成功」とみなす。

```
Agent(
  run_in_background: true,
  name: "verify-{N}",
  subagent_type: "general-purpose",
  prompt: "以下のワークツリーでビルドとテストを実行し、結果をファイルに書き出してください。

ワークツリーパス: /abs/path/to/.claude/worktrees/aimi-code-{N}
ビルドコマンド: {build_cmd}
テストコマンド: {test_cmd}
ビルドタイムアウト: {build_timeout}s
テストタイムアウト: {test_timeout}s

手順:
1. cd {worktree_path} && {build_cmd} を実行
   - ビルド結果（成功/失敗/タイムアウト、所要時間）を記録
   - ビルド失敗の場合はテストをスキップ
2. cd {worktree_path} && {test_cmd} を実行
   - テスト結果（exit code、パス/フェイル/スキップ数、所要時間）を記録
3. 結果を /tmp/aimi-code-verify-{N}.txt に以下のJSON形式でWriteツールで書き出す:

{
  \"build_success\": true/false,
  \"build_time_seconds\": N,
  \"test_exit_code\": N,
  \"test_passed\": N,
  \"test_failed\": N,
  \"test_skipped\": N,
  \"test_time_seconds\": N,
  \"error_output\": \"エラーがあれば要約\"
}

4. テストコマンドが存在しない場合は、test_* フィールドをnullにしてください。
5. ビルドもテストもコマンドが存在しない場合は、すべてnullで書き出してください。"
)
```

全Agentの完了通知を受け取り、全ワークツリーの `/tmp/aimi-code-verify-{N}.txt` をReadツールで収集する。

**結果ファイル不在時**: ファイルが存在しない候補は「検証失敗」として除外し、ユーザーに通知する。

- タイムアウト: 設定テーブルの値（ビルド300秒、テスト600秒）を使用
- **ビルド失敗候補はビルド修正リトライに回す**（ただしログには記録）
- ビルド成功候補が0件 + リトライも全滅の場合はPhase 4をスキップし、Phase 5へ

**ビルド失敗時の修正リトライ:**

ビルド失敗した候補に対して、Agentを再起動してビルドエラーを修正させる。各失敗候補に1つのAgentを `run_in_background: true` で起動（並列実行）:

```
Agent(
  run_in_background: true,
  name: "fix-{N}",
  subagent_type: "general-purpose",
  prompt: "以下のワークツリーでビルドエラーを修正してください。

ワークツリーパス: /abs/path/to/.claude/worktrees/aimi-code-{N}
ビルドコマンド: {build_cmd}

【ビルドエラー出力】
{verify_resultのerror_output}

手順:
1. エラーメッセージを読んで原因を特定する
2. 該当ファイルを修正する
3. cd {worktree_path} && git add -A && git commit -m 'aimi: candidate-N fix build'
4. cd {worktree_path} && {build_cmd} を実行して確認
5. まだエラーが出る場合はステップ1-4を繰り返す（最大3回）
6. ビルド成功 or 3回試行後も失敗の場合、結果を /tmp/aimi-code-fix-{N}.txt にJSONで書き出す:
   {\"fix_success\": true/false, \"error_output\": \"残エラーがあれば\"}"
)
```

リトライ完了後:
- 修正成功 → 通常のPhase 4評価に合流（テストは再実行）
- 修正失敗 → その候補は除外
- ベースライン（取得した場合）と比較し、**新規テスト失敗（リグレッション）**を検出
  - ベースラインは `/tmp/aimi-code-baseline.txt` から再読み込みする
  - ベースでは通っていたテストが落ちた → その数をペナルティとして記録
  - `--no-baseline` 時はリグレッション検出をスキップし、テスト結果のみで評価

テストコマンドが検出できない（テストがない）プロジェクトでは:
- ビルド成功のみで客観指標のランク付けを行い、同数ならLLM評価へ

### Phase 4: Evaluate

**除外候補の処理:**

Agentがタイムアウト・失敗・消失した場合、その候補を除外し、残りで評価を続行する。除外後の有効候補だけを評価プロンプトに含める。評価結果の `scores` も有効候補のみを対象にする。有効候補が1件でも残っていれば採用候補の選定は続行する。候補消失（コンテキスト圧縮等で結果ファイルが存在しない場合）も「失敗」と同様に除外する。全滅した場合は採用・ログ記録を行わず、ユーザーに報告して再試行する。除外された候補はログの `excluded` フィールドに記録する。

**Step 1: 客観指標によるランク付け**

| 優先度 | 指標 | 説明 |
|---|---|---|
| ゲート | ビルド成功 | 失敗は即除外 |
| 1次 | リグレッション数 | 新規テスト失敗が少ない方を優先。0が理想 |
| 2次 | テスト通過（exit code） | 0（全通過）を優先 |
| 3次 | ビルド時間 | 参考値 |

**LLM評価スキップ条件** — 以下のいずれかを満たす場合はStep 2をスキップし、客観指標のみで採用:
1. ビルド成功候補が1件のみ
2. リグレッション0の候補が1件だけで、他はリグレッションあり
3. リグレッション0の候補が複数でも、テスト通過率に10%以上の差がある

上記以外、または客観指標で同順位の場合はStep 2へ。

**Step 2: 個別LLM採点（並列実行）**

ビルド成功した有効候補をそれぞれ個別に採点。全ての有効候補の `claude -p` 呼び出しを1つのメッセージ内に `run_in_background: true` でまとめる（並列実行のため）。ビルド失敗・コミットなし・タイムアウトで除外した候補は対象にしない。

**重要事項:**
- **候補生成時に使用したモデル固有の環境変数を `claude` 呼び出し時に引き継いではいけない。** 素の `claude` コマンドをそのまま呼ぶことで、評価用モデルに正しくルーティングされる
- `--output-format json` の出力は `{"type":"result","result":"...","is_error":false,...}` 形式。`.result` フィールドに評価回答が含まれる
- **外部ツール（`jq`等）への依存は禁止。** 生JSONをファイルに保存し、Readツールで読み込んでClaude自身がパースする

**個別採点プロンプト:**

各候補のdiff全文を含めたプロンプトを **Bashツールのヒアドキュメント + cat** で構築する（Writeツールでは `$(cat ...)` がリテラル展開されずdiffが含まれないため）:

```bash
cat << 'PROMPT_EOF' > /tmp/aimi-code-eval-{N}.txt
あなたはコードレビュー評価者です。以下の候補を評価してください。

【タスク】
{元のタスク}

【実装完全性情報】
{completeness_check_result — /tmp/aimi-code-completeness-{N}.txtの内容。is_complete, missing_files等を含む}

【候補のdiff】
PROMPT_EOF
cat /tmp/aimi-code-diff-{N}.txt >> /tmp/aimi-code-eval-{N}.txt
cat << 'PROMPT_EOF' >> /tmp/aimi-code-eval-{N}.txt

【評価基準】各10点満点、計50点:
1. Completeness — タスクの全要件をカバー。以下の全てを満たさない場合は3点以下とする:
   - プランに記載された全フェーズが実装されているか（一部のみの実装は重大な欠陥）
   - 変更箇所一覧の全ファイルが更新されているか（未変更ファイルがある場合は減点対象）
   - 削除対象のファイル/行が正しく削除されているか
2. Correctness — 技術的に正確、エッジケースを考慮
3. Code Quality — 可読性、保守性、適切な設計パターン
4. Practicality — 実用的で後方互換
5. Test Adequacy — タスクに対して適切なテストが追加/修正されているか

【出力形式】
~~~json と ~~~ で囲んだJSONコードブロック1つのみ。前後に説明文一切なし。
{
  "scores": {"completeness": N, "correctness": N, "code_quality": N, "practicality": N, "test_adequacy": N},
  "total": N,
  "strengths": "優れた点の簡潔なサマリー（2-3文）",
  "weaknesses": "課題点の簡潔なサマリー（2-3文）"
}
PROMPT_EOF
```

**注意**: ヒアドキュメントは `'PROMPT_EOF'`（シングルクォート）でクォートすること。これによりdiff内の `$` 等の特殊文字がbash展開されない。

`claude -p` で評価し、**生JSONをファイルに保存**（パイプや外部ツールは使わない）:

```bash
source ~/.nvm/nvm.sh 2>/dev/null || true; claude -p "$(cat /tmp/aimi-code-eval-{N}.txt)" \
  --model "${AIMI_CODE_EVAL_MODEL:-claude-opus-4-7}" \
  --output-format json \
  --max-turns 2 \
  > /tmp/aimi-code-score-{N}.txt
```

全候補の完了通知を受け取り、Readツールで `/tmp/aimi-code-score-{N}.txt` を収集。評価後、各 `/tmp/aimi-code-eval-{N}.txt` を削除。

**JSON抽出:**

Readツールで `/tmp/aimi-code-score-{N}.txt` を読み込み、JSONの `.result` フィールドを取得。`.result` 内にコードフェンス（` ```json ``` / `~~~json`）で囲まれたJSONがある場合はデリミタを除去してparseする。

**個別採点フォールバック:** 特定候補の `claude` 呼び出し失敗（exit code非0、空出力、`.result`が空/null）またはJSONパース失敗の場合、その候補のスコアをnullとして扱う。

**Step 3: スコア比較で最良候補決定**

個別採点の完了後、LLM呼び出しなしで直接比較して最良候補を決定する。統合評価のための追加LLM呼び出しは不要。

順位決定ロジック（上から順に評価）:
1. **客観指標のゲート**: ビルド失敗は除外済み。リグレッション0の候補を優先
2. **LLMスコアのtotal値**で降順ソート
3. **同点の場合のtie-break**: リグレッション数 → テスト通過（exit code 0を優先） → ビルド時間（短い方を優先） → candidate番号（小さい方を優先）
4. **LLMスコアがnullの候補**: 客観指標のみで他候補と比較

結果として `best` 候補を決定し、Phase 4（Codex改善）へ進む。

**Step 4: Codexレビュー**

最良候補が確定した後、**必ず** Codexでレビュー・改善を行う。

プロンプトをファイルに書き出し、`codex exec --full-auto` でバックグラウンド起動する:

```bash
# プロンプト作成
cat << 'PROMPT_EOF' > /tmp/codex-improve-prompt.txt
以下のワークツリーで、git diff で確認できる変更内容をレビューし、品質を向上させる修正を行ってください。

【元のタスク】
{元のタスク}

【指針】
- エッジケースの考慮漏れがあれば修正
- エラーハンドリングが不足していれば追加
- コードの可読性・保守性を向上させるリファクタリング
- 改善の余地がないと判断した場合は何も変更しないでください
PROMPT_EOF

# Codex起動（最良候補のワークツリー内で実行）
cd /abs/path/to/.claude/worktrees/aimi-code-{N} && \
  codex exec --full-auto "$(cat /tmp/codex-improve-prompt.txt)" < /dev/null 2>&1
```

- **`< /dev/null`** でstdinを閉じ、フリーズを防止（必須）
- `run_in_background: true` + Monitorツールでストリーミング表示
- 完了後、`git diff --stat` で変更を確認
- **再ビルド/テストを実行**: 失敗したら `git reset --hard HEAD && git clean -fd` でCodex変更を取り消す

### Phase 5: Merge & Cleanup

**Step 1: ユーザーへの報告**

1. 各候補のビルド/テスト結果サマリ
2. 評価スコア（客観指標 + LLM評価）
3. Codex改善の有無と変更内容（`git diff --stat`）
4. 採用案と選定理由

結果を表示後、ユーザーにマージの可否を尋ねて入力を待つ。

**Step 2: マージ**

ユーザーが承認した場合、マージ前に `git status --porcelain` でワーキングツリーがクリーンであることを再確認してから最良候補のブランチをマージ:

```bash
contrail git merge aimi-code-N-<base>-<ts> -m "aimi-code: <タスク概要>"
```

- マージコンフリクトがある場合は報告し、ユーザーに対応を委ねる
- ユーザーがマージを拒否した場合は、ワークツリーを保持したまま各候補のdiffを個別に確認可能

**Step 3: クリーンアップ**

**マージ成功の場合**: 全ワークツリー・一時ブランチを削除:

```bash
for i in $(seq 1 3); do
  git worktree remove .claude/worktrees/aimi-code-$i --force
  git branch -D aimi-code-$i-<base>-$ts
done
```

**マージ拒否の場合**: ワークツリー・ブランチを保持。後日 `/worktree-cleanup` 等で手動削除可能。

**一時ファイルクリーンアップ**: 全てのフェーズ完了後、以下を削除:

```bash
rm -f /tmp/aimi-code-eval-*.txt /tmp/aimi-code-score-*.txt /tmp/aimi-code-verify-*.txt /tmp/aimi-code-baseline.txt /tmp/aimi-code-diff-*.txt /tmp/aimi-code-completeness-*.txt /tmp/aimi-code-fix-*.txt
```

---

## エラーハンドリング

| 状況 | 対応 |
|---|---|
| Agentタイムアウト/失敗 | その候補を除外し、残りで評価を続行する。除外された候補はログの `excluded` フィールドに記録する |
| 全候補ビルド失敗 | 結果を報告し、クリーンアップ。再試行は提案 |
| コミットなし候補 | Phase 3 Step 1で検出し除外 |
| ビルド成功候補0件 | Phase 4をスキップし、結果を報告してクリーンアップ |
| マージコンフリクト | ユーザーに報告、手動対応を依頼 |
| マージ拒否 | ワークツリー・ブランチを保持。個別確認可能 |
| 個別採点の呼び出し/パース失敗 | 該当候補のスコアをnullとし、客観指標のみで評価。ユーザーに通知 |
| ビルド失敗候補の修正リトライ失敗 | その候補を除外し、残りで評価を続行 |
| Codex実行失敗/タイムアウト | Codex改善をスキップし、評価の最良候補をそのまま採用。ユーザーに通知 |
| Codex改善後にビルド/テスト失敗 | `git reset --hard HEAD && git clean -fd` でCodex変更を取り消し、元の候補を採用。ユーザーに通知 |
| Codexがインストールされていない | 警告表示しスキップ。評価の最良候補をそのまま採用 |
| ビルド/テストコマンド検出不可 | LLM評価のみで判定。警告表示 |
| テストなしプロジェクト | ビルド成功のみで客観指標ランク付け。同数ならLLM評価 |
| ベースラインテスト失敗 | 警告表示し続行（既存の失敗テストはリグレッション判定から除外） |
| クリーンアップ失敗 | ユーザーに残留ブランチ一覧を表示し手動削除を依頼 |
| `claude` CLI不在 | Phase 1 で検出。LLM評価をスキップし客観指標のみで評価。ユーザーに通知 |
| `claude` 呼び出し全滅（PATH不通・tool_use error等） | 全候補のスコアがnullになり、自動的に客観指標のみのtie-breakerにフォールバックする。ユーザーに「LLM評価が実行できませんでした（原因: ...）。客観指標のみで評価します」と通知 |

## フォールバック時のtie-breaker

客観指標のみで評価する場合（LLM評価モデル呼び出し失敗時）、客観指標で同順位になった場合の優先順位:
1. リグレッション数が少ない方
2. テスト通過（exit code 0）の方
3. ビルド時間が短い方
4. candidate番号が小さい方（先番）
