---
name: gmerge
description: >
  ブランチをdevelopに--no-ffマージする。developがなければ作成。
  main/masterへのマージはブロック。
  トリガー: "マージして", "developにマージ", "git merge", "ブランチをマージ".
allowed-tools: Bash, Read, Grep, Glob
---

# Git Merge Skill

## 手順

### 1. 事前チェック

```bash
git branch --show-current
```

現在のブランチが `main` または `master` の場合 → **エラーでブロック**:

```
エラー: main/master への直接マージは禁止されています。
release ブランチ等を経由してください。
```

### 2. マージ先ブランチの確認

マージ先は `develop` とする。

```bash
git branch --list develop
```

- `develop` が存在する → ステップ3へ
- `develop` が存在しない → 現在のブランチから `develop` を作成:

```bash
git branch develop
```

作成後、ユーザーに「develop ブランチを作成しました」と通知。

### 3. developに切り替え

現在のブランチが `develop` でなければ切り替え:

```bash
git checkout develop
```

### 4. マージ実行

```bash
git merge --no-ff <source-branch>
```

マージメッセージはユーザー指定があればそれを使用、なければ自動生成:

```bash
git merge --no-ff <source-branch> -m "merge: <source-branch> into develop"
```

### 5. 結果確認

```bash
git log --oneline -5
git branch --show-current
```

## マージコンフリクト時

コンフリクトが発生した場合はマージを中止せず、ユーザーに報告:

```
マージコンフリクトが発生しました:
- <ファイル名>
手動で解決してください。
```

ユーザーが解決後に `git add` + `git commit` で完了、または `git merge --abort` で中止。

## 禁止事項

- `main` / `master` へのマージはブロック
- `git merge` に `--ff` や `--ff-only` は使用しない（必ず `--no-ff`）
- `git push` はこのスキルの範囲外（ユーザーの判断に委ねる）
- 結果の省略・スキップ・要約は禁止
