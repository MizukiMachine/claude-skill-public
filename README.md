# claude-skill-public

Claude Code 用カスタムスキル集。`~/.claude/skills/` に配置して使います。

## Game Dev

| Skill | Description |
|---|---|
| **phaser-gamedev** | Phaser 3/4 の 2D ブラウザゲーム開発 |
| **phaser4-gamedev** | Phaser 4 専用（レンダラ・シェーダ・マイグレーション） |
| **threejs-builder** | Three.js / WebGL の 3D Web 体験構築 |
| **blender-mcp-sprite-renderer** | Blender MCP でキャラクタアニメーションをスプライト PNG にレンダリング |
| **sprite-sheet-maker** | フレーム PNG をスプライトシートにパック |
| **spritefusion-pixel-snapper** | ラスタ画像をピクセルアート PNG に変換 |

## Web & Frontend

| Skill | Description |
|---|---|
| **frontend-design** | 本番向け UI 構築 + ブラウザスクリーンショット QA |
| **playwright-testing** | フロントエンドテスト（Playwright MCP / Vitest / フレーキー対策 / ゲームテスト） |
| **site-metadata-generator** | SEO meta / OGP / sitemap / Schema.org 自動生成 |
| **og-image-creator** | OG 画像・SNS プレビュー画像生成 |
| **og-image-ai** | OpenAI GPT Image + Pillow で AI OG 画像生成 |
| **favicon-generator** | Favicon・PWA アイコン一式生成 |
| **diagram** | コード解析からアーキテクチャ図生成（Mermaid） |
| **sysviz** | アーキテクチャ図をプロジェクトディレクトリに保存 |
| **flow-visualizer** | システムの全体像を詳細フロー図で説明 |

## Dialogue & Thinking

| Skill | Description |
|---|---|
| **aimi** | 複数エージェント並列生成 → 最良採用（思考・文章向け） |
| **aimi-code** | 複数候補を並列実装 → ビルド/テストで評価（コード向け） |
| **structured-dialogue** | アイデアを対話で構造化（要件・目標・非技術構想） |
| **qna** | Q&A 形式で要件定義・設計・意思決定を進める |
| **nanj** | スレッド風に AI ペルソナ同士でトピックを解説 |
| **goal-seek** | 漠然としたアイデアを対話で整理 |

## Skill Authoring

| Skill | Description |
|---|---|
| **skill-creator** | スキル作成ガイド |
| **skill-creator-plus** | 拡張スキル作成ガイド（品質・アンチパターン防止重視） |

## Git & Workflow

| Skill | Description |
|---|---|
| **gcommit** | diff 分析 → ブランチ作成 → コミット |
| **gmerge** | `--no-ff` で develop にマージ |
| **codex-kickoff** | Codex を新規ターミナルで起動 |
| **legacy** | （旧版）並列生成 → 最良採用汎用パターン |
| **legacy-code** | （旧版）worktree 分離で並列実装 |

## Install

スキルディレクトリを `~/.claude/skills/` にコピーするだけ。

```bash
git clone https://github.com/MizukiMachine/claude-skill-public.git
cp -r claude-skill-public/*/ ~/.claude/skills/
```
