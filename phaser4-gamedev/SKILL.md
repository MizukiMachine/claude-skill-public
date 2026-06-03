---
name: phaser4-gamedev
description: "Phaser 4を明示的に使うプロジェクト、`package.json` や `Phaser.VERSION` が4.xのプロジェクト、またはPhaser 3から4への移行で使うPhaser 4専用のゲーム開発スキル。Phaser 4 renderer、WebGL-only filter、lighting、shader、texture orientation、DynamicTexture/RenderTexture、SpriteGPULayer、TilemapGPULayer、v4移行の注意点を扱うときに使う。Phaser 3のみ、またはバージョン不明の場合はより広い `phaser-gamedev` を優先する。"
---

# Phaser 4 Game Development

## 目的

このスキルは、コードベースを把握したうえでPhaser 4ブラウザゲームの実装・デバッグ・最適化・移行を行うために使用します。ユーザーが明示的にPhaser 4を指定した場合、コードベースがPhaser 4.xであると確認できる場合、またはPhaser 3から4への移行タスクである場合に起動します。動作するゲームコード、計測済みのアセットメタデータ、明示的なレンダリングまたは移行に関する判断、およびプロジェクトスクリプトかブラウザのスモークテストによる検証結果を出力します。

## 関連スキル

このスキルは `phaser-gamedev` を拡張するものであり、共通のPhaserワークフローを置き換えるものではありません。

Phaser 4のタスクを行う際は、まず `phaser-gamedev/SKILL.md` を十分に読み、共通のPhaserガイダンス（バージョン検出、シーンのオーナーシップ、アセットメタデータ、デルタタイムシミュレーション、オブジェクトライフサイクルのアンチパターン、デバッグの可視化、検証）を適用します。その後、レンダラー・API・移行・WebGLに特化した判断にはこのPhaser 4専用スキルを適用します。

タスクが特に必要とする場合を除き、`phaser-gamedev` の参照ファイルを深く読む必要はありません。

## 動作モデル

Phaser 4の作業はレンダラーを意識したゲームエンジニアリングです。デフォルトターゲットはWebGLです。Canvasは互換性のために存在しますが、フィルター・リアルタイムライティング・GPUレイヤー・モダンなレンダラーパスはWebGL中心です。まずゲームの手触りを保つことを優先し、そのうえで視覚的・パフォーマンス的な制約を満たす最もシンプルなレンダリングパスを選択します。

優先順位:

1. 正しいゲームプレイ、入力の手触り、シーンライフサイクル。
2. 正確なアセットメタデータ: サイズ、フレームサイズ、spacing、margin、atlasフレーム名、テクスチャの向き。
3. フィルター・シェーダー・render target・GPUレイヤーより先にシンプルなレンダリングパスを選ぶ。
4. インストール済みのマイナーバージョンで検証されたPhaser 4 API。
5. 視覚・入力・アニメーション・パフォーマンスに影響する変更に対するブラウザでの実証。

作業前に以下を確認します:

- インストールまたはベンダーされているPhaser 4のマイナーバージョンはどれか？
- これはPhaser 4の新規作業か、バグ修正か、パフォーマンス改善か、それともPhaser 3からの移行か？
- オブジェクト・入力・物理・UI・トランジションを管理するシーンはどれか？
- 信頼できるアセットファイルはどれで、正確な寸法は何か？
- その機能には標準のゲームオブジェクト、フィルター、ライティング、シェーダー、`DynamicTexture`、`RenderTexture`、`SpriteGPULayer`、`TilemapGPULayer` のどれが必要か？
- ブラウザ・モバイル・DPR・ピクセルアート・FPSの制約は何か？

## バージョンとレンダラーの規約

- バージョン固有のAPIを使う前に、インストール済みのPhaserバージョンを確認します。Phaser 4は変化が速いため、APIの詳細に関して記憶に頼ってはいけません。
- 汎用的なスニペットよりも、プロジェクトにインストールされたバージョンとローカルの型定義を優先します。
- レンダラー・フィルター・シェーダー・テクスチャ・移行の詳細を確認する際は、その正確なバージョンの公式Phaserドキュメントを使用します。
- プロジェクトに具体的なCanvas互換性要件がない限り、新規のPhaser 4作業は `Phaser.WEBGL` で始めます。
- 集中した調査なしに、Phaser 3のレンダラー内部・カスタムパイプライン・マスク・FX・テクスチャの前提条件を移植してはいけません。
- `DynamicTexture` と `RenderTexture` への描画は、明示的な `render()` 実行が必要なバッファ処理として扱います。
- フィルターとライティングはアーキテクチャ上の選択として扱います。これらはレンダーパスを変更し、バッチを破壊する可能性があり、WebGL専用の機能です。

