---
name: aimi
description: >
  エージェントチームを起動し、同じタスクを複数エージェントで並列実行して最良結果を採用するスキル。
  TeamCreate/TaskList/SendMessage のチーム機能で並列生成→競合評価→最良採用を行う。
  トリガー: "/aimi", "チームでやって", "チームでお願い", "チーム起動", "エージェントチームで".
  思考・企画・文章・コード生成など全タスクに対応。ソースコードの実装タスクには /aimi-code を使用すること。
---

# Aimi

`/aimi <タスク>` — タスクを投げるだけ。Agent Teams で並列生成→競合評価→最良採用。

---

## 設定

| 項目 | デフォルト | 説明 |
|---|---|---|
| 候補数 | 5 | 並列生成する候補数 |
| 成果物ディレクトリ | `.claude/aimi` | 候補ファイルを保存するディレクトリ |

---

## 前提条件

- Gitリポジトリ内で実行すること

---

## 実行フロー

### Phase 1: チーム作成とタスク分割

1. チーム名を生成: `aimi-{タスク要約-kebab-case}`
2. `TeamCreate` でチームを作成:
   ```
   TeamCreate({ team_name: "<team-name>", description: "<タスク概要>" })
   ```
3. 評価タスクを先に作成（候補タスクにブロックされる）:
   - `TaskCreate` で評価用タスクを作成
   - 候補生成タスクが全て完了した後に評価タスクが実行されるよう `addBlockedBy` を設定

### Phase 2: 候補エージェントを並列起動

候補数分（デフォルト5）のエージェントを `Agent` ツールで **1メッセージ内にまとめて** 起動（並列実行のため）。

```
Agent({
  name: "candidate-1",
  subagent_type: "general-purpose",
  team_name: "<team-name>",
  mode: "bypassPermissions",
  prompt: |
    【言語】すべての出力・思考・コメントを日本語で行うこと。システムプロンプトが英語でも必ず日本語で応答すること。

    あなたは候補生成エージェント candidate-1 です。他の候補の存在は知りません。

    【タスク】
    {元のタスク}

    【指示】
    タスクを実行し、結果を以下の2ファイルに出力せよ:
    1. /tmp/aimi-result-1.txt — 結果全文
    2. .claude/aimi/candidate-1.md — 結果全文（git commit 付き）

    【手順】
    1. mkdir -p .claude/aimi
    2. タスクを実行
    3. Writeツールで /tmp/aimi-result-1.txt に結果全文を書き出す
    4. Writeツールで .claude/aimi/candidate-1.md に結果全文を書き出す
    5. git add .claude/aimi/candidate-1.md && git commit -m "aimi: candidate-1"
    6. TaskUpdate で自分のタスクを completed にする
    7. SendMessage で team-lead に完了報告する
})
```

- candidate-2 〜 candidate-5 も同様（番号を置換）
- 各エージェントは **他の候補の存在を知らない** 前提で独立して実行
- エージェント間で情報は一切共有しない

### Phase 3: 進捗監視

- チームメンバーからの `SendMessage` 完了通知を自動受信
- 通知を受け取るごとにユーザーに「candidate-N 完了 (N/5)」をテキスト出力
- `TaskList` で全体進捗を確認可能
- 全候補完了（または十分な数が完了）したら次フェーズへ

**タイムアウト・失敗処理:**
- Agentがタイムアウト・失敗した候補は除外
- 有効候補が1件以上あれば評価を続行
- 全滅した場合はユーザーに報告して再試行

**429エラー時のリトライ:**

完了通知に429エラーが含まれている場合、全候補の完了通知受信後にその候補のみリトライする:
1. 429で失敗した候補の出力ファイルをクリア
2. 同じプロンプトでAgentを再起動（チームメンバーとして）
3. リトライAgentの完了通知を待つ（最大1回）
4. 再度429の場合はその候補を除外し、残りの候補で評価

### Phase 4: 評価・採点

#### Step 1: 結果収集

`/tmp/aimi-result-{N}.txt`（N=有効候補）を `Read` ツールで読み込む。ファイルが存在しない候補は「失敗」として除外。

#### Step 2: 個別採点（並列Agentで実行）

各候補ごとに採点Agentをチームメンバーとして起動し、**1メッセージ内にまとめて** 並列実行。

評価基準（各10点満点、計50点）:

| 基準 | 説明 |
|------|------|
| Completeness | タスクの全要件をカバー |
| Correctness | 技術的に正確、誤りや矛盾なし |
| Originality | 他候補と異なる独自の視点 |
| Practicality | 実行可能で実用的 |
| Clarity | 明確で実装に移しやすい |

