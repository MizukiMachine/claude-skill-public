---
name: phaser-gamedev
description: "Phaser 3またはPhaser 4の2Dブラウザゲームを構築、デバッグ、最適化、移行する。Phaser scene、game config、spritesheet、animation、input、Arcade/Matter physics、Tiled tilemap、UI panel、nine-slice、performance、asset pipeline、Phaser 3/4互換性を扱うときに使う。"
---

# Phaser Game Development

## Purpose

このスキルを使って、コードベースの状況を把握しながら Phaser ブラウザゲームの実装・デバッグ・最適化・移行を行う。動作するゲームコード、asset メタデータ、集中的なテストやスモークチェック、Phaser バージョンと検証内容の簡潔なサマリーを成果物として提供する。

## Operating Model

Phaser の品質は3つの契約で決まる：正確な asset メタデータ、明確な scene の所有関係、そしてフレームレートに依存しないシミュレーション。

優先順位：
1. 正しいゲームプレイと入力の手触り
2. 計測済みの asset サイズと安定した loader キー
3. ゲームプレイ・UI・メニュー・ローディングを分離する scene の境界
4. プロファイリングや目視確認に裏付けられたブラウザ/モバイルのパフォーマンス
5. 既存のプロジェクトスタイルに合わせた小さく可逆的な変更

着手前に以下を確認すること：
- インストール済み、またはベンダー提供の Phaser メジャー/マイナーバージョンはどれか？
- asset の正となる情報源はどれか？正確なサイズ・spacing・margin・フレーム名・Tiled プロパティは？
- どの physics モデルがメカニクスに合っているか：Arcade、Matter、それとも physics なし？
- 各オブジェクトはどの scene が所有しているか、また scene 遷移をまたいでどのように状態が引き継がれるか？
- 毎フレーム大量に処理される、または生成/破棄の頻度が高くてプーリングが必要なオブジェクトはどれか？

## Version Contract

プロジェクトが Phaser ゲームだからといって、Phaser 3 の API を前提にしてはならない。バージョン固有の API を使用する前に、インストール済みまたはベンダー提供のバージョンを確認すること。

まずローカルの証拠を優先する：

```bash
rg -n "\"phaser\"|from ['\"]phaser['\"]|Phaser\\.VERSION|new Phaser\\.Game" . -g 'package.json' -g '*lock*' -g 'src/**' -g 'public/**' -g 'assets/**'
```

このコマンドで一致が得られない場合は、ベンダーバンドル、HTML の script タグ、またはランタイムの `Phaser.VERSION` を確認するサインであり、最終結論ではない。

次のルールを適用する：

| プロジェクトの状態 | ルール |
|---------------|------|
| Phaser 4.x | WebGL 中心のパターンを優先する。v3 の renderer pipeline、mask、FX、tint fill、camera 内部、DynamicTexture のタイミングは移行が必要なものとして扱う。`references/versioning-migration.md` を読むこと。 |
| Phaser 3.x | 対応する 3.x のドキュメントとサンプルを使用する。組み込みの `NineSlice` は 3.60 以降のみを対象とし、WebGL の要件を確認すること。 |
| バージョン不明 | API に依存するコードを編集する前に、依存関係・ベンダーファイルのバナー・`Phaser.VERSION` を確認すること。 |
| ユーザーが移行を求めている | ゲームプレイロジックを変更する前に、削除された API とカスタムレンダリングの棚卸しを行うこと。 |

現在の API の詳細が重要な場合は、記憶に頼らず、対象のメジャー/マイナーバージョンの公式 Phaser ドキュメントで確認すること。

## Before Implementing

コードを書く前に既存プロジェクトの構成を調査する：

```bash
rg --files | rg '(^|/)(package.json|vite.config|src|public|assets|static|maps|tilemaps|textures|sprites)'
rg -n "class .*Scene|extends Phaser\\.Scene|scene:|this\\.scene\\.|this\\.load\\.|this\\.physics|this\\.anims|tilemap|nineslice|NineSlice|Matter|Arcade" .
```

