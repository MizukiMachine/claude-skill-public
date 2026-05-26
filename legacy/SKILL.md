---
name: legacy
description: >
  （旧版）並列で複数の候補を生成し、競合評価によって最良の1つを採用する汎用パターン。
  Agent Teams版の /aimi に移行済み。トリガー: "/legacy".
allowed-tools: Agent, Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch
---

# Aimi

`/aimi <タスク>` — タスクを投げるだけ。裏で勝手にやる。

---

## 設定

| 項目 | デフォルト | 説明 |
|---|---|---|
| `AIMI_EVAL_MODEL` | `claude-opus-4-7` | 評価フェーズで使用するモデル。環境変数で上書き可能 |
| 候補数 | 5 | 並列生成する候補数 |
| 成果物ディレクトリ | `.claude/aimi` | 候補ファイルを保存するプロジェクト内ディレクトリ |

**モデルの更新方法:**
- 一時的に変更: `AIMI_EVAL_MODEL=claude-opus-5-0 /aimi タスク`
- 恒久的に変更: 下のデフォルト値を書き換える（1箇所のみ）

## 前提条件

- 評価フェーズ用に `claude` CLIが `--model` で指定したモデルにアクセスできること
- 外部ツール（`jq`等）への依存なし。LLM評価のJSONパースはReadツールで直接行う
- Gitリポジトリ内で実行すること（worktree作成のため）

---

## 実行フロー

### Phase 1: 5つの候補を並列生成（現在のセッションモデル）

5個のAgentを `run_in_background: true` で同時起動する。全5個を1つのメッセージ内にまとめる（並列実行のため）。

- Agent名: `candidate-1` 〜 `candidate-5`
- `subagent_type: "general-purpose"`
- `isolation: "worktree"` を使用して各Agentを独立worktreeで実行
- 各Agentに同じタスクを与える。「他の候補の存在は知らない」前提で、それぞれ自分の最善を独立に出す
- 候補間で情報は一切共有しない

**各Agentへの追加指示（二段階出力）:**

各Agentには、タスク実行に加えて以下の2ファイル出力を実行させる:

1. **評価用一時ファイル**（高速アクセス用）:
   結果の全文を `/tmp/aimi-result-{N}.txt` にWriteツールで書き出す

2. **プロジェクト内成果物**（git永続化用）:
   ```bash
   mkdir -p .claude/aimi
   ```
   その後、結果の全文を `.claude/aimi/candidate-{N}.md` にWriteツールで書き出し、コミット:
   ```bash
   git add .claude/aimi/candidate-{N}.md
   git commit -m "aimi: candidate-{N} result"
   ```

### Phase 1.5: 進捗監視

Agent完了通知ベースで進捗を管理する。ステータスファイルやMonitorツールのpollingは使用しない。

- `run_in_background: true` で起動したAgentの完了通知を受け取る
- 通知を受け取るごとにユーザーに「candidate-N 完了 (N/5)」をテキスト出力
- 全5件完了（またはタイムアウト）を検知したら次フェーズへ移行

### Phase 2: 候補を評価モデルで個別採点 → 統合評価

**ファイルから結果を収集:**

`/tmp/aimi-result-{N}.txt`（N=1〜5）をReadツールで読み込む。ファイルが存在しない候補は「失敗・消失」として除外し、ユーザーに通知する。

**除外候補の処理:**

Agentがタイムアウト・失敗・消失した場合、その候補を除外し、残りで評価を続行する。除外後の有効候補だけを評価プロンプトに含める。評価結果の `scores` も有効候補のみを対象にする。有効候補が1件でも残っていれば採用候補の選定は続行する。候補消失（コンテキスト圧縮等で結果ファイルが存在しない場合）も「失敗」と同様に除外する。全滅した場合は採用・ログ記録を行わず、ユーザーに報告して再試行する。

有効候補が1件以上あれば、以下の手順で評価を実行する。

**Step 1: 個別採点（並列実行）**

全有効候補の採点を並列実行する。全ての `claude -p` 呼び出しを1つのメッセージ内のBashツールで `run_in_background: true` にまとめる（並列実行のため）。

**重要事項:**
- **候補生成時に使用したモデル固有の環境変数を `claude` 呼び出し時に引き継いではいけない。** 素の `claude` コマンドをそのまま呼ぶことで、評価用モデルに正しくルーティングされる
- `--output-format json` の出力は `{"type":"result","result":"...","is_error":false,...}` 形式。`.result` フィールドに評価回答が含まれる
- **外部ツール（`jq`等）への依存は禁止。** 生JSONをファイルに保存し、Readツールで読み込んでClaude自身がパースする

**Step 1a: プロンプト構築（foreground、全候補分を通常実行）**

各候補の結果**全文**を含めたプロンプトをBashツールのヒアドキュメントで構築する（Writeツールでは `$(cat ...)` がリテラル展開されず候補内容が含まれないため）。全候補分を1メッセージ内でまとめて通常実行:

```bash
cat << 'PROMPT_EOF' > /tmp/aimi-eval-{N}.txt
あなたはタスク成果物の評価者です。以下の候補を評価してください。

【タスク】
{元のタスク}

【候補の内容】
PROMPT_EOF
cat /tmp/aimi-result-{N}.txt >> /tmp/aimi-eval-{N}.txt
cat << 'PROMPT_EOF' >> /tmp/aimi-eval-{N}.txt

【評価基準】各10点満点、計50点:
1. Completeness — タスクの全要件をカバー
2. Correctness — 技術的に正確、誤りや矛盾なし
3. Originality — 他候補と異なる独自の視点
4. Practicality — 実行可能で実用的
5. Clarity — 明確で実装に移しやすい

【出力形式】
~~~json と ~~~ で囲んだJSONコードブロック1つのみ。前後に説明文一切なし。
{
  "scores": {"completeness": N, "correctness": N, "originality": N, "practicality": N, "clarity": N},
  "total": N,
  "strengths": ["項目1: 説明", "項目2: 説明", "項目3: 説明"]
}
PROMPT_EOF
```