参考になる公式情報:

- `https://docs.phaser.io/api-documentation`
- `https://phaser.io/tutorials/phaser-4-rendering-concepts`
- `https://github.com/phaserjs/phaser/blob/v4.0.0/changelog/v4/4.0/CHANGELOG-v4.0.0.md`

## 参照ファイル

| トピック | ファイル | 使用する場面 |
|-------|------|----------|
| Phaser 3から4への移行 | [migration-hotspots.md](references/migration-hotspots.md) | Phaser 3コードの移植、削除されたAPI、レンダラー内部、マスク、FX、数学定数、カスタムパイプライン |
| スプライトシート・アトラス・テクスチャ | [spritesheets-and-textures.md](references/spritesheets-and-textures.md) | スプライトシート・アトラス・圧縮テクスチャ・TileSprite・シェーダー・テクスチャの向きに依存するアセットの読み込み |
| レンダリングとパフォーマンス | [rendering-and-performance.md](references/rendering-and-performance.md) | GPUレイヤー・フィルター・ライティング・render target・バッチング戦略・プロファイリング・パフォーマンス修正の選択 |

## 実装前の準備

編集前にプロジェクトを調査します:

```bash
rg --files | rg '(^|/)(package.json|vite.config|webpack.config|src|public|assets|static|maps|tilemaps|textures|sprites)'
rg -n "\"phaser\"|from ['\"]phaser['\"]|Phaser\\.VERSION|new Phaser\\.Game|extends Phaser\\.Scene|scene:|this\\.scene\\.|this\\.load\\.|this\\.physics|this\\.anims" .
```

移行またはレンダラーに関連する作業では、さらに検索します:

```bash
rg -n "setTintFill|tintFill|BitmapMask|GeometryMask|preFX|postFX|ColorMatrix|Phaser\\.Geom\\.Point|Math\\.TAU|Math\\.PI2|setPipeline\\(['\"]Light2D['\"]\\)|DynamicTexture|RenderTexture|TileSprite|Shader|Pipeline|WebGLRenderer|gl\\." .
```

以下を抽出します:

- エントリーポイント、バンドラー、`Phaser.GameConfig`、スケールモード、レンダラータイプ。
- シーンリスト、シーンキー、boot/preloadフロー、UIオーバーレイ戦略、再起動フロー。
- アセットの場所、loaderキー、フレーム設定、atlas JSON、タイルセット、Tiledマップ名。
- 物理システム、衝突設定、入力モデル、カメラ動作、デバッグトグル。
- typecheck・lint・テスト・ビルド・dev previewの既存スクリプト。

ルール・操作方法・アートディレクション・ターゲットプラットフォーム・移行スコープが不明で実装に大きく影響する場合のみ質問します。

## ワークフロー

1. インストール済みバージョン、アーキテクチャ、シーン、アセット、検証スクリプトを調査する。
2. 作業をfeature・バグ修正・最適化・アセット統合・移行として分類する。
3. コードを書く前に、シーンのオーナーシップ・状態フロー・物理システム・レンダリングパスを選択または保持する。
4. アニメーション・タイルマップ・UIスライス・GPUレイヤーデータを作成する前に、アセットを計測してloader設定を確定する。
5. フィルター・シェーダー・render target・GPUレイヤーが要件上必要でない限り、まず標準のゲームオブジェクトで実装する。
6. 脆弱なシステムにデバッグの可視化を追加する: 衝突ボディ・タイル衝突・アニメーションフレームプローブ・バウンズオーバーレイ・FPS・バッチングチェック。
7. スクリプトとブラウザの動作で検証する。プレイアブルな変更の場合は、devサーバーを起動してcanvas・コンソール・トランジション・入力・アニメーション・パフォーマンスを確認する。

## レンダリングパスの選択

| パス | 使用する場面 | 避ける場面 |
|------|----------|------------|
| 標準ゲームオブジェクト | ほとんどのゲームプレイ、UI、通常のスプライト、テキスト、インタラクティブなエンティティ | シーンが大量のシンプルで似たようなquadで占められている場合 |
| `SpriteGPULayer` | 星空・密な背景モーション・パーティクル的な装飾など、予測可能なアニメーションを持つ大量のシンプルなquad | メンバーがリッチなゲームプレイロジック・頻繁な構造変更・複数のテクスチャソース・常時のper-member変更を必要とする場合 |
| `TilemapGPULayer` | 非常に大きな正投影タイルレイヤー、1つのタイルセット、高い可視タイル数、スムーズにフィルタリングされたタイル境界 | アイソメトリック/スタガードマップ、再生成なしの頻繁なタイル編集、複数タイルセット、小さな通常マップ |
| `DynamicTexture` / `RenderTexture` | ランタイムのコンポジット・キャプチャ・スタンプ・生成テクスチャ・マルチパス設定・再利用可能なレンダリング出力 | 単純なスプライト・atlasフレーム・tint・シンプルなアニメーションで解決できる場合 |
| フィルター / ライティング | エフェクトがimage-space・光認識・マスク的、または追加レンダーパスに見合う視覚効果の場合 | アート・tint・アニメーションフレーム・より低コストなオブジェクトレベルエフェクトで同じ見た目を実現できる場合 |
| カスタムシェーダー / 生のWebGL | Phaserオブジェクト・フィルター・サポートされたレンダラー統合では表現できないエフェクト | レンダラーの状態を予測不能に変更したり、Phaser 3のパイプライン内部に依存するコードになる場合 |

