---
name: codex-kickoff
description: >
  Codexを新規ターミナル/パネルで起動し、キックオフプロンプトを渡す。
  contrail-web内なら新パネル、通常CLIならtmuxウィンドウ。
  トリガー: "codex kickoff", "コーデックスに任せる", "codexに投げる", "別タスクでcodex".
allowed-tools: Bash
---

# Codex Kickoff Skill

Codexに別タスクを委任して並行実行するスキル。実行環境を自動検知し、最適な方法でCodexを起動する。

## 手順

### 1. キックオフプロンプトの取得

ユーザーの指示からCodexに渡すプロンプト（タスク内容）を特定する。
プロンプトが明示的に指定されていない場合は、ユーザーに確認する。

### 2. プロンプトの一時ファイル書き出し

```bash
PROMPT_FILE=$(mktemp /tmp/codex-kickoff-XXXXXX.txt)
cat > "$PROMPT_FILE" << 'PROMPT_EOF'
<ユーザーのプロンプトをここに記述>
PROMPT_EOF
```

### 3. 環境検知とCodex起動

#### パターンA: contrail-web環境 (`$CONTRAIL_WEB_PORT` が設定されている)

contrail-webのAPI経由で新パネルを作成し、Codexを起動する。

```bash
if [ -n "$CONTRAIL_WEB_PORT" ]; then
  CWD="$(pwd)"
  RESPONSE=$(jq -n \
    --arg cmd "codex" \
    --arg args "$(cat "$PROMPT_FILE")" \
    --arg cwd "$CWD" \
    '{command:$cmd, args:$args, cwd:$cwd, direct:true}' | \
    curl -s -X POST "http://localhost:${CONTRAIL_WEB_PORT}/api/panels/spawn" \
      -H "Content-Type: application/json" \
      -d @-)

  if [ $? -eq 0 ] && echo "$RESPONSE" | grep -q "panel_id"; then
    echo "Codex panel spawned: $RESPONSE"
  else
    echo "contrail-web API failed, falling back to tmux..."
    # fall through to Pattern B
    unset CONTRAIL_WEB_PORT
  fi
fi
```

注意:
- `codex exec --full-auto` により、Codexは自動実行モードになる
- `direct: true` によりPTYモードで起動され、対話型ターミナルとして動作
- `cwd` で現在の作業ディレクトリを渡す
- `jq -n --arg` で安全にJSONを構築する

#### パターンB: 通常CLI環境 (tmuxが利用可能)

**重要**: tmuxコマンド文字列にプロンプト本文を直接埋め込むと、バッククォート等の特殊文字が
内側のシェルで解釈される。プロンプト本文は一時ファイルからrunner scriptで読み込むこと。

```bash
if [ -z "$CONTRAIL_WEB_PORT" ]; then
  PROMPT_FILE_CLEANUP_BY_RUNNER=1
  RUNNER_FILE=$(mktemp /tmp/codex-kickoff-runner-XXXXXX.sh)
  cat > "$RUNNER_FILE" << 'RUNNER_EOF'
#!/usr/bin/env bash
set -euo pipefail

PROMPT_FILE="$1"
trap 'rm -f "$PROMPT_FILE" "$0"' EXIT

codex exec --full-auto "$(cat "$PROMPT_FILE")" < /dev/null
RUNNER_EOF
  chmod +x "$RUNNER_FILE"
fi

if [ -z "$CONTRAIL_WEB_PORT" ] && [ -n "$(command -v tmux 2>/dev/null)" ] && [ -n "$TMUX" ]; then
  # tmuxセッション内の場合、新ウィンドウで起動
  WINDOW_NAME="codex-$(date +%H%M%S)"
  tmux new-window -n "$WINDOW_NAME" "'$RUNNER_FILE' '$PROMPT_FILE' ; echo '[Codex finished - Press Enter to close]' ; read"
  echo "Codex launched in tmux window: $WINDOW_NAME"
elif [ -z "$CONTRAIL_WEB_PORT" ] && [ -n "$(command -v tmux 2>/dev/null)" ]; then
  # tmuxはあるがセッション外の場合
  tmux new-session -d -s codex -n "codex-$(date +%H%M%S)" "'$RUNNER_FILE' '$PROMPT_FILE'"
  echo "Codex launched in new tmux session: codex"
elif [ -z "$CONTRAIL_WEB_PORT" ]; then
  # tmuxもない場合、バックグラウンド実行
  "$RUNNER_FILE" "$PROMPT_FILE" &
  echo "Codex launched in background (PID: $!)"
fi
```

注意:
- runner script方式により、プロンプト内のバッククォート・`$()`・`!` 等はtmux側のシェルで解釈されない
- `< /dev/null` は必須。stdinが開いたままだとCodexがフリーズする
- パターンBではrunner scriptの `trap` が `PROMPT_FILE` と `RUNNER_FILE` を削除する
- `codex exec --full-auto` が正しいCLI構文（`-q` フラグは存在しない）

#### パターンC: codexコマンドが存在しない場合

```bash
if ! command -v codex &>/dev/null; then
  echo "Error: 'codex' command not found. Install Codex CLI first."
  echo "  npm install -g @openai/codex"
fi
```

### 4. 一時ファイルの削除

```bash
# contrail-web成功時など、起動側でプロンプト本文を渡し終えている場合のみ削除する。
# パターンBではrunner scriptのtrapが削除するため、ここでは削除しない。
if [ "${PROMPT_FILE_CLEANUP_BY_RUNNER:-0}" != "1" ]; then
  rm -f "$PROMPT_FILE"
fi
```

### 5. 結果の報告

ユーザーに以下を報告:
- Codexの起動方法（contrail-webパネル / tmuxウィンドウ / バックグラウンド）
- パネルID または ウィンドウ名
- 確認方法（contrail-web: ブラウザで確認、tmux: `tmux list-windows`）

## エラーハンドリング

- codexコマンドが見つからない場合はインストール方法を案内
- contrail-web API呼び出しが失敗した場合はtmuxにフォールバック
- tmuxも利用できない場合はバックグラウンド実行にフォールバック
- プロンプトが空の場合はユーザーに確認