以下を把握する：
- エントリポイントと `Phaser.GameConfig`
- scene の一覧・scene キー・遷移フロー
- asset の場所・loader キー・spritesheet のフレーム設定・atlas フォーマット・Tiled マップ名
- 入力モデル・カメラ/スケールモード・physics システム・デバッグ切り替え
- typecheck・lint・test・build・dev preview 用の利用可能なスクリプト

実装に大きく影響するルール・コントロール・アートの方向性・ターゲットプラットフォームが不明な場合のみ、最大1〜2つの質問をすること。

## Workflow

1. バージョン・アーキテクチャ・asset を調査する。
2. コンテンツを追加する前に scene とステートモデルを選択または維持する。
3. animation・tilemap・UI を作成する前に asset を計測し loader config を確定する。
4. delta-time 移動・明示的な physics body・安定したオブジェクトライフサイクルでゲームプレイを実装する。
5. 壊れやすいシステムにデバッグの可視化を追加する：collision body・タイル衝突・animation テストシーン・FPS・bounds のオーバーレイ。
6. プレイアブルなサーフェスがある場合は、リポジトリのスクリプトとブラウザのスモークテストで検証する。

## Reference Files

| トピック | ファイル | 使用するとき |
|-------|------|----------|
| Phaser 3/4 の互換性と移行 | `references/versioning-migration.md` | バージョン固有の API、Phaser 3 から 4 への移行、renderer/filter/camera/tint の変更 |
| Spritesheet・animation フレーム・UI スライシング | `references/spritesheets-nineslice.md` | spritesheet の読み込み・フレームの計測・texture atlas・nine-slice パネル |
| Tiled tilemap と collision レイヤー | `references/tilemaps.md` | JSON マップの読み込み・tileset・object レイヤー・タイル衝突・カメラ・パララックス |
| Arcade physics のチューニングとプーリング | `references/arcade-physics.md` | Arcade body・collider・overlap・group・collision カテゴリ・デバッグレンダリング |
| パフォーマンスとプロファイリング | `references/performance.md` | FPS 低下・object churn・draw call・メモリリーク・update ループのコスト |

## Capabilities And Deliverables

このスキルでできること：
- Phaser scene・game config・input・カメラ・UI オーバーレイ・scene 遷移の追加またはリファクタリング。
- spritesheet・texture atlas・audio・tilemap・生成 asset の読み込みと検証。
- Arcade または Matter physics・collision callback・group・プーリング・デバッグ可視化の実装。
- Tiled JSON の collision レイヤーと object レイヤーを使った tilemap 駆動のレベル構築。
- object churn・draw call・メモリリーク・重い update 処理のプロファイリングと削減。
- 動作を維持しながら Phaser 3 プロジェクトを Phaser 4 に移行。

成果物：
- 既存のフレームワーク・TypeScript スタイル・asset パス・命名規則に合わせたコード編集。
- 実装で使用した計測済みの asset 定数やマッププロパティの前提条件。
- 検証結果：実行したスクリプト、ブラウザ URL またはスクリーンショットの確認（該当する場合）、残存するリスク。

## Core Patterns

### Game Configuration

```ts
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: [BootScene, MenuScene, GameScene, UIScene]
};
```

### Scene Lifecycle

```ts
class GameScene extends Phaser.Scene {
  init(data: unknown) {}      // 前の scene からデータを受け取る
  preload() {}                // create の前に asset を読み込む
  create() {}                 // オブジェクト・physics・input をセットアップする
  update(time: number, delta: number) {
    this.player.x += this.speed * (delta / 1000);
  }
}
```

### Scene Transitions

```ts
this.scene.start('GameScene', { level: 1 }); // 現在の scene を停止して新しい scene を開始
this.scene.launch('UIScene');                // オーバーレイを並列実行
this.scene.pause('GameScene');
this.scene.stop('UIScene');
```

## Architecture Decisions

### Physics System