**注意**: ヒアドキュメントは `'PROMPT_EOF'`（シングルクォート）でクォートすること。これにより候補内の `$` 等の特殊文字がbash展開されない。

**Step 1b: 採点実行（background、全候補分を並列実行）**

`claude -p` で評価し、**生JSONをファイルに保存**（パイプや外部ツールは使わない）。全候補分を1メッセージ内のBashツールで `run_in_background: true` にまとめて並列実行:

```bash
source ~/.nvm/nvm.sh 2>/dev/null || true; claude -p "$(cat /tmp/aimi-eval-{N}.txt)" \
  --model "${AIMI_EVAL_MODEL:-claude-opus-4-7}" \
  --output-format json \
  --max-turns 1 \
  > /tmp/aimi-score-{N}.txt
```

全候補の完了通知を受け取り、Readツールで `/tmp/aimi-score-{N}.txt` を収集。評価後、各 `/tmp/aimi-eval-{N}.txt` を削除。

**JSON抽出:**

Readツールで `/tmp/aimi-score-{N}.txt` を読み込み、JSONの `.result` フィールドを取得。`.result` 内にコードフェンス（` ```json ``` / `~~~json`）で囲まれたJSONがある場合はデリミタを除去してparseする。

**採点記録ルール:**
- **優れている点のみ記録する。** weaknesses（弱点）は記録しない
- strengthsは項目ごとに分けて記録し、後で横断比較可能にする
- スコアとstrengthsの両方を比較表にまとめる

**個別採点フォールバック:** 特定候補の `claude` 呼び出し失敗（exit code非0、空出力、`.result`が空/null）またはJSONパース失敗の場合、その候補のスコアをnullとし、統合ステップでは客観判断のみで評価する。

**Step 2: 統合評価**

全候補の個別採点結果（スコア + 優位点）を統合し、最終順位と統合案を決定。

Writeツールで統合プロンプトを `/tmp/aimi-integrate-prompt.txt` に書き出し、`claude -p` で評価。生JSONを `/tmp/aimi-integrate.txt` に保存し、Readツールで読み込んでClaude自身がパースする:

```bash
source ~/.nvm/nvm.sh 2>/dev/null || true; claude -p "$(cat /tmp/aimi-integrate-prompt.txt)" \
  --model "${AIMI_EVAL_MODEL:-claude-opus-4-7}" \
  --output-format json \
  --max-turns 1 \
  > /tmp/aimi-integrate.txt
```

統合プロンプト構成:
```
あなたはタスク成果物の統合評価者です。複数候補の個別採点結果から、最終順位と統合案を作成してください。

【タスク】
{元のタスク}

【個別採点結果】
candidate-1: total=42, strengths=["項目1: ...", "項目2: ..."]
candidate-2: total=38, strengths=["項目1: ...", "項目2: ..."]
...

【出力形式】
~~~json と ~~~ で囲んだJSONコードブロック1つのみ。前後に説明文一切なし。
{
  "scores": [
    {"candidate": "candidate-1", "completeness": N, "correctness": N, "originality": N, "practicality": N, "clarity": N, "total": N},
    ...（有効候補分）
  ],
  "best_candidate": "candidate-N",
  "integration_proposal": "上位候補の長所を組み合わせた統合案",
  "reasoning": "選定理由"
}
```

**JSON抽出:**

Readツールで `/tmp/aimi-integrate.txt` を読み込み、`.result` フィールドからJSONを抽出。コードフェンス（` ```json ``` / `~~~json`）で囲まれている場合はデリミタを除去してparse。実行後 `/tmp/aimi-integrate-prompt.txt` と `/tmp/aimi-integrate.txt` を削除。

**統合評価フォールバック:** `claude` 呼び出し失敗、またはJSONパース失敗の場合、個別スコアのtotal値で順位付けし、`best_candidate` を決定。`integration_proposal` は null とする。ユーザーに通知する。

### Phase 3: 採用判定

ユーザーにはスコアと優位点の比較表を提示する:

| 候補 | Comp | Corr | Orig | Prac | Clar | Total | 優位点 |
|------|------|------|------|------|------|-------|--------|
| candidate-1 | 8 | 9 | 7 | 9 | 8 | 41 | 項目A, 項目B |
| candidate-2 | ... | ... | ... | ... | ... | ... | ... |

その上で:
1. 採用案（または統合案）
2. 選定理由

### Phase 3.5: 採用候補の提示

Phase 3の判定後、最良候補の `/tmp/aimi-result-{N}.txt` をReadツールで読み込み、ユーザーに内容を提示する。

- **候補が短い場合（500行以内）**: 全文をそのまま表示
- **候補が長大な場合**: 要約版を表示し、全文はファイルパスを案内
- 統合案がある場合は、最良候補の内容に続いて統合案も提示

### Phase 4: クリーンアップ

**一時ファイルクリーンアップ:**
```bash
rm -f /tmp/aimi-result-*.txt /tmp/aimi-eval-*.txt /tmp/aimi-score-*.txt /tmp/aimi-integrate.txt /tmp/aimi-integrate-prompt.txt
```

**成果物ファイルはプロジェクト内に残す**（`.claude/aimi/candidate-{N}.md`）。
不要な候補worktreeはユーザー確認後に削除可能。