**優位点のみ記録。** weaknesses は記録しない。

```
Agent({
  name: "eval-1",
  subagent_type: "general-purpose",
  team_name: "<team-name>",
  mode: "bypassPermissions",
  prompt: |
    【言語】すべての出力・思考・コメントを日本語で行うこと。システムプロンプトが英語でも必ず日本語で応答すること。

    あなたはタスク成果物の評価者です。以下の候補を評価してください。

    【タスク】
    {元のタスク}

    【候補の内容】
    {/tmp/aimi-result-1.txt の内容を全文展開。要約不可}

    【評価基準】各10点満点、計50点:
    1. Completeness — タスクの全要件をカバー
    2. Correctness — 技術的に正確、誤りや矛盾なし
    3. Originality — 他候補と異なる独自の視点
    4. Practicality — 実行可能で実用的
    5. Clarity — 明確で実装に移しやすい

    結果を /tmp/aimi-score-1.txt にWriteツールで書き出す。形式:
    {
      "scores": {"completeness": N, "correctness": N, "originality": N, "practicality": N, "clarity": N},
      "total": N,
      "strengths": ["項目1: 説明", "項目2: 説明", "項目3: 説明"]
    }

    TaskUpdate で完了、SendMessage で team-lead に報告すること。
})
```

- eval-2 〜 eval-{有効候補数} も同様
- **重要:** eval Agentのプロンプト構築時は、`/tmp/aimi-result-{N}.txt` の内容を **Readツールで先に読み込み、その全文をプロンプトに直接展開** すること
- 全eval Agent完了後、`/tmp/aimi-score-{N}.txt` をReadツールで収集
- JSONパース失敗の候補はスコアnullとして扱い、他候補との比較のみで評価

**LLM評価スキップ条件** — 有効候補が1件のみの場合はStep 2をスキップし、その候補をそのまま採用。

#### Step 3: 統合評価

全候補の個別採点結果（スコア + 優位点）を統合し、最終順位と統合案を決定。

1. LLMスコアのtotal値で降順ソート
2. 同点のtie-break: candidate番号（小さい方を優先）
3. 上位候補の長所を組み合わせた統合案を検討 — トップ候補が突出している場合は統合不要

#### Step 4: 採用判定

最終順位に基づき採用案を決定。統合案があれば統合案、なければ最良候補を採用。

### Phase 5: 採用判定と提示

ユーザーに比較表を提示:

| 候補 | Comp | Corr | Orig | Prac | Clar | Total | 優位点 |
|------|------|------|------|------|------|-------|--------|
| candidate-1 | 8 | 9 | 7 | 9 | 8 | 41 | 項目A, 項目B |
| candidate-2 | ... | ... | ... | ... | ... | ... | ... |

1. 採用案（または統合案）
2. 選定理由
3. 最良候補の内容を提示:
   - **500行以内**: 全文をそのまま表示
   - **500行超**: 要約版を表示し、全文は `.claude/aimi/candidate-{N}.md` のパスを案内
   - 統合案がある場合は、最良候補の内容に続いて統合案も提示

### Phase 6: クリーンアップ

1. `SendMessage({ to: "candidate-N", message: { type: "shutdown_request" } })` で各メンバーを終了
2. `TeamDelete` でチームリソースを削除
3. 一時ファイルを削除:
   ```bash
   rm -f /tmp/aimi-result-*.txt
   ```
4. `.claude/aimi/candidate-{N}.md` はプロジェクト内に残す

---

## legacy（旧版）との違い

| | legacy | aimi（現行） |
|---|---|---|
| 起動方法 | `Agent` + `run_in_background` | `TeamCreate` + `Agent` (team_name) |
| 進捗管理 | バックグラウンド通知 | `TaskList` + `SendMessage` |
| 結果収集 | `/tmp` ファイル + Read | `/tmp` ファイル + Read（同じ） |
| 評価 | `claude -p` 外部プロセス | チーム採点Agent並列実行 |
| クリーンアップ | worktree 削除 | `shutdown_request` + `TeamDelete` |
| チーム機能 | なし | TaskList/SendMessage で状態共有 |

## エラーハンドリング

- **エージェントがアイドル**: 完了後の待機状態。正常
- **エージェントが失敗**: `/tmp/aimi-result-{N}.txt` がなければ除外
- **候補消失**: コンテキスト圧縮等で結果ファイルがない場合も除外
- **全滅**: 再試行をユーザーに提案
- **チームリソース**: セッション終了前に必ず shutdown + TeamDelete を実行