## 物理システムの選択

| システム | 使用する場面 |
|--------|----------|
| Arcade | プラットフォーマー、シューター、トップダウンアクション、タイル衝突、AABBボディ、ほとんどの2Dアクションゲーム |
| Matter | 不規則な形状、複合ボディ、センサー、制約、物理パズル、よりリアルな衝突 |
| なし | メニュー、ビジュアルノベル、パズルボード、カードゲーム、静的UI、純粋に視覚的なシーン |

## コアパターン

新規のPhaser 4作業では明示的にWebGLを優先します:

```ts
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 800,
  height: 600,
  roundPixels: false,
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

シーンのライフサイクルを明示的に保ちます:

```ts
class GameScene extends Phaser.Scene {
  init(data: unknown) {}
  preload() {}
  create() {}
  update(time: number, delta: number) {
    this.player.x += this.speed * (delta / 1000);
  }
}
```

シーンのトランジションは意図的に使います:

```ts
this.scene.start('GameScene', { level: 1 });
this.scene.launch('UIScene');
this.scene.pause('GameScene');
this.scene.stop('UIScene');
```

render targetへの処理は明示的にフラッシュします:

```ts
const rt = this.add.renderTexture(0, 0, 256, 256);

rt.draw(sprite, 0, 0);
rt.render();
```

オブジェクトフィルターは有効化してから適用し、フィルターはWebGL専用のため利用可能かを確認します。また、カメラ全体へのエフェクトが必要でない限りinternalフィルターを優先します:

```ts
sprite.enableFilters();

