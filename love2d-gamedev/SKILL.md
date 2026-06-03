---
name: love2d-gamedev
description: "End-to-end LÖVE/Love2D game development and iOS deployment. Use when working with Love2D projects (`main.lua`, `conf.lua`), core callbacks (`love.load`, `love.update`, `love.draw`), gameplay mechanics, graphics/animation/tiles/collision/audio, packaging `.love` archives, or integrating a Love2D game into an Xcode iOS app (bundle resources, touch controls, signing/build troubleshooting)."
---

# Love2D ゲーム開発

## 概要

LÖVE/Love2D（Lua）で完成度の高い2Dゲームを開発する。Xcode経由のiOSビルドに向けた実践的なワークフローも含む。

## クイックリファレンス

| トピック | 参照するタイミング |
|-------|---------------------|
| [Core Architecture](references/core-architecture.md) | ゲームループ、コールバック、モジュールパターン |
| [Project Structure](references/project-structure.md) | ファイル構成、`conf.lua`、配布方法 |
| [Graphics & Drawing](references/graphics-drawing.md) | レンダリング、変換、スケーリング |
| [Animation](references/animation.md) | スプライトシート、quad、フレームタイミング |
| [Tiles & Maps](references/tiles-maps.md) | タイルマップ、レベルのロード |
| [Collision](references/collision.md) | AABB/circle/SATパターン |
| [Audio](references/audio.md) | 効果音/BGM、音量、プーリング |
| [Libraries](references/libraries.md) | コミュニティ定番ライブラリ |
| [iOS Overview](references/ios/overview.md) | モバイル開発のワークフローと注意点 |
| [iOS Setup](references/ios/setup.md) | Xcode/Love2D iOSソース/ライブラリ、署名 |
| [iOS Touch Controls](references/ios/touch-controls.md) | マルチタッチ、バーチャルコントロール |
| [iOS Xcode Project](references/ios/xcode-project.md) | pbxprojの構造と編集方法 |

## 基本的な指針

- 時間に依存する処理（移動、タイマー、アニメーション）では `dt` を必ず使う。
- アセットは `love.load()` で一度だけロードする。`love.update()` や `love.draw()` 内ではロードしない。
- グローバル変数より local 変数とモジュールを優先し、状態を明示的に管理する。
- UI/レイアウトにピクセル値をハードコードしない。`love.graphics.getDimensions()` を基準にアンカー・スケールを設定する。

### 最小構成のループ

```lua
function love.load()
  -- 初期化とアセット読み込み
end

function love.update(dt)
  -- ゲームロジック
end

function love.draw()
  -- 描画
end
```

## ワークフロー: デスクトップ開発ループ

1. 開発中はデスクトップでこまめにゲームを実行して確認する。
2. iOS専用コードは分離しておく（例: `love.system.getOS()` でゲートした `touch.lua`）。
3. `dt` をあらゆる箇所で使用し、低FPS時（高負荷のシミュレーション）でもゲームプレイが正常か検証する。

## ワークフロー: iOS ビルド/デプロイループ

`scripts/` 内のヘルパースクリプトを使って `game.love` を確実に再ビルドし、Xcodeプロジェクト（またはステージングフォルダ）にコピーする。

1. `.love` アーカイブをビルド/更新する:
   - `python3 scripts/make_game_love.py --src /path/to/game --out /path/to/game.love`
2. iOSアプリのバンドルリソースフォルダ（または任意の出力先）にコピーする:
   - `python3 scripts/sync_game_love.py --love /path/to/game.love --dest /path/to/xcode/project/resources/`
3. Xcodeでビルド/実行し、署名・デプロイターゲット・バンドルリソースの問題を必要に応じて修正する。

詳細とトラブルシューティングは以下を参照:
- [iOS Overview](references/ios/overview.md)
- [iOS Setup](references/ios/setup.md)
- [iOS Xcode Project](references/ios/xcode-project.md)

## 注意事項

機能を実装する際に上記のいずれかの領域に関わる場合は、新しいアーキテクチャを独自に考案せず、対応するリファレンスドキュメントを読んでそのパターンを適用すること。