| システム | 使用するとき |
|--------|----------|
| Arcade | プラットフォーマー・シューター・トップダウンアクション、およびほとんどの AABB 衝突ゲーム |
| Matter | 物理パズル・不規則な形状・センサー・ラグドール的な動き・制約 |
| None | メニュー・ビジュアルノベル・カードゲーム・パズル UI・静的なインタラクティブ画面 |

### Scene Structure

```text
scenes/
  BootScene.ts      # プリロード、ローディング UI、グローバル asset パック
  MenuScene.ts      # タイトル、オプション、セーブ選択
  GameScene.ts      # メインのシミュレーションとワールドオブジェクト
  UIScene.ts        # 並列起動する HUD オーバーレイ
  GameOverScene.ts  # 結果、リスタート、進行状況
```

グローバルな `window` ステートではなく、scene data・registry・サービス・型付きのゲームステートモジュールを優先すること。

## Anti-Patterns

| アンチパターン | 失敗する理由 | より良い方法 |
|--------------|--------------|--------|
| Phaser バージョンを推測する | Phaser 3 と 4 では renderer・filter・camera・tint・一部の texture の動作が異なる | 依存関係または `Phaser.VERSION` を先に確認する |
| spritesheet のサイズを推測する | フレーム計算の1つずれが animation を静かに破壊する | loader config の前にサイズ・spacing・margin を計測する |
| `create()` で asset を読み込む | オブジェクトが未読み込みのテクスチャを参照してしまう | `preload()` または Boot scene で読み込む |
| `update()` でオブジェクトを生成する | GC の一時停止とフレームスパイクを引き起こす | group で事前に生成またはプールする |
| 移動にフレームカウントを使う | FPS によってゲームスピードが変わる | `delta / 1000` または physics velocity を使う |
| 1つの巨大な scene | メニュー・HUD・ゲームプレイ・遷移が密結合になる | ライフサイクルと所有関係で分割する |
| 単純な AABB 衝突に Matter を使う | ゲームプレイ上の価値なく複雑さが増す | 不規則な形状や制約が必要になるまで Arcade を使う |
| 不可視の collision セットアップ | タイル/body の問題が推測に頼ることになる | 実装中にデバッググラフィックスやトグルを追加する |

## Variation Guidance

プロジェクトのコンテキストに応じて選択を変える：
- 小規模なジャムゲーム：scene を少なくし、シンプルな定数を使い、ブラウザで検証する。
- 大規模な TypeScript プロジェクト：型付き asset キー・型付き scene データ・集中的なモジュールを追加する。
- モバイルターゲット：スケールモード・タッチ入力・DPR・audio unlock・低電力時の FPS を確認する。
- ドット絵：`pixelArt` を設定し、明示的なカメラの丸め・nearest-neighbor CSS・安定した整数スケーリングを行う。
- asset が多いゲーム：atlas・マニフェスト・プリロードの進捗表示・プールされたオブジェクトを優先する。
- Phaser 4 プロジェクト：現在の WebGL/filter/rendering のパターンを使用し、v3 の renderer 内部は避ける。

すべてのゲームに同じアーキテクチャを使うことは避けること。コントロール・レベルフォーマット・physics の複雑さ・asset の量・ターゲットプラットフォームによって構成を決めること。

## Verification

関係のないツールを作らず、利用可能な最も強力なチェックを実行する：

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

プレイアブルな変更の場合は、ゲームを開いて以下を確認する：
- Canvas が空白でなく、デスクトップとモバイルの幅で正しくサイズ調整されている。
- メインの scene が起動し、遷移が機能し、コンソールに loader エラーが出ていない。
- 移動が delta または physics velocity を使用しており、可変フレームレートで安定した感触がある。
- Collision body・タイル衝突・オブジェクトの bounds が表示上のアートと一致している。
- Animation が出血・オフセット・行のスキップなしに正しいフレームを使用している。
- Object pool が非アクティブなオブジェクトを再利用し、アクティブな body をリークしていない。
- FPS とメモリが最も負荷の高い想定シーンで安定している。

チェックが実行できない場合は、その正確な理由と残存するリスクを明記すること。