if (sprite.filters) {
  sprite.filters.internal.addGlow(0xffffff, 2, 0);
}
```

## 移行時に確認すべき置き換え

| Phaser 3のパターン | Phaser 4での対応 |
|------------------|--------------------|
| `sprite.setTintFill(color)` | `sprite.setTint(color).setTintMode(Phaser.TintModes.FILL)` |
| `Math.PI2` | `Math.TAU` |
| 旧コードでPI / 2として使われていた `Math.TAU` | `Math.PI_OVER_2` |
| `sprite.setPipeline('Light2D')` | `sprite.setLighting(true)` |
| `preFX` / `postFX` | Phaser 4のフィルター |
| `BitmapMask` スタイルのマスキング | Phaser 4の `Mask` フィルターまたは現行のfilter API |
| `Phaser.Geom.Point` ヘルパー | `Phaser.Math.Vector2` または新しい数学ヘルパー |
| カスタムパイプライン | レンダラーの `RenderNode` またはサポートされているPhaser 4のシェーダー/filter API |

これらを機械的に適用する前に [migration-hotspots.md](references/migration-hotspots.md) を読んでください。

## できることと成果物

このスキルで行えること:

- Phaser 4のシーン・bootフロー・ゲーム設定・入力・カメラ・UIオーバーレイ・トランジションの追加またはリファクタリング。
- スプライトシート・アトラス・圧縮テクスチャ・オーディオ・タイルマップ・生成アセットの読み込みと検証。
- ArcadeまたはMatterの物理・衝突・オーバーラップ・グループ・プーリング・デバッグオーバーレイの実装。
- カメラバウンズ・衝突レイヤー・オブジェクトレイヤー・パララックスを持つTiled JSONからのタイルマップ駆動レベルの構築。
- 通常のゲームオブジェクト・GPUレイヤー・render texture・フィルター・ライティング・シェーダーの選択。
- 動作と視覚出力を保ちながらPhaser 3プロジェクトをPhaser 4へ移行。
- オブジェクトチャーン・バッチ破壊・fill-rate問題・メモリリーク・updateループコストのプロファイリングと削減。

成果物:

- 既存のフレームワーク・TypeScriptスタイル・アセットパス・シーンキー・命名規則に合ったコード編集。
- 実装で使用するアセット定数またはマッププロパティの前提条件の計測結果。
- レンダリングパス・物理・移行の選択に関する簡潔な説明。
- 検証結果: 実行したスクリプト、ブラウザURLまたはスモーク結果、残存するリスク。

## アンチパターン

| アンチパターン | 失敗する理由 | より良い方法 |
|--------------|--------------|--------|
| Phaser 4をPhaser 3のドロップイン置き換えとして扱う | レンダラー・フィルター・マスク・シェーダー・テクスチャの向き・数学定数が変更された | ホットスポットを先に調査し、意図的に移植する |
| スプライトシートやatlasのメタデータを推測する | off-by-oneのフレーム計算がloader設定から遠いところでアニメーション破綻を引き起こす | 読み込み前にサイズ・spacing・margin・フレーム名を計測する |
| シェーダー・フィルター・GPUレイヤーから始める | 早期にレンダーパスコストとデバッグの複雑さを増やす | 要件が高度なレンダリングを正当化するまで標準オブジェクトを使用する |
| ゲームプレイエンティティを `SpriteGPULayer` に移す | GPUレイヤーの速度は制約されたメンバーから生まれ、リッチなオブジェクト動作からではない | インタラクティブなエンティティは通常オブジェクトまたは物理スプライトとして保つ |
| 再生成なしに `TilemapGPULayer` のデータを編集する | GPU側のタイルデータが古くなる | 編集後にレイヤーのタイルデータテクスチャを再生成する |
| dynamic render targetで `render()` を忘れる | キューに積まれた描画コマンドが表示されない | テクスチャを更新する必要があるタイミングで `render()` を呼ぶ |
| ライティングやフィルターをあらゆる場所に適用する | シェーダーとrender targetの変更がバッチを破壊し、fill-rateを増加させる | 視覚的に重要なオブジェクトやカメラにのみエフェクトを適用する |
| フレームメタデータより前にアニメーションタイミングをデバッグする | 誤ったフレーム設定がフレームのスキップやタイミングのずれのように見える | まずフレームグリッドを確認する |
| 生の `gl` 呼び出しでレンダラー状態を変更する | Phaserのレンダラーが同期を失う可能性がある | Phaser 4 API・`Extern`・フィルター・render nodeを意図的に使用する |

## 状況別のガイダンス

状況によって判断を変えます:

- 移行: 先にリスクのあるAPIを洗い出し、動作を保ちながら、レンダラーパスは選択的に近代化する。
- 小規模な新規ゲーム: シーンを少なく保ち、標準オブジェクトを使い、ブラウザで素早く検証する。
- 大規模なTypeScriptプロジェクト: 型付きのシーンデータ・型付きアセットキー・サービスモジュール・局所的なテストを追加する。
- モバイルターゲット: DPR・タッチ入力・オーディオアンロック・スケールモード・メモリ・制限されたデバイスでの最悪ケースのFPSを検証する。
- ピクセルアート: フレームを計測し、適切な場所でnearest filteringを使い、カメラの動きをテストし、丸め処理を意図的に適用する。
- アセット量の多いゲーム: atlasまたはpackを優先し、preloadの進捗、プールされたオブジェクト、安定したアセットキー命名を行う。
- パフォーマンス重視のシーン: アーキテクチャを書き直す前に、オブジェクト数・updateチャーン・バッチ破壊・fill-rate・GPUレイヤーの適合性をプロファイリングする。

すべてのPhaser 4プロジェクトに固定のゲームアーキテクチャを使い回してはいけません。操作方法・レベルフォーマット・アセット量・ターゲットデバイス・レンダラーの制約によってゲームの形を決めます。

## 検証

関係のないツールを新たに作らず、プロジェクトで利用可能な最も強力なチェックを実行します:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

プレイアブルまたは視覚的な変更の場合は、ゲームを開いて以下を確認します:

- canvasが空白でなく、正しいサイズで、consoleにloaderエラーがないこと。
- boot・preload・シーントランジション・再起動・UIオーバーレイが機能すること。
- 対象デバイスまたはビューポートサイズで入力が機能すること。
- 移動に `delta` または物理velocityを使用しており、可変フレームレートで安定していること。
- 衝突ボディ・タイル衝突・オブジェクトのバウンズ・カメラのバウンズが表示されているアートと一致すること。
- アニメーションがブリーディング・ずれた行・スキップされたフレーム・向きのエラーなく意図したフレームを使用していること。
- フィルター・ライティング・render texture・GPUレイヤーが意図通りにレンダリングされ、対象ハードウェアでFPSを破壊しないこと。
- オブジェクトプールが非アクティブなオブジェクトを再利用し、アクティブなボディ・タイマー・tween・イベントリスナーをリークしないこと。

チェックを実行できない場合は、その理由と残存するリスクを正確に説明します。
